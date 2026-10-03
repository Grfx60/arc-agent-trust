const fs = require('fs');
const path = require('path');
const { createPublicClient, http, parseAbiItem } = require('viem');
const config = require('./config');

const identityRegistry = config.blockchain.contracts.identityRegistry;
const transferEvent = parseAbiItem(
  'event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)'
);
const zeroAddress = '0x0000000000000000000000000000000000000000';
const preferredChunkSize = 10000n;
const fallbackChunkSize = 2000n;
let activeScan;

const client = createPublicClient({
  chain: {
    id: Number.parseInt(process.env.ARC_CHAIN_ID || '5042002', 10),
    name: config.blockchain.network,
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
    rpcUrls: { default: { http: [config.blockchain.rpcUrl] } }
  },
  transport: http(config.blockchain.rpcUrl, {
    timeout: Number.parseInt(process.env.UPSTREAM_TIMEOUT_MS || '8000', 10),
    retryCount: 1
  })
});

function statePath(cacheDir) {
  return path.join(cacheDir, 'network-agent-catalog.json');
}

function loadState(cacheDir) {
  try {
    const state = JSON.parse(fs.readFileSync(statePath(cacheDir), 'utf8'));
    return {
      nextBlock: BigInt(state.nextBlock),
      latestBlock: BigInt(state.latestBlock || 0),
      complete: Boolean(state.complete),
      error: state.error || null,
      agents: state.agents || {}
    };
  } catch {
    return {
      nextBlock: BigInt(process.env.AGENT_CATALOG_FROM_BLOCK || '59000000'),
      latestBlock: 0n,
      complete: false,
      error: null,
      agents: {}
    };
  }
}

function saveState(cacheDir, state) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const filename = statePath(cacheDir);
  const temporary = `${filename}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify({
    ...state,
    nextBlock: state.nextBlock.toString(),
    latestBlock: state.latestBlock.toString()
  }, null, 2));
  fs.renameSync(temporary, filename);
}

async function scanNextChunk(cacheDir) {
  if (activeScan) return activeScan;
  activeScan = scanNextChunkUnlocked(cacheDir);
  try { return await activeScan; } finally { activeScan = null; }
}

async function scanNextChunkUnlocked(cacheDir) {
  const state = loadState(cacheDir);
  const latestBlock = await client.getBlockNumber();
  const fromBlock = state.nextBlock;

  if (fromBlock > latestBlock) {
    state.latestBlock = latestBlock;
    state.complete = true;
    state.error = null;
    saveState(cacheDir, state);
    return state;
  }

  const preferredToBlock = fromBlock + preferredChunkSize - 1n > latestBlock
    ? latestBlock
    : fromBlock + preferredChunkSize - 1n;

  try {
    let toBlock = preferredToBlock;
    let logs;

    try {
      logs = await client.getLogs({
        address: identityRegistry,
        event: transferEvent,
        fromBlock,
        toBlock
      });
    } catch (preferredError) {
      toBlock = fromBlock + fallbackChunkSize - 1n > latestBlock
        ? latestBlock
        : fromBlock + fallbackChunkSize - 1n;
      logs = await client.getLogs({
        address: identityRegistry,
        event: transferEvent,
        fromBlock,
        toBlock
      });
      state.error = `Preferred chunk failed; used fallback chunk: ${preferredError.message}`;
    }

    for (const log of logs) {
      const tokenId = log.args.tokenId?.toString();
      const from = String(log.args.from || '').toLowerCase();
      const to = String(log.args.to || '').toLowerCase();
      if (!tokenId) continue;
      if (to === zeroAddress) {
        delete state.agents[tokenId];
      } else {
        state.agents[tokenId] = {
          agentId: tokenId,
          owner: log.args.to,
          lastTransferBlock: log.blockNumber?.toString() || null,
          transactionHash: log.transactionHash || null,
          active: true
        };
      }
      if (from === zeroAddress && to !== zeroAddress) {
        state.agents[tokenId].registeredBlock = log.blockNumber?.toString() || null;
      }
    }

    state.nextBlock = toBlock + 1n;
    state.latestBlock = latestBlock;
    state.complete = state.nextBlock > latestBlock;
    state.error = null;
  } catch (error) {
    state.latestBlock = latestBlock;
    state.error = 'RPC scan failed';
  }

  saveState(cacheDir, state);
  return state;
}

function listCatalog(state, page = 1, limit = 50) {
  const safePage = Math.min(1000000, Math.max(1, Number.parseInt(page, 10) || 1));
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 50));
  const all = Object.values(state.agents)
    .sort((left, right) => {
      const a = BigInt(left.agentId); const b = BigInt(right.agentId);
      return a < b ? -1 : a > b ? 1 : 0;
    });
  const start = (safePage - 1) * safeLimit;
  return {
    agents: all.slice(start, start + safeLimit),
    page: safePage,
    limit: safeLimit,
    total: all.length,
    complete: state.complete,
    nextBlock: state.nextBlock.toString(),
    latestBlock: state.latestBlock.toString(),
    error: state.error
  };
}

module.exports = { listCatalog, loadState, scanNextChunk };
