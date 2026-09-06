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

const INITIAL_CHUNK_SIZE = 5000;

const MIN_CHUNK_SIZE = 100;

const SCAN_BLOCKS = 100000;

const OUTPUT_FILE =
  "agent-discovery-v13-1.json";


// ============================================
// CLIENT
// ============================================

const client =
  createPublicClient({
    transport: http(RPC_URL),
  });


// ============================================
// EVENT
// ============================================

const transferEvent =
  parseAbiItem(
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
  );


// ============================================
// HELPERS
// ============================================

function isZeroAddress(address) {

  return (
    address &&
    address.toLowerCase() ===
      "0x0000000000000000000000000000000000000000"
  );

}


function sleep(ms) {

  return new Promise(
    resolve =>
      setTimeout(resolve, ms)
  );

}


// ============================================
// MAIN
// ============================================

async function main() {

  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "      ADAPTIVE AGENT DISCOVERY v13.1"
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
    "📦 Initial chunk:",
    INITIAL_CHUNK_SIZE
  );

  console.log(
    "📦 Minimum chunk:",
    MIN_CHUNK_SIZE
  );

  console.log("");


  // ========================================
  // STORAGE
  // ========================================

  const discoveredAgents =
    new Map();

  const failedRanges =
    [];


  let successfulChunks = 0;

  let failedChunks = 0;

  let totalEvents = 0;

  let currentChunkSize =
    INITIAL_CHUNK_SIZE;


  // ========================================
  // SCANNER
  // ========================================

  let fromBlock =
    scanStart;


  while (
    fromBlock <= scanEnd
  ) {

    let toBlock =
      fromBlock +
      BigInt(currentChunkSize) -
      1n;


    if (
      toBlock > scanEnd
    ) {

      toBlock =
        scanEnd;

    }


    console.log("");

    console.log(
      `🔍 ${fromBlock.toString()} → ${toBlock.toString()}`
    );

    console.log(
      `   Chunk: ${currentChunkSize}`
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
        `   ✅ Başarılı | ${logs.length} event`
      );


      // Başarılı sorgudan sonra
      // chunk'ı kademeli olarak büyütmüyoruz.
      //
      // Bunun sebebi RPC'nin davranışının
      // stabil olmaması.
      //
      // Güvenli tarafta kalıyoruz.


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


        // ==================================
        // IDENTITY MINT
        // ==================================

        if (
          isZeroAddress(from)
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


      // Sonraki aralığa geç
      fromBlock =
        toBlock + 1n;


    } catch (
      error
    ) {

      console.log(
        "   ⚠️ RPC hata verdi."
      );

      console.log(
        "   Hata:",
        error.shortMessage ||
        error.message
      );


      // ==================================
      // ADAPTIVE SHRINK
      // ==================================

      if (
        currentChunkSize >
        MIN_CHUNK_SIZE
      ) {

        const newChunkSize =
          Math.max(
            MIN_CHUNK_SIZE,
            Math.floor(
              currentChunkSize / 2
            )
          );


        console.log(
          `   🔧 Chunk küçültülüyor: ${currentChunkSize} → ${newChunkSize}`
        );

        console.log(
          "   Aynı aralık tekrar denenecek."
        );


        currentChunkSize =
          newChunkSize;


        await sleep(500);

        continue;

      }


      // ==================================
      // MINIMUM CHUNK FAILED
      // ==================================

      console.log(
        "   ❌ Minimum chunk da başarısız."
      );

      console.log(
        "   Bu aralık güvenilir şekilde taranamadı."
      );


      failedChunks++;


      failedRanges.push({

        fromBlock:
          fromBlock.toString(),

        toBlock:
          toBlock.toString(),

        chunkSize:
          currentChunkSize,

        error:
          error.shortMessage ||
          error.message

      });


      // İlerliyoruz.
      // Sonsuz döngüye girmiyoruz.

      fromBlock =
        toBlock + 1n;

      // Yeni bölge için başlangıç
      // chunk boyutuna dönüyoruz.

      currentChunkSize =
        INITIAL_CHUNK_SIZE;

    }

  }


  // ========================================
  // RESULT
  // ========================================

  const agents =
    Array.from(
      discoveredAgents.values()
    );


  const scanStatus =
    failedChunks === 0
      ? "COMPLETE"
      : "PARTIAL";


  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "       DISCOVERY RESULT v13.1"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "Scan status:",
    scanStatus
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
    "Failed ranges:",
    failedRanges.length
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
  // AGENTS
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
  // FAILED RANGES
  // ========================================

  if (
    failedRanges.length > 0
  ) {

    console.log(
      "=========================================="
    );

    console.log(
      "           FAILED RANGES"
    );

    console.log(
      "=========================================="
    );

    console.log("");


    for (
      const range
      of failedRanges
    ) {

      console.log(
        `${range.fromBlock} → ${range.toBlock}`
      );

      console.log(
        `Chunk: ${range.chunkSize}`
      );

      console.log(
        `Error: ${range.error}`
      );

      console.log("");

    }

  }


  // ========================================
  // OUTPUT
  // ========================================

  const output = {

    schemaVersion:
      "1.3.1",

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

      initialChunkSize:
        INITIAL_CHUNK_SIZE,

      minimumChunkSize:
        MIN_CHUNK_SIZE,

      successfulChunks,

      failedChunks:

        failedChunks,

      totalEvents,

      status:
        scanStatus

    },

    failedRanges,

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
    "    ADAPTIVE DISCOVERY TAMAMLANDI"
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

  if (
    scanStatus ===
    "PARTIAL"
  ) {

    console.log(
      "⚠️ IMPORTANT:"
    );

    console.log(
      "Tarama PARTIAL olduğu için"
    );

    console.log(
      "agent bulunamaması kesin sonuç değildir."
    );

    console.log("");

  }

}


// ============================================
// START
// ============================================

main()
  .catch(
    error => {

      console.error("");

      console.error(
        "❌ Discovery Engine kritik hata verdi:"
      );

      console.error(
        error.shortMessage ||
        error.message
      );

      console.error("");

      process.exit(1);

    }
  );