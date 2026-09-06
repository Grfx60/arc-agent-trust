const fs = require("fs");
const {
  createPublicClient,
  http,
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
// CONTRACT ADDRESSES
// ============================================

const IDENTITY_REGISTRY =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const REPUTATION_REGISTRY =
  "0x8004B663056A597Dffe9eCcC1965A193B7388713";

const VALIDATION_REGISTRY =
  "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";


// ============================================
// BLOCKCHAIN CLIENT
// ============================================

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});


// ============================================
// IDENTITY ABI
// ============================================

const identityAbi = [

  {
    name: "ownerOf",

    type: "function",

    stateMutability: "view",

    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
    ],

    outputs: [
      {
        name: "",
        type: "address",
      },
    ],
  },


  {
    name: "tokenURI",

    type: "function",

    stateMutability: "view",

    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
    ],

    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
  },

];


// ============================================
// REPUTATION ABI
// ============================================

const reputationAbi = [

  {
    name: "getClients",

    type: "function",

    stateMutability: "view",

    inputs: [
      {
        name: "agentId",
        type: "uint256",
      },
    ],

    outputs: [
      {
        name: "clients",
        type: "address[]",
      },
    ],
  },


  {
    name: "getLastIndex",

    type: "function",

    stateMutability: "view",

    inputs: [
      {
        name: "agentId",
        type: "uint256",
      },

      {
        name: "clientAddress",
        type: "address",
      },
    ],

    outputs: [
      {
        name: "lastIndex",
        type: "uint64",
      },
    ],
  },


  {
    name: "readFeedback",

    type: "function",

    stateMutability: "view",

    inputs: [
      {
        name: "agentId",
        type: "uint256",
      },

      {
        name: "clientAddress",
        type: "address",
      },

      {
        name: "feedbackIndex",
        type: "uint64",
      },
    ],

    outputs: [

      {
        name: "value",
        type: "int128",
      },

      {
        name: "valueDecimals",
        type: "uint8",
      },

      {
        name: "tag1",
        type: "string",
      },

      {
        name: "tag2",
        type: "string",
      },

      {
        name: "isRevoked",
        type: "bool",
      },

    ],
  },

];


// ============================================
// VALIDATION ABI
// ============================================

const validationAbi = [

  {
    name: "getAgentValidations",

    type: "function",

    stateMutability: "view",

    inputs: [
      {
        name: "agentId",
        type: "uint256",
      },
    ],

    outputs: [
      {
        name: "requestHashes",
        type: "bytes32[]",
      },
    ],
  },


  {
    name: "getValidationStatus",

    type: "function",

    stateMutability: "view",

    inputs: [
      {
        name: "requestHash",
        type: "bytes32",
      },
    ],

    outputs: [

      {
        name: "validatorAddress",
        type: "address",
      },

      {
        name: "agentId",
        type: "uint256",
      },

      {
        name: "response",
        type: "uint8",
      },

      {
        name: "responseHash",
        type: "bytes32",
      },

      {
        name: "tag",
        type: "string",
      },

      {
        name: "lastUpdate",
        type: "uint256",
      },

    ],
  },

];


// ============================================
// SETTINGS
// ============================================

const agentId = 845265n;


// Maksimum kaç reputation client'ı tarayalım?
const maxReputationClients = 10;


// Her client için maksimum kaç feedback okuyalım?
const maxFeedbackPerClient = 20;


// Maksimum validation kaydı
const maxValidations = 20;


// ============================================
// MAIN
// ============================================

async function main() {

  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "     AGENT EVIDENCE COLLECTOR v2"
  );

  console.log(
    "=========================================="
  );

  console.log(
    "Agent ID:",
    agentId.toString()
  );

  console.log("");


  // ========================================
  // 1. IDENTITY
  // ========================================

  console.log(
    "🔵 [1/3] Identity okunuyor..."
  );


  const owner =
    await client.readContract({

      address:
        IDENTITY_REGISTRY,

      abi:
        identityAbi,

      functionName:
        "ownerOf",

      args: [
        agentId,
      ],

    });


  const metadataURI =
    await client.readContract({

      address:
        IDENTITY_REGISTRY,

      abi:
        identityAbi,

      functionName:
        "tokenURI",

      args: [
        agentId,
      ],

    });


  console.log(
    "   Owner:",
    owner
  );


  console.log(
    "   Metadata:",
    metadataURI
  );


  // ========================================
  // 2. REPUTATION
  // ========================================

  console.log("");

  console.log(
    "🟡 [2/3] Reputation okunuyor..."
  );


  const reputationClients =
    await client.readContract({

      address:
        REPUTATION_REGISTRY,

      abi:
        reputationAbi,

      functionName:
        "getClients",

      args: [
        agentId,
      ],

    });


  console.log(
    "   Toplam reputation client:",
    reputationClients.length
  );


  const reputation = [];

  const clientsToCheck =
    reputationClients.slice(
      0,
      maxReputationClients
    );


  for (
    let clientNumber = 0;
    clientNumber < clientsToCheck.length;
    clientNumber++
  ) {

    const reputationClient =
      clientsToCheck[clientNumber];


    console.log("");

    console.log(
      `   👤 Client ${
        clientNumber + 1
      }/${clientsToCheck.length}`
    );

    console.log(
      "      Address:",
      reputationClient
    );


    try {

      const lastIndex =
        await client.readContract({

          address:
            REPUTATION_REGISTRY,

          abi:
            reputationAbi,

          functionName:
            "getLastIndex",

          args: [
            agentId,
            reputationClient,
          ],

        });


      console.log(
        "      Last index:",
        lastIndex.toString()
      );


      if (lastIndex === 0n) {

        console.log(
          "      ⚠️ Feedback bulunamadı."
        );

        continue;

      }


      /*
       * Eğer client'ın çok fazla feedback'i varsa
       * yalnızca son maxFeedbackPerClient kaydı
       * okuyacağız.
       */

      const lastIndexNumber =
        Number(lastIndex);


      const firstIndex =
        Math.max(
          1,
          lastIndexNumber -
            maxFeedbackPerClient +
            1
        );


      const clientFeedbacks = [];


      for (
        let index = firstIndex;
        index <= lastIndexNumber;
        index++
      ) {

        try {

          const feedback =
            await client.readContract({

              address:
                REPUTATION_REGISTRY,

              abi:
                reputationAbi,

              functionName:
                "readFeedback",

              args: [

                agentId,

                reputationClient,

                BigInt(index),

              ],

            });


          const [
            value,
            valueDecimals,
            tag1,
            tag2,
            isRevoked,
          ] = feedback;


          const numericValue =
            Number(value) /
            Math.pow(
              10,
              Number(valueDecimals)
            );


          const feedbackRecord = {

            client:
              reputationClient,

            index:
              index,

            value:
              numericValue,

            rawValue:
              value.toString(),

            decimals:
              Number(valueDecimals),

            tag1:
              tag1 || "",

            tag2:
              tag2 || "",

            revoked:
              isRevoked,

          };


          clientFeedbacks.push(
            feedbackRecord
          );


          console.log(
            `      ✓ Feedback #${index} | Value: ${numericValue} | Tag: ${
              tag1 || "(boş)"
            }${
              isRevoked
                ? " | REVOKED"
                : ""
            }`
          );


        } catch (error) {

          console.log(
            `      ⚠️ Feedback #${index} okunamadı.`
          );

        }

      }


      reputation.push({

        client:
          reputationClient,

        lastIndex:
          lastIndexNumber,

        collectedFromIndex:
          firstIndex,

        collectedToIndex:
          lastIndexNumber,

        feedbacks:
          clientFeedbacks,

      });


    } catch (error) {

      console.log(
        "      ❌ Client okunamadı."
      );

    }

  }


  // ========================================
  // 3. VALIDATION
  // ========================================

  console.log("");

  console.log(
    "🟢 [3/3] Validation okunuyor..."
  );


  const requestHashes =
    await client.readContract({

      address:
        VALIDATION_REGISTRY,

      abi:
        validationAbi,

      functionName:
        "getAgentValidations",

      args: [
        agentId,
      ],

    });


  console.log(
    "   Toplam validation request:",
    requestHashes.length
  );


  const validations = [];


  const validationsToCheck =
    requestHashes.slice(
      0,
      maxValidations
    );


  for (
    let validationNumber = 0;
    validationNumber <
    validationsToCheck.length;
    validationNumber++
  ) {

    const requestHash =
      validationsToCheck[
        validationNumber
      ];


    try {

      const result =
        await client.readContract({

          address:
            VALIDATION_REGISTRY,

          abi:
            validationAbi,

          functionName:
            "getValidationStatus",

          args: [
            requestHash,
          ],

        });


      const [
        validatorAddress,
        returnedAgentId,
        response,
        responseHash,
        tag,
        lastUpdate,
      ] = result;


      validations.push({

        requestHash:
          requestHash,

        validator:
          validatorAddress,

        agentId:
          returnedAgentId.toString(),

        response:
          Number(response),

        responseHash:
          responseHash,

        tag:
          tag || "",

        lastUpdate:
          lastUpdate.toString(),

      });


      console.log("");

      console.log(
        `   ✓ Validation ${
          validationNumber + 1
        }`
      );

      console.log(
        "      Validator:",
        validatorAddress
      );

      console.log(
        "      Response:",
        `${Number(response)}/100`
      );

      console.log(
        "      Tag:",
        tag || "(boş)"
      );


    } catch (error) {

      console.log(
        `   ⚠️ Validation ${
          validationNumber + 1
        } okunamadı.`
      );

    }

  }


  // ========================================
  // 4. CREATE EVIDENCE OBJECT
  // ========================================

  const evidence = {

    schemaVersion:
      "0.2",

    network:
      "Arc Testnet",

    agentId:
      agentId.toString(),

    collectedAt:
      new Date().toISOString(),

    collector: {

      maxReputationClients:
        maxReputationClients,

      maxFeedbackPerClient:
        maxFeedbackPerClient,

      maxValidations:
        maxValidations,

    },

    identity: {

      owner:
        owner,

      metadataURI:
        metadataURI,

    },

    reputation: {

      totalClients:
        reputationClients.length,

      clientsScanned:
        clientsToCheck.length,

      clients:
        reputation,

    },

    validation: {

      totalRequests:
        requestHashes.length,

      requestsScanned:
        validationsToCheck.length,

      records:
        validations,

    },

  };


  // ========================================
  // 5. SAVE JSON
  // ========================================

  const outputFile =
    `agent-${agentId.toString()}-evidence.json`;


  fs.writeFileSync(

    outputFile,

    JSON.stringify(
      evidence,
      null,
      2
    )

  );


  // ========================================
  // 6. SUMMARY
  // ========================================

  let totalFeedbackCollected = 0;

  let totalRevoked = 0;

  let totalActive = 0;


  for (
    const clientData
    of reputation
  ) {

    for (
      const feedback
      of clientData.feedbacks
    ) {

      totalFeedbackCollected++;


      if (
        feedback.revoked
      ) {

        totalRevoked++;

      } else {

        totalActive++;

      }

    }

  }


  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "       ✅ EVIDENCE TOPLAMA TAMAMLANDI"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "Identity:",
    "OK"
  );

  console.log(
    "Reputation clients:",
    reputationClients.length
  );

  console.log(
    "Scanned clients:",
    clientsToCheck.length
  );

  console.log(
    "Feedback collected:",
    totalFeedbackCollected
  );

  console.log(
    "Active feedback:",
    totalActive
  );

  console.log(
    "Revoked feedback:",
    totalRevoked
  );

  console.log(
    "Validation requests:",
    requestHashes.length
  );

  console.log(
    "Validation records:",
    validations.length
  );

  console.log("");

  console.log(
    "📁 Evidence dosyası:"
  );

  console.log(
    outputFile
  );

  console.log("");

}


// ============================================
// START
// ============================================

main().catch(

  (error) => {

    console.error("");

    console.error(
      "❌ Collector hatası:"
    );

    console.error(
      error.message
    );

  }

);