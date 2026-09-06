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
// VALIDATION REGISTRY
// ============================================

const VALIDATION_REGISTRY =
  "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";


// ============================================
// VALIDATOR
// ============================================

const validatorAddress =
  "0xE18F822B5071553D62Cf119CE57Da6C1636F2524";


// ============================================
// TARGET AGENT
// ============================================

const targetAgentId = 845265n;


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

const validationAbi = [

  {
    name:
      "getValidatorRequests",

    type:
      "function",

    stateMutability:
      "view",

    inputs: [

      {
        name:
          "validatorAddress",

        type:
          "address",
      },

    ],

    outputs: [

      {
        name:
          "requestHashes",

        type:
          "bytes32[]",
      },

    ],

  },


  {
    name:
      "getValidationStatus",

    type:
      "function",

    stateMutability:
      "view",

    inputs: [

      {
        name:
          "requestHash",

        type:
          "bytes32",
      },

    ],

    outputs: [

      {
        name:
          "validatorAddress",

        type:
          "address",
      },

      {
        name:
          "agentId",

        type:
          "uint256",
      },

      {
        name:
          "response",

        type:
          "uint8",
      },

      {
        name:
          "responseHash",

        type:
          "bytes32",
      },

      {
        name:
          "tag",

        type:
          "string",
      },

      {
        name:
          "lastUpdate",

        type:
          "uint256",
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
    "       VALIDATOR INTELLIGENCE v1"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "Validator:"
  );

  console.log(
    validatorAddress
  );

  console.log("");

  console.log(
    "🎯 Target Agent:",
    targetAgentId.toString()
  );

  console.log("");


  // ========================================
  // 1. GET REQUESTS
  // ========================================

  console.log(
    "🔎 Validator requestleri aranıyor..."
  );


  const requestHashes =
    await client.readContract({

      address:
        VALIDATION_REGISTRY,

      abi:
        validationAbi,

      functionName:
        "getValidatorRequests",

      args:
        [
          validatorAddress,
        ],

    });


  console.log("");

  console.log(
    "📋 Toplam validation request:",
    requestHashes.length
  );


  // ========================================
  // NO DATA
  // ========================================

  if (
    requestHashes.length === 0
  ) {

    console.log("");

    console.log(
      "⚠️ Bu validator için validation request bulunamadı."
    );

    return;

  }


  // ========================================
  // DATA
  // ========================================

  const validations = [];


  // Aynı agent'ları tespit etmek için
  const agentIds = new Set();


  // Tag'leri toplamak için
  const tags = new Set();


  // Response değerleri
  const responses = [];


  // Target agent kayıtları
  const targetAgentValidations = [];


  // ========================================
  // 2. READ REQUESTS
  // ========================================

  console.log("");

  console.log(
    "🔬 Validation kayıtları okunuyor..."
  );


  for (
    let i = 0;
    i < requestHashes.length;
    i++
  ) {

    const requestHash =
      requestHashes[i];


    try {

      const result =
        await client.readContract({

          address:
            VALIDATION_REGISTRY,

          abi:
            validationAbi,

          functionName:
            "getValidationStatus",

          args:
            [
              requestHash,
            ],

        });


      const [

        returnedValidator,

        agentId,

        response,

        responseHash,

        tag,

        lastUpdate,

      ] = result;


      const numericAgentId =
        agentId.toString();


      const numericResponse =
        Number(response);


      const validation = {

        requestHash:
          requestHash,

        validator:
          returnedValidator,

        agentId:
          numericAgentId,

        response:
          numericResponse,

        responseHash:
          responseHash,

        tag:
          tag || "",

        lastUpdate:
          lastUpdate.toString(),

      };


      validations.push(
        validation
      );


      agentIds.add(
        numericAgentId
      );


      responses.push(
        numericResponse
      );


      if (
        tag &&
        tag.length > 0
      ) {

        tags.add(
          tag
        );

      }


      if (
        agentId === targetAgentId
      ) {

        targetAgentValidations.push(
          validation
        );

      }


      console.log(
        `   ✓ ${
          i + 1
        }/${requestHashes.length} | Agent ${
          numericAgentId
        } | ${
          numericResponse
        }/100 | ${
          tag || "(boş)"
        }`
      );


    } catch (error) {

      console.log(
        `   ⚠️ Request ${
          i + 1
        } okunamadı.`
      );

    }

  }


  // ========================================
  // 3. STATISTICS
  // ========================================

  let averageResponse =
    null;

  let lowestResponse =
    null;

  let highestResponse =
    null;


  if (
    responses.length > 0
  ) {

    const total =
      responses.reduce(
        (
          sum,
          value
        ) =>
          sum + value,

        0
      );


    averageResponse =
      total /
      responses.length;


    lowestResponse =
      Math.min(
        ...responses
      );


    highestResponse =
      Math.max(
        ...responses
      );

  }


  // ========================================
  // 4. TARGET AGENT
  // ========================================

  let targetAgentAverage =
    null;


  if (
    targetAgentValidations.length > 0
  ) {

    const targetResponses =
      targetAgentValidations.map(
        (
          validation
        ) =>
          validation.response
      );


    const targetTotal =
      targetResponses.reduce(
        (
          sum,
          value
        ) =>
          sum + value,

        0
      );


    targetAgentAverage =
      targetTotal /
      targetResponses.length;

  }


  // ========================================
  // 5. PRINT REPORT
  // ========================================

  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "       VALIDATOR PROFILE"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "Validator:",
    validatorAddress
  );

  console.log("");

  console.log(
    "Validation requests:",
    requestHashes.length
  );

  console.log(
    "Records successfully read:",
    validations.length
  );

  console.log(
    "Unique agents:",
    agentIds.size
  );

  console.log(
    "Unique tags:",
    tags.size
  );


  if (
    averageResponse !== null
  ) {

    console.log("");

    console.log(
      "Average response:",
      averageResponse.toFixed(2) +
        "/100"
    );

    console.log(
      "Lowest response:",
      lowestResponse +
        "/100"
    );

    console.log(
      "Highest response:",
      highestResponse +
        "/100"
    );

  }


  console.log("");

  console.log(
    "🎯 TARGET AGENT",
  );

  console.log(
    "Agent:",
    targetAgentId.toString()
  );

  console.log(
    "Validations from this validator:",
    targetAgentValidations.length
  );


  if (
    targetAgentAverage !== null
  ) {

    console.log(
      "Average response:",
      targetAgentAverage.toFixed(2) +
        "/100"
    );

  }


  console.log("");

  console.log(
    "=========================================="
  );


  // ========================================
  // 6. BEHAVIOR SIGNALS
  // ========================================

  console.log("");

  console.log(
    "🧠 VALIDATOR BEHAVIOR SIGNALS"
  );

  console.log(
    "------------------------------------------"
  );


  if (
    agentIds.size >= 5
  ) {

    console.log(
      "✅ Validator multiple agents için çalışmış."
    );

  } else if (
    agentIds.size > 1
  ) {

    console.log(
      "🟡 Validator birden fazla agent için çalışmış."
    );

  } else {

    console.log(
      "⚠️ Validator için agent çeşitliliği düşük."
    );

  }


  if (
    responses.length > 0 &&
    lowestResponse !== highestResponse
  ) {

    console.log(
      "ℹ️ Validator farklı response değerleri kullanmış."
    );

  }


  if (
    responses.length > 0 &&
    lowestResponse === 100 &&
    highestResponse === 100
  ) {

    console.log(
      "⚠️ Validator bütün sonuçları 100/100 vermiş."
    );

  }


  if (
    targetAgentValidations.length > 0
  ) {

    console.log(
      "🔗 Target agent bu validator'ın geçmişinde mevcut."
    );

  }


  console.log("");

  console.log(
    "⚠️ NOT: Bu profil validator'a güven puanı vermez."
  );

  console.log(
    "Önce validator davranışını gözlemliyoruz."
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
      "❌ Validator analyzer hatası:"
    );

    console.error(
      error.message
    );

  }

);