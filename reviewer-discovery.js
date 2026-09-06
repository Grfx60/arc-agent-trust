const {
  createPublicClient,
  http,
  parseAbiItem,
} = require("viem");


// ============================================
// ARC TESTNET
// ============================================

const arcTestnet = {
  id: 5042002,

  name: "Arc Testnet",

  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },

  rpcUrls: {
    default: {
      http: [
        "https://rpc.testnet.arc.network",
      ],
    },
  },
};


// ============================================
// CONTRACTS
// ============================================

const REPUTATION_REGISTRY =
  "0x8004B663056A597Dffe9eCcC1965A193B7388713";


// ============================================
// REVIEWER
// ============================================

const reviewerAddress =
  "0xE18F822B5071553D62Cf119CE57Da6C1636F2524";


// ============================================
// TARGET AGENT
// ============================================

const targetAgentId =
  "845265";


// ============================================
// DISCOVERY SETTINGS
// ============================================

// İlk pencere
const WINDOW_SIZE =
  100000n;


// Maksimum geçmiş
//
// 1.000.000 blok geriye gidiyoruz.
//
// Eğer daha eski kayıtları da aramak
// istersek daha sonra artırabiliriz.

const MAX_LOOKBACK =
  1000000n;


// RPC için başlangıç chunk
const INITIAL_CHUNK =
  10000n;


// RPC'nin izin verdiği minimum chunk
const MIN_CHUNK =
  250n;


// RPC'yi rahatlatmak için bekleme
const REQUEST_DELAY =
  250;


// ============================================
// CLIENT
// ============================================

const client =
  createPublicClient({

    chain:
      arcTestnet,

    transport:
      http(),

  });


// ============================================
// EVENTS
// ============================================

const newFeedbackEvent =
  parseAbiItem(
    "event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)"
  );


// ============================================
// ABI
// ============================================

const reputationAbi = [

  {
    name:
      "readFeedback",

    type:
      "function",

    stateMutability:
      "view",

    inputs: [

      {
        name:
          "agentId",

        type:
          "uint256",
      },

      {
        name:
          "clientAddress",

        type:
          "address",
      },

      {
        name:
          "feedbackIndex",

        type:
          "uint64",
      },

    ],

    outputs: [

      {
        name:
          "value",

        type:
          "int128",
      },

      {
        name:
          "valueDecimals",

        type:
          "uint8",
      },

      {
        name:
          "tag1",

        type:
          "string",
      },

      {
        name:
          "tag2",

        type:
          "string",
      },

      {
        name:
          "isRevoked",

        type:
          "bool",
      },

    ],

  },

];


// ============================================
// HELPERS
// ============================================

function sleep(
  ms
) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
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
    "     SMART REVIEWER DISCOVERY v3"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "Reviewer:"
  );

  console.log(
    reviewerAddress
  );

  console.log("");

  console.log(
    "Target Agent:",
    targetAgentId
  );

  console.log("");


  // ========================================
  // CURRENT BLOCK
  // ========================================

  const latestBlock =
    await client.getBlockNumber();


  console.log(
    "📦 Current block:",
    latestBlock.toString()
  );

  console.log("");


  // ========================================
  // GLOBAL STORAGE
  // ========================================

  const allEvents = [];

  const eventKeys =
    new Set();

  const uniqueAgents =
    new Set();

  const uniqueTags =
    new Set();


  let totalWindows =
    0;

  let successfulWindows =
    0;

  let failedWindows =
    0;


  // ========================================
  // DISCOVERY WINDOW
  // ========================================

  let windowEnd =
    latestBlock;


  let searchedBlocks =
    0n;


  let stopDiscovery =
    false;


  // ========================================
  // HISTORICAL WINDOWS
  // ========================================

  while (
    windowEnd >= 0n &&
    searchedBlocks < MAX_LOOKBACK &&
    !stopDiscovery
  ) {

    totalWindows++;


    let windowStart =
      windowEnd >=
      WINDOW_SIZE - 1n

        ? windowEnd -
          WINDOW_SIZE +
          1n

        : 0n;


    // MAX_LOOKBACK sınırını aşma

    const remaining =
      MAX_LOOKBACK -
      searchedBlocks;


    const actualWindowSize =
      windowEnd -
      windowStart +
      1n;


    if (
      actualWindowSize >
      remaining
    ) {

      windowStart =
        windowEnd -
        remaining +
        1n;

    }


    console.log("");

    console.log(
      "=========================================="
    );

    console.log(
      `🔎 HISTORY WINDOW ${totalWindows}`
    );

    console.log(
      "=========================================="
    );

    console.log("");

    console.log(
      "Blocks:",
      windowStart.toString(),
      "→",
      windowEnd.toString()
    );


    // ======================================
    // SCAN WINDOW
    // ======================================

    let currentBlock =
      windowStart;


    let chunkSize =
      INITIAL_CHUNK;


    let windowFailed =
      false;


    while (
      currentBlock <=
      windowEnd
    ) {

      let toBlock =
        currentBlock +
        chunkSize -
        1n;


      if (
        toBlock >
        windowEnd
      ) {

        toBlock =
          windowEnd;

      }


      console.log("");

      console.log(
        `   🔍 ${currentBlock.toString()} → ${toBlock.toString()}`
      );

      console.log(
        `      Chunk: ${chunkSize.toString()}`
      );


      try {

        const logs =
          await client.getLogs({

            address:
              REPUTATION_REGISTRY,

            event:
              newFeedbackEvent,

            args: {

              clientAddress:
                reviewerAddress,

            },

            fromBlock:
              currentBlock,

            toBlock:
              toBlock,

          });


        console.log(
          `      ✅ ${logs.length} event`
        );


        successfulWindows++;


        // ==================================
        // PROCESS EVENTS
        // ==================================

        for (
          const log
          of logs
        ) {

          const args =
            log.args;


          const agentId =
            args.agentId !== undefined
              ? args.agentId.toString()
              : "UNKNOWN";


          const feedbackIndex =
            args.feedbackIndex !== undefined
              ? args.feedbackIndex.toString()
              : "UNKNOWN";


          const transactionHash =
            log.transactionHash ||
            "UNKNOWN";


          const logIndex =
            log.logIndex !== undefined
              ? log.logIndex.toString()
              : "UNKNOWN";


          const key =
            `${transactionHash}-${logIndex}`;


          if (
            eventKeys.has(
              key
            )
          ) {

            continue;

          }


          eventKeys.add(
            key
          );


          const rawValue =
            args.value !== undefined
              ? args.value.toString()
              : "UNKNOWN";


          const valueDecimals =
            args.valueDecimals !== undefined
              ? Number(
                  args.valueDecimals
                )
              : 0;


          const value =
            args.value !== undefined
              ? Number(
                  args.value
                ) /
                Math.pow(
                  10,
                  valueDecimals
                )
              : null;


          const tag1 =
            args.tag1 ||
            "";


          const tag2 =
            args.tag2 ||
            "";


          const record = {

            blockNumber:
              log.blockNumber
                ? log.blockNumber.toString()
                : null,

            transactionHash:
              transactionHash,

            logIndex:
              logIndex,

            agentId:
              agentId,

            clientAddress:
              args.clientAddress,

            feedbackIndex:
              feedbackIndex,

            value:
              value,

            rawValue:
              rawValue,

            valueDecimals:
              valueDecimals,

            tag1:
              tag1,

            tag2:
              tag2,

            verified:
              false,

            revoked:
              null,

          };


          // =================================
          // RAW EVENT
          // =================================

          console.log("");

          console.log(
            "      ⭐ FEEDBACK EVENT"
          );

          console.log(
            "      Agent:",
            agentId
          );

          console.log(
            "      Index:",
            feedbackIndex
          );

          console.log(
            "      Value:",
            value
          );

          console.log(
            "      Tag:",
            tag1 ||
              "(boş)"
          );


          // =================================
          // CONTRACT VERIFICATION
          // =================================

          try {

            const result =
              await client.readContract({

                address:
                  REPUTATION_REGISTRY,

                abi:
                  reputationAbi,

                functionName:
                  "readFeedback",

                args: [

                  BigInt(
                    agentId
                  ),

                  reviewerAddress,

                  BigInt(
                    feedbackIndex
                  ),

                ],

              });


            const [

              contractValue,

              contractDecimals,

              contractTag1,

              contractTag2,

              isRevoked,

            ] = result;


            record.verified =
              true;


            record.revoked =
              isRevoked;


            record.contractValue =
              contractValue.toString();


            record.contractDecimals =
              Number(
                contractDecimals
              );


            record.contractTag1 =
              contractTag1;


            record.contractTag2 =
              contractTag2;


            console.log(
              "      🔐 Contract doğrulaması: OK"
            );

            console.log(
              "      Revoked:",
              isRevoked
            );


          } catch (
            verificationError
          ) {

            console.log(
              "      ⚠️ Contract doğrulaması başarısız."
            );

            console.log(
              "      Event yine de kaydedildi."
            );

          }


          allEvents.push(
            record
          );


          uniqueAgents.add(
            agentId
          );


          if (
            tag1
          ) {

            uniqueTags.add(
              tag1
            );

          }


          if (
            tag2
          ) {

            uniqueTags.add(
              tag2
            );

          }


          // =================================
          // TARGET AGENT
          // =================================

          if (
            agentId ===
            targetAgentId
          ) {

            console.log("");

            console.log(
              "      🎯 TARGET AGENT BULUNDU!"
            );

          }

        }


        // ==================================
        // ADVANCE
        // ==================================

        currentBlock =
          toBlock +
          1n;


        // Başarılıysa chunk tekrar büyüyebilir

        if (
          chunkSize <
          INITIAL_CHUNK
        ) {

          chunkSize =
            chunkSize * 2n;


          if (
            chunkSize >
            INITIAL_CHUNK
          ) {

            chunkSize =
              INITIAL_CHUNK;

          }

        }


        await sleep(
          REQUEST_DELAY
        );


      } catch (
        error
      ) {

        console.log("");

        console.log(
          "      ⚠️ RPC hata verdi."
        );

        console.log(
          "      ",
          error.message
        );


        // =================================
        // SHRINK
        // =================================

        if (
          chunkSize >
          MIN_CHUNK
        ) {

          chunkSize =
            chunkSize / 2n;


          if (
            chunkSize <
            MIN_CHUNK
          ) {

            chunkSize =
              MIN_CHUNK;

          }


          console.log(
            "      🔧 Yeni chunk:",
            chunkSize.toString()
          );

          console.log(
            "      Aynı aralık tekrar denenecek."
          );


          await sleep(
            1000
          );


          continue;

        }


        // =================================
        // WINDOW FAILURE
        // =================================

        console.log("");

        console.log(
          "      ❌ Minimum chunk da başarısız."
        );

        console.log(
          "      Bu history window güvenilir"
        );

        console.log(
          "      şekilde taranamadı."
        );


        windowFailed =
          true;


        failedWindows++;

        break;

      }

    }


    // ======================================
    // WINDOW RESULT
    // ======================================

    if (
      windowFailed
    ) {

      console.log("");

      console.log(
        "⚠️ History window PARTIAL."
      );

      console.log(
        "Bu nedenle geçmiş discovery sonucu"
      );

      console.log(
        "kesin kabul edilmeyecek."
      );


      break;

    }


    searchedBlocks +=
      windowEnd -
      windowStart +
      1n;


    // ======================================
    // WINDOW SUMMARY
    // ======================================

    console.log("");

    console.log(
      "📊 Window sonucu:"
    );

    console.log(
      "   Events:",
      allEvents.length
    );

    console.log(
      "   Unique agents:",
      uniqueAgents.size
    );


    // ======================================
    // STOP IF FOUND
    // ======================================
    //
    // Burada hemen durmuyoruz.
    //
    // Reviewer'ın geçmişini gerçekten
    // anlamak için maksimum history'yi
    // tarıyoruz.
    //
    // ======================================

    if (
      windowStart ===
      0n
    ) {

      stopDiscovery =
        true;

      break;

    }


    // ======================================
    // NEXT OLDER WINDOW
    // ======================================

    windowEnd =
      windowStart -
      1n;

  }


  // ========================================
  // FINAL STATUS
  // ========================================

  const complete =
    !stopDiscovery &&
    searchedBlocks >=
      MAX_LOOKBACK;


  let status;


  if (
    failedWindows > 0
  ) {

    status =
      "PARTIAL";

  } else {

    status =
      "COMPLETE";

  }


  // ========================================
  // FINAL REPORT
  // ========================================

  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "      REVIEWER DISCOVERY v3 RESULT"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "Reviewer:",
    reviewerAddress
  );

  console.log("");

  console.log(
    "Status:",
    status
  );

  console.log(
    "Maximum history:",
    MAX_LOOKBACK.toString(),
    "blocks"
  );

  console.log(
    "Blocks searched:",
    searchedBlocks.toString()
  );

  console.log(
    "History windows:",
    totalWindows
  );

  console.log("");

  console.log(
    "Feedback events:",
    allEvents.length
  );

  console.log(
    "Unique agents:",
    uniqueAgents.size
  );

  console.log(
    "Unique tags:",
    uniqueTags.size
  );

  console.log("");


  // ========================================
  // AGENT LIST
  // ========================================

  console.log(
    "🤖 REVIEWER AGENT COVERAGE"
  );

  console.log(
    "------------------------------------------"
  );


  if (
    uniqueAgents.size === 0
  ) {

    console.log(
      "Hiç feedback event bulunamadı."
    );

  } else {

    const sorted =
      [
        ...uniqueAgents,
      ].sort(
        (
          a,
          b
        ) =>
          Number(a) -
          Number(b)
      );


    for (
      const agentId
      of sorted
    ) {

      const records =
        allEvents.filter(
          event =>
            event.agentId ===
            agentId
        );


      console.log(
        `Agent #${agentId} → ${records.length} feedback`
      );

    }

  }


  console.log("");


  // ========================================
  // TARGET
  // ========================================

  const targetEvents =
    allEvents.filter(
      event =>
        event.agentId ===
        targetAgentId
    );


  console.log(
    "🎯 TARGET AGENT"
  );

  console.log(
    "------------------------------------------"
  );

  console.log(
    "Agent:",
    targetAgentId
  );

  console.log(
    "Reviewer feedback:",
    targetEvents.length
  );


  for (
    const event
    of targetEvents
  ) {

    console.log("");

    console.log(
      "Index:",
      event.feedbackIndex
    );

    console.log(
      "Value:",
      event.value
    );

    console.log(
      "Tag:",
      event.tag1 ||
        "(boş)"
    );

    console.log(
      "Block:",
      event.blockNumber
    );

    console.log(
      "Verified:",
      event.verified
    );

    console.log(
      "Revoked:",
      event.revoked
    );

  }


  console.log("");


  // ========================================
  // COVERAGE CLASSIFICATION
  // ========================================

  console.log(
    "🧠 COVERAGE CLASSIFICATION"
  );

  console.log(
    "------------------------------------------"
  );


  if (
    status !==
    "COMPLETE"
  ) {

    console.log(
      "UNKNOWN"
    );

    console.log(
      "Tarama tamamlanmadı."
    );

  } else if (
    uniqueAgents.size ===
    0
  ) {

    console.log(
      "NO_OBSERVED_FEEDBACK"
    );

  } else if (
    uniqueAgents.size ===
    1
  ) {

    console.log(
      "LOW"
    );

  } else if (
    uniqueAgents.size <
    5
  ) {

    console.log(
      "LIMITED"
    );

  } else {

    console.log(
      "BROAD"
    );

  }


  console.log("");


  // ========================================
  // FINAL INTERPRETATION
  // ========================================

  console.log(
    "🧠 INTERPRETATION"
  );

  console.log(
    "------------------------------------------"
  );


  if (
    status ===
    "PARTIAL"
  ) {

    console.log(
      "⚠️ Historical evidence incomplete."
    );

    console.log(
      "Coverage hakkında kesin sonuç yok."
    );

  } else if (
    uniqueAgents.size ===
    0
  ) {

    console.log(
      "⚠️ Belirlenen historical window içinde"
    );

    console.log(
      "NewFeedback event bulunamadı."
    );

    console.log(
      "Bu, reviewer'ın hiçbir zaman feedback"
    );

    console.log(
      "vermediğini kanıtlamaz."
    );

  } else {

    console.log(
      "✅ Reviewer'ın historical coverage"
    );

    console.log(
      "kayıtları bulundu."
    );

  }


  console.log("");

  console.log(
    "=========================================="
  );

}


main().catch(
  error => {

    console.error("");

    console.error(
      "❌ Discovery v3 hatası:"
    );

    console.error(
      error.message
    );

  }
);