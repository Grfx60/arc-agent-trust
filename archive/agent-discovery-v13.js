const fs = require("fs");
const {
  createPublicClient,
  http,
  parseAbiItem,
} = require("viem");


// ============================================
// CONFIG
// ============================================

const RPC_URL =
  "https://rpc.testnet.arc.network";

const IDENTITY_REGISTRY =
  "0x8004B663056A597Dffe9eCcC1965A193B7388713";

const CHUNK_SIZE = 5000;

const SCAN_BLOCKS = 100000;

const OUTPUT_FILE =
  "agent-discovery-v13.json";


// ============================================
// CLIENT
// ============================================

const client =
  createPublicClient({
    transport: http(RPC_URL),
  });


// ============================================
// MAIN
// ============================================

async function main() {

  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "        AGENT DISCOVERY ENGINE v13"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "Network: Arc Testnet"
  );

  console.log(
    "Registry:",
    IDENTITY_REGISTRY
  );

  console.log("");


  // ========================================
  // CURRENT BLOCK
  // ========================================

  const currentBlock =
    await client.getBlockNumber();

  console.log(
    "📦 Current block:",
    currentBlock.toString()
  );

  console.log("");


  // ========================================
  // SCAN RANGE
  // ========================================

  let scanStart =
    currentBlock -
    BigInt(SCAN_BLOCKS);

  if (
    scanStart < 0n
  ) {

    scanStart = 0n;

  }

  const scanEnd =
    currentBlock;


  console.log(
    "🔎 Scan start:",
    scanStart.toString()
  );

  console.log(
    "🔎 Scan end:",
    scanEnd.toString()
  );

  console.log(
    "📦 Chunk size:",
    CHUNK_SIZE
  );

  console.log("");


  // ========================================
  // EVENT
  // ========================================

  const transferEvent =
    parseAbiItem(
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
    );


  // ========================================
  // STORAGE
  // ========================================

  const discoveredAgents =
    new Map();

  let successfulChunks = 0;

  let failedChunks = 0;

  let totalEvents = 0;


  // ========================================
  // CHUNK SCANNING
  // ========================================

  let fromBlock =
    scanStart;


  while (
    fromBlock <= scanEnd
  ) {

    let toBlock =
      fromBlock +
      BigInt(CHUNK_SIZE) -
      1n;


    if (
      toBlock > scanEnd
    ) {

      toBlock =
        scanEnd;

    }


    console.log(
      `🔍 ${fromBlock.toString()} → ${toBlock.toString()}`
    );


    try {

      const logs =
        await client.getLogs({

          address:
            IDENTITY_REGISTRY,

          event:
            transferEvent,

          fromBlock,

          toBlock

        });


      successfulChunks++;

      totalEvents +=
        logs.length;


      console.log(
        `   ✅ ${logs.length} Transfer event`
      );


      // ====================================
      // PROCESS EVENTS
      // ====================================

      for (
        const log
        of logs
      ) {

        const tokenId =
          log.args.tokenId;


        if (
          tokenId === undefined
        ) {

          continue;

        }


        const agentId =
          tokenId.toString();


        const from =
          log.args.from
            ? log.args.from.toLowerCase()
            : null;


        const to =
          log.args.to
            ? log.args.to.toLowerCase()
            : null;


        const zeroAddress =
          "0x0000000000000000000000000000000000000000";


        // Identity mint
        if (
          from ===
          zeroAddress
        ) {

          discoveredAgents.set(
            agentId,
            {

              agentId,

              owner:
                to,

              blockNumber:
                log.blockNumber
                  ? log.blockNumber.toString()
                  : null,

              transactionHash:
                log.transactionHash ||
                null

            }
          );

        }

      }


    } catch (
      error
    ) {

      failedChunks++;

      console.log(
        "   ❌ Chunk okunamadı."
      );

      console.log(
        "   Hata:",
        error.shortMessage ||
        error.message
      );

    }


    fromBlock =
      toBlock + 1n;

  }


  // ========================================
  // RESULT
  // ========================================

  const agents =
    Array.from(
      discoveredAgents.values()
    );


  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "          DISCOVERY RESULT"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "Scan status:",
    failedChunks === 0
      ? "COMPLETE"
      : "PARTIAL"
  );

  console.log(
    "Requested blocks:",
    (
      scanEnd -
      scanStart +
      1n
    ).toString()
  );

  console.log(
    "Successful chunks:",
    successfulChunks
  );

  console.log(
    "Failed chunks:",
    failedChunks
  );

  console.log(
    "Transfer events:",
    totalEvents
  );

  console.log(
    "Discovered agents:",
    agents.length
  );

  console.log("");


  // ========================================
  // AGENT LIST
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "          DISCOVERED AGENTS"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  if (
    agents.length === 0
  ) {

    console.log(
      "⚠️ Agent bulunamadı."
    );

  } else {

    for (
      const agent
      of agents
    ) {

      console.log(
        `Agent ${agent.agentId}`
      );

      console.log(
        `  Owner: ${agent.owner}`
      );

      console.log(
        `  Block: ${agent.blockNumber}`
      );

      console.log(
        `  Tx: ${agent.transactionHash}`
      );

      console.log("");

    }

  }


  // ========================================
  // OUTPUT
  // ========================================

  const output = {

    schemaVersion:
      "1.3",

    network:
      "Arc Testnet",

    registry:
      IDENTITY_REGISTRY,

    generatedAt:
      new Date().toISOString(),

    scan: {

      startBlock:
        scanStart.toString(),

      endBlock:
        scanEnd.toString(),

      requestedBlocks:
        (
          scanEnd -
          scanStart +
          1n
        ).toString(),

      chunkSize:
        CHUNK_SIZE,

      successfulChunks,

      failedChunks,

      totalEvents

    },

    agents

  };


  fs.writeFileSync(

    OUTPUT_FILE,

    JSON.stringify(
      output,
      null,
      2
    ),

    "utf8"

  );


  // ========================================
  // FINAL
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "      AGENT DISCOVERY TAMAMLANDI"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "📁 Discovery dosyası:"
  );

  console.log(
    OUTPUT_FILE
  );

  console.log("");

  console.log(
    "=========================================="
  );

}


// ============================================
// START
// ============================================

main()
  .catch(
    error => {

      console.error("");

      console.error(
        "❌ Discovery Engine çalışırken hata oluştu:"
      );

      console.error(
        error.shortMessage ||
        error.message
      );

      console.error("");

      process.exit(1);

    }
  );