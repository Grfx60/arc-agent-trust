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
// REVIEWER / VALIDATOR
// ============================================

const reviewerAddress =
  "0xE18F822B5071553D62Cf119CE57Da6C1636F2524";


// ============================================
// TARGET AGENT
// ============================================

const targetAgentId =
  845265n;


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
      "getSummary",

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
          "clientAddresses",

        type:
          "address[]",
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

    ],

    outputs: [

      {
        name:
          "count",

        type:
          "uint64",
      },

      {
        name:
          "summaryValue",

        type:
          "int128",
      },

      {
        name:
          "summaryValueDecimals",

        type:
          "uint8",
      },

    ],

  },

];


// ============================================
// NOTE
// ============================================
//
// Reputation Registry doğrudan:
//
// "Bu client kaç farklı agent'a feedback verdi?"
//
// sorgusunu sağlayan bir fonksiyon sunmuyor.
//
// Bu nedenle burada tüm chain'i körlemesine
// taramak yerine kontrollü bir yaklaşım
// kullanacağız.
//
// İlk olarak hedef agent üzerindeki rolünü
// doğrulayacağız.
//
// Daha geniş reviewer discovery için
// ileride event/indexer katmanı ekleyeceğiz.
//
// ============================================


// ============================================
// MAIN
// ============================================

async function main() {

  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "       REVIEWER INTELLIGENCE v1"
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
    "🎯 Target Agent:",
    targetAgentId.toString()
  );

  console.log("");


  // ========================================
  // TARGET AGENT SUMMARY
  // ========================================

  console.log(
    "🔎 Reviewer'ın hedef agent üzerindeki"
  );

  console.log(
    "   reputation rolü kontrol ediliyor..."
  );


  try {

    const result =
      await client.readContract({

        address:
          REPUTATION_REGISTRY,

        abi:
          reputationAbi,

        functionName:
          "getSummary",

        args: [

          targetAgentId,

          [
            reviewerAddress,
          ],

          "",

          "",

        ],

      });


    const [

      count,

      summaryValue,

      summaryValueDecimals,

    ] = result;


    const numericCount =
      Number(count);


    const numericSummary =
      Number(summaryValue) /
      Math.pow(
        10,
        Number(
          summaryValueDecimals
        )
      );


    console.log("");

    console.log(
      "=========================================="
    );

    console.log(
      "       REVIEWER PROFILE"
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
      "Target Agent:",
      targetAgentId.toString()
    );

    console.log(
      "Feedback count:",
      numericCount
    );

    console.log(
      "Summary value:",
      numericSummary
    );

    console.log(
      "Decimals:",
      Number(
        summaryValueDecimals
      )
    );

    console.log("");


    // ======================================
    // ROLE ANALYSIS
    // ======================================

    if (
      numericCount > 0
    ) {

      console.log(
        "🔗 Reviewer → Target Agent ilişkisi: YES"
      );

    } else {

      console.log(
        "⚠️ Reviewer → Target Agent feedback bulunamadı."
      );

    }


    console.log("");


    // ======================================
    // IMPORTANT LIMITATION
    // ======================================

    console.log(
      "=========================================="
    );

    console.log(
      "⚠️ DISCOVERY LIMITATION"
    );

    console.log(
      "=========================================="
    );

    console.log("");

    console.log(
      "Bu sorgu reviewer'ın başka agent'lara"
    );

    console.log(
      "feedback verip vermediğini henüz göstermez."
    );

    console.log("");

    console.log(
      "Bunun için Reputation Registry"
    );

    console.log(
      "event/indexer katmanı gerekecek."
    );

    console.log("");

    console.log(
      "Şimdilik yalnızca hedef agent üzerindeki"
    );

    console.log(
      "reputation rolünü doğruladık."
    );

    console.log("");

  } catch (error) {

    console.log("");

    console.log(
      "❌ Reputation sorgusu başarısız."
    );

    console.log(
      error.message
    );

    console.log("");

  }

}


// ============================================
// START
// ============================================

main().catch(

  (error) => {

    console.error("");

    console.error(
      "❌ Reviewer analyzer hatası:"
    );

    console.error(
      error.message
    );

  }

);