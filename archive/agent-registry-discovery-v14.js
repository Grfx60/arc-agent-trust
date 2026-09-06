const fs = require("fs");
const {
  createPublicClient,
  http,
  parseAbi,
} = require("viem");


// ============================================
// CONFIG
// ============================================

const RPC_URL =
  "https://rpc.testnet.arc.network";

const IDENTITY_REGISTRY =
  "0x8004B663056A597Dffe9eCcC1965A193B7388713";

const TEST_AGENT_ID = 845265;

const OUTPUT_FILE =
  "agent-registry-discovery-v14.json";


// ============================================
// CLIENT
// ============================================

const client =
  createPublicClient({
    transport: http(RPC_URL),
  });


// ============================================
// ABI
// ============================================
//
// ERC-8004 Identity Registry için
// yaygın ERC-721 / Identity Registry
// fonksiyonlarını kontrollü şekilde test ediyoruz.
//
// Fonksiyon bulunmuyorsa program çökmeyecek.
// Sadece "NOT_SUPPORTED" diye raporlayacak.
//
// ============================================

const registryAbi =
  parseAbi([

    "function ownerOf(uint256 tokenId) view returns (address)",

    "function tokenURI(uint256 tokenId) view returns (string)",

    "function balanceOf(address owner) view returns (uint256)",

    "function totalSupply() view returns (uint256)",

  ]);


// ============================================
// SAFE READ
// ============================================

async function safeRead(
  functionName,
  args
) {

  try {

    const result =
      await client.readContract({

        address:
          IDENTITY_REGISTRY,

        abi:
          registryAbi,

        functionName,

        args

      });


    return {

      status:
        "OK",

      value:
        result

    };

  } catch (
    error
  ) {

    return {

      status:
        "NOT_SUPPORTED",

      error:
        error.shortMessage ||
        error.message

    };

  }

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
    "     AGENT REGISTRY DISCOVERY v14"
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

  console.log(
    "Test Agent:",
    TEST_AGENT_ID
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
  // TEST 1 — ownerOf
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "          TEST 1 — OWNER"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    `🔎 Agent ${TEST_AGENT_ID} ownerOf() okunuyor...`
  );


  const ownerResult =
    await safeRead(
      "ownerOf",
      [
        BigInt(TEST_AGENT_ID)
      ]
    );


  if (
    ownerResult.status ===
    "OK"
  ) {

    console.log(
      "✅ ownerOf:",
      ownerResult.value
    );

  } else {

    console.log(
      "⚠️ ownerOf desteklenmiyor veya okunamadı."
    );

    console.log(
      ownerResult.error
    );

  }

  console.log("");


  // ========================================
  // TEST 2 — tokenURI
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "         TEST 2 — METADATA"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    `🔎 Agent ${TEST_AGENT_ID} tokenURI() okunuyor...`
  );


  const tokenUriResult =
    await safeRead(
      "tokenURI",
      [
        BigInt(TEST_AGENT_ID)
      ]
    );


  if (
    tokenUriResult.status ===
    "OK"
  ) {

    console.log(
      "✅ tokenURI:"
    );

    console.log(
      tokenUriResult.value
    );

  } else {

    console.log(
      "⚠️ tokenURI desteklenmiyor veya okunamadı."
    );

    console.log(
      tokenUriResult.error
    );

  }

  console.log("");


  // ========================================
  // TEST 3 — totalSupply
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "        TEST 3 — TOTAL SUPPLY"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  const supplyResult =
    await safeRead(
      "totalSupply",
      []
    );


  if (
    supplyResult.status ===
    "OK"
  ) {

    console.log(
      "✅ totalSupply:"
    );

    console.log(
      supplyResult.value.toString()
    );

  } else {

    console.log(
      "⚠️ totalSupply desteklenmiyor."
    );

    console.log(
      supplyResult.error
    );

  }

  console.log("");


  // ========================================
  // TEST 4 — BALANCE
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "       TEST 4 — OWNER BALANCE"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  let balanceResult = {

    status:
      "SKIPPED"

  };


  if (
    ownerResult.status ===
    "OK"
  ) {

    console.log(
      "🔎 Owner balanceOf() okunuyor..."
    );


    balanceResult =
      await safeRead(
        "balanceOf",
        [
          ownerResult.value
        ]
      );


    if (
      balanceResult.status ===
      "OK"
    ) {

      console.log(
        "✅ Owner balance:",
        balanceResult.value.toString()
      );

    } else {

      console.log(
        "⚠️ balanceOf okunamadı."
      );

      console.log(
        balanceResult.error
      );

    }

  } else {

    console.log(
      "⚠️ ownerOf başarısız olduğu için balanceOf atlandı."
    );

  }

  console.log("");


  // ========================================
  // SUMMARY
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "             V14 SUMMARY"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  console.log(
    "ownerOf:",
    ownerResult.status
  );

  console.log(
    "tokenURI:",
    tokenUriResult.status
  );

  console.log(
    "totalSupply:",
    supplyResult.status
  );

  console.log(
    "balanceOf:",
    balanceResult.status
  );

  console.log("");


  // ========================================
  // DISCOVERY CAPABILITY
  // ========================================

  let discoveryMethod =
    "UNKNOWN";


  if (
    supplyResult.status ===
    "OK"
  ) {

    discoveryMethod =
      "TOKEN_ID_ENUMERATION_CANDIDATE";

  } else if (
    ownerResult.status ===
    "OK"
  ) {

    discoveryMethod =
      "DIRECT_TOKEN_ID_PROBING";

  } else {

    discoveryMethod =
      "REGISTRY_READ_NOT_AVAILABLE";

  }


  console.log(
    "Discovery capability:",
    discoveryMethod
  );

  console.log("");


  // ========================================
  // OUTPUT
  // ========================================

  const output = {

    schemaVersion:
      "1.4",

    network:
      "Arc Testnet",

    registry:
      IDENTITY_REGISTRY,

    generatedAt:
      new Date().toISOString(),

    currentBlock:
      currentBlock.toString(),

    testAgent:
      TEST_AGENT_ID,

    tests: {

      ownerOf:
        ownerResult,

      tokenURI:
        tokenUriResult,

      totalSupply:
        supplyResult,

      balanceOf:
        balanceResult

    },

    discoveryMethod

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
    "       V14 TEST TAMAMLANDI"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "📁 Dosya oluşturuldu:"
  );

  console.log(
    OUTPUT_FILE
  );

  console.log("");

}


// ============================================
// START
// ============================================

main()
  .catch(
    error => {

      console.error("");

      console.error(
        "❌ V14 kritik hata:"
      );

      console.error(
        error.shortMessage ||
        error.message
      );

      console.error("");

      process.exit(1);

    }
  );