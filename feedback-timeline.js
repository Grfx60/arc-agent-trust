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
// REPUTATION REGISTRY
// ============================================

const REPUTATION_REGISTRY =
  "0x8004B663056A597Dffe9eCcC1965A193B7388713";


// ============================================
// TARGET
// ============================================

const agentId =
  845265n;

const clientAddress =
  "0xE18F822B5071553D62Cf119CE57Da6C1636F2524";


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
// ABI
// ============================================

const reputationAbi = [

  {
    name:
      "getLastIndex",

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

    ],

    outputs: [

      {
        name:
          "lastIndex",

        type:
          "uint64",
      },

    ],

  },


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
// MAIN
// ============================================

async function main() {

  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "        FEEDBACK TIMELINE"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "Agent:",
    agentId.toString()
  );

  console.log(
    "Client:",
    clientAddress
  );

  console.log("");


  // ========================================
  // LAST INDEX
  // ========================================

  console.log(
    "🔎 Son feedback index'i okunuyor..."
  );


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

        clientAddress,

      ],

    });


  console.log("");

  console.log(
    "📋 Last feedback index:",
    lastIndex.toString()
  );


  if (
    lastIndex === 0n
  ) {

    console.log("");

    console.log(
      "⚠️ Bu client için feedback bulunamadı."
    );

    return;

  }


  // ========================================
  // READ ALL FEEDBACKS
  // ========================================

  console.log("");

  console.log(
    "🔬 Feedback kayıtları okunuyor..."
  );


  const records = [];


  for (
    let index = 1n;
    index <= lastIndex;
    index++
  ) {

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

            agentId,

            clientAddress,

            index,

          ],

        });


      const [

        value,

        valueDecimals,

        tag1,

        tag2,

        isRevoked,

      ] = result;


      const numericValue =
        Number(value) /
        Math.pow(
          10,
          Number(valueDecimals)
        );


      const record = {

        index:
          index.toString(),

        value:
          numericValue,

        rawValue:
          value.toString(),

        decimals:
          Number(
            valueDecimals
          ),

        tag1:
          tag1,

        tag2:
          tag2,

        revoked:
          isRevoked,

      };


      records.push(
        record
      );


      console.log("");

      console.log(
        `⭐ Feedback #${index.toString()}`
      );

      console.log(
        "   Value:",
        numericValue
      );

      console.log(
        "   Tag 1:",
        tag1 ||
          "(boş)"
      );

      console.log(
        "   Tag 2:",
        tag2 ||
          "(boş)"
      );

      console.log(
        "   Revoked:",
        isRevoked
      );


    } catch (
      error
    ) {

      console.log("");

      console.log(
        `⚠️ Feedback #${index.toString()} okunamadı.`
      );

      console.log(
        error.message
      );

    }

  }


  // ========================================
  // SUMMARY
  // ========================================

  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "        TIMELINE SUMMARY"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "Agent:",
    agentId.toString()
  );

  console.log(
    "Client:",
    clientAddress
  );

  console.log(
    "Last index:",
    lastIndex.toString()
  );

  console.log(
    "Records read:",
    records.length
  );

  console.log("");

  console.log(
    "📌 IMPORTANT"
  );

  console.log(
    "------------------------------------------"
  );

  console.log(
    "Bu fonksiyon feedback index geçmişini"
  );

  console.log(
    "gösterir; ancak feedback'in blok numarasını"
  );

  console.log(
    "doğrudan döndürmez."
  );

  console.log("");

  console.log(
    "Blok zaman çizelgesi için event/indexer"
  );

  console.log(
    "verisi gereklidir."
  );

  console.log("");

  console.log(
    "=========================================="
  );

}


// ============================================
// START
// ============================================

main().catch(
  error => {

    console.error("");

    console.error(
      "❌ Timeline hatası:"
    );

    console.error(
      error.message
    );

  }
);