/**
 * Arc Agent Trust — On-Chain Direct Reader
 *
 * ArcScan API'sına bağımlı olmadan doğrudan RPC üzerinden
 * ERC-8004 registry'lerinden veri okur.
 *
 * Identity Registry:  ownerOf, tokenURI, getAgentWallet, getMetadata
 * Reputation Registry: getFeedbackCount, getAverageScore, getFeedback events
 * Validation Registry: getValidationCount, getValidation events
 */

'use strict';

const { keccak256, toBytes } = require('viem');
const config = require('../config');

const RPC_URL     = config.blockchain.rpcUrl;
const ID_REG      = config.blockchain.contracts.identityRegistry;
const REP_REG     = config.blockchain.contracts.reputationRegistry;
const VAL_REG     = config.blockchain.contracts.validatorRegistry;

/* ── Keccak256 selector ── */
function sel(sig) {
  return keccak256(toBytes(sig)).slice(0, 10);
}

/* ── Bilinen selector'lar ── */
const SELECTORS = {
  // Identity
  ownerOf:             '0x6352211e',
  tokenURI:            '0xc87b56dd',
  getAgentWallet:      sel('getAgentWallet(uint256)'),
  // Reputation (ERC-8004)
  getIdentityRegistry: sel('getIdentityRegistry()'),
  getFeedbackCount:    sel('getFeedbackCount(uint256)'),
  getAverageScore:     sel('getAverageScore(uint256)'),
  // Validation (ERC-8004)
  getValidationCount:  sel('getValidationCount(uint256)'),
};

/* ── RPC helpers ── */
let _reqId = 1;

async function rpcCall(method, params) {
  const res = await fetch(RPC_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ jsonrpc: '2.0', id: _reqId++, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC ${method}: ${json.error.message}`);
  return json.result;
}

async function ethCall(to, data) {
  try {
    return await rpcCall('eth_call', [{ to, data }, 'latest']);
  } catch {
    return null;
  }
}

async function ethBlockNumber() {
  return parseInt(await rpcCall('eth_blockNumber', []), 16);
}

/* ── ABI decoders ── */
function decodeAddress(hex) {
  if (!hex || hex === '0x') return null;
  return '0x' + hex.slice(-40).toLowerCase();
}

function decodeUint256(hex) {
  if (!hex || hex === '0x') return 0;
  return parseInt(hex, 16);
}

function decodeString(hex) {
  if (!hex || hex === '0x') return null;
  try {
    const raw    = hex.slice(2);
    const offset = parseInt(raw.slice(0, 64), 16) * 2;
    const length = parseInt(raw.slice(offset, offset + 64), 16) * 2;
    return Buffer.from(raw.slice(offset + 64, offset + 64 + length), 'hex').toString('utf8');
  } catch {
    return null;
  }
}

function pad(n) {
  return BigInt(n).toString(16).padStart(64, '0');
}

/* ══════════════════════════════════════════════════════════
   IDENTITY REGISTRY
══════════════════════════════════════════════════════════ */

async function readIdentityOnChain(agentId) {
  const tokenId = pad(agentId);
  const [ownerRaw, uriRaw, walletRaw] = await Promise.all([
    ethCall(ID_REG, SELECTORS.ownerOf + tokenId),
    ethCall(ID_REG, SELECTORS.tokenURI + tokenId),
    ethCall(ID_REG, SELECTORS.getAgentWallet + tokenId),
  ]);

  return {
    owner:      decodeAddress(ownerRaw),
    agentURI:   decodeString(uriRaw),
    agentWallet: decodeAddress(walletRaw),
  };
}

/* ══════════════════════════════════════════════════════════
   REPUTATION REGISTRY
══════════════════════════════════════════════════════════ */

async function readReputationOnChain(agentId) {
  const tokenId = pad(agentId);

  const [countRaw, scoreRaw] = await Promise.all([
    ethCall(REP_REG, SELECTORS.getFeedbackCount + tokenId),
    ethCall(REP_REG, SELECTORS.getAverageScore  + tokenId),
  ]);

  const feedbackCount = decodeUint256(countRaw);

  // getAverageScore int128 döner — işaretli tam sayı (fixed-point)
  let averageScore = null;
  if (scoreRaw && scoreRaw !== '0x') {
    const raw = BigInt(scoreRaw);
    // int128 sign check
    const INT128_MAX = BigInt('0x7fffffffffffffffffffffffffffffff');
    const val = raw > INT128_MAX ? raw - BigInt('0x100000000000000000000000000000000') : raw;
    averageScore = Number(val);
  }

  return {
    feedbackCount,
    averageScore,
    hasReputation: feedbackCount > 0,
  };
}

/* ══════════════════════════════════════════════════════════
   VALIDATION REGISTRY
══════════════════════════════════════════════════════════ */

async function readValidationOnChain(agentId) {
  const tokenId = pad(agentId);

  const countRaw = await ethCall(VAL_REG, SELECTORS.getValidationCount + tokenId);
  const validationCount = decodeUint256(countRaw);

  return {
    validationCount,
    hasValidations: validationCount > 0,
  };
}

/* ══════════════════════════════════════════════════════════
   EVENT LOG TARAMA (son N blok)
══════════════════════════════════════════════════════════ */

// Bilinen ERC-8004 event topic'leri (keccak256 hesaplanmış)
const EVENT_TOPICS = {
  // Identity
  Registered:  keccak256(toBytes('Registered(uint256,string,address)')),
  URIUpdated:  keccak256(toBytes('URIUpdated(uint256,string,address)')),
  MetadataSet: keccak256(toBytes('MetadataSet(uint256,string,string,bytes)')),
  // Reputation
  FeedbackGiven: keccak256(toBytes('FeedbackGiven(uint256,address,int128,uint8,string,string,string,string,bytes32)')),
  // Validation
  ValidationRequested:  keccak256(toBytes('ValidationRequested(uint256,uint256,address,string)')),
  ValidationCompleted:  keccak256(toBytes('ValidationCompleted(uint256,uint256,address,int8)')),
};

const LOG_RANGE = 2000; // RPC'nin izin verdiği max

async function scanAgentEvents(agentId) {
  const events = { registered: null, uriUpdated: [], feedbacks: [], validations: [] };

  try {
    const latest   = await ethBlockNumber();
    const fromBlock = '0x' + Math.max(0, latest - LOG_RANGE).toString(16);
    const agentIdTopic = '0x' + pad(agentId);

    // Identity events
    const idLogs = await rpcCall('eth_getLogs', [{
      address:   ID_REG,
      fromBlock,
      toBlock:   'latest',
      topics:    [null, agentIdTopic],
    }]).catch(() => []);

    for (const log of (idLogs || [])) {
      if (log.topics[0] === EVENT_TOPICS.Registered) {
        events.registered = { blockNumber: parseInt(log.blockNumber, 16), txHash: log.transactionHash };
      } else if (log.topics[0] === EVENT_TOPICS.URIUpdated) {
        events.uriUpdated.push({ blockNumber: parseInt(log.blockNumber, 16) });
      }
    }

    // Reputation events
    const repLogs = await rpcCall('eth_getLogs', [{
      address:   REP_REG,
      fromBlock,
      toBlock:   'latest',
      topics:    [EVENT_TOPICS.FeedbackGiven, agentIdTopic],
    }]).catch(() => []);

    for (const log of (repLogs || [])) {
      events.feedbacks.push({
        blockNumber: parseInt(log.blockNumber, 16),
        txHash:      log.transactionHash,
        from:        decodeAddress('0x' + log.topics[2]?.slice(-40)),
      });
    }

    // Validation events
    const valLogs = await rpcCall('eth_getLogs', [{
      address:   VAL_REG,
      fromBlock,
      toBlock:   'latest',
    }]).catch(() => []);

    for (const log of (valLogs || [])) {
      if (log.topics[0] === EVENT_TOPICS.ValidationCompleted) {
        events.validations.push({
          blockNumber: parseInt(log.blockNumber, 16),
          txHash:      log.transactionHash,
        });
      }
    }

    events.scannedRange = { from: latest - LOG_RANGE, to: latest };
  } catch (err) {
    events.error = err.message;
  }

  return events;
}

/* ══════════════════════════════════════════════════════════
   TAM ON-CHAIN OKUMA (tüm registry'leri paralel)
══════════════════════════════════════════════════════════ */

async function readAllOnChain(agentId) {
  const [identity, reputation, validation, events] = await Promise.allSettled([
    readIdentityOnChain(agentId),
    readReputationOnChain(agentId),
    readValidationOnChain(agentId),
    scanAgentEvents(agentId),
  ]);

  return {
    identity:   identity.status   === 'fulfilled' ? identity.value   : { error: identity.reason?.message },
    reputation: reputation.status === 'fulfilled' ? reputation.value : { error: reputation.reason?.message },
    validation: validation.status === 'fulfilled' ? validation.value : { error: validation.reason?.message },
    events:     events.status     === 'fulfilled' ? events.value     : { error: events.reason?.message },
  };
}

module.exports = {
  readIdentityOnChain,
  readReputationOnChain,
  readValidationOnChain,
  scanAgentEvents,
  readAllOnChain,
  ethBlockNumber,
  SELECTORS,
  EVENT_TOPICS,
};
