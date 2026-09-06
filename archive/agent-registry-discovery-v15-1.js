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
  "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const TEST_AGENT_ID =
  845265;

const OUTPUT_FILE =
  "agent-registry-discovery-v15-1.json";


// ============================================
// CLIENT
// ============================================

const client =
  createPublicClient({

    transport:
      http(RPC_URL),

  });


// ============================================
// ABI
// ============================================

const identityAbi =
  parseAbi([

    "function ownerOf(uint256 tokenId) view returns (address)",

    "function tokenURI(uint256 tokenId) view returns (string)",

    "function getAgentURI(uint256 agentId) view returns (string)",

    "function balanceOf(address owner) view returns (uint256)",

    "function getMetadata(uint256 agentId, string metadataKey) view returns (bytes)",

  ]);


// ============================================
// BIGINT SAFE SERIALIZER
// ============================================

function serialize(
  value
) {

  if (
    typeof value ===
    "bigint"
  ) {

    return value.toString();

  }


  if (
    Array.isArray(value)
  ) {

    return value.map(
      serialize
    );

  }


  if (
    value !== null &&
    typeof value ===
    "object"
  ) {

    const result = {};

    for (
      const [key, item]
      of Object.entries(value)
    ) {

      result[key] =
        serialize(item);

    }

    return result;

  }


  return value;

}


// ============================================
// SAFE READ
// ============================================

async function safeRead(
  functionName,
  args
) {

  try {

    const value =
      await client.readContract({

        address:
          IDENTITY_REGISTRY,

        abi:
          identityAbi,

        functionName,

        args,

      });


    return {

      status:
        "OK",

      value,

    };

  } catch (
    error
  ) {

    return {

      status:
        "ERROR",

      error:
        error.shortMessage ||
        error.message,

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
    "   IDENTITY REGISTRY VALIDATION v15.1"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "Network: Arc Testnet"
  );

  console.log(
    "Identity Registry:"
  );

  console.log(
    IDENTITY_REGISTRY
  );

  console.log("");

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
  // OWNER
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


  const ownerResult =
    await safeRead(

      "ownerOf",

      [
        BigInt(
          TEST_AGENT_ID
        )
      ]

    );


  if (
    ownerResult.status ===
    "OK"
  ) {

    console.log(
      "✅ ownerOf:"
    );

    console.log(
      ownerResult.value
    );

  } else {

    console.log(
      "❌ ownerOf:"
    );

    console.log(
      ownerResult.error
    );

  }

  console.log("");


  // ========================================
  // TOKEN URI
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "        TEST 2 — TOKEN URI"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  const tokenUriResult =
    await safeRead(

      "tokenURI",

      [
        BigInt(
          TEST_AGENT_ID
        )
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
      "⚠️ tokenURI:"
    );

    console.log(
      tokenUriResult.error
    );

  }

  console.log("");


  // ========================================
  // GET AGENT URI
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "       TEST 3 — GET AGENT URI"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  const agentUriResult =
    await safeRead(

      "getAgentURI",

      [
        BigInt(
          TEST_AGENT_ID
        )
      ]

    );


  if (
    agentUriResult.status ===
    "OK"
  ) {

    console.log(
      "✅ getAgentURI:"
    );

    console.log(
      agentUriResult.value
    );

  } else {

    console.log(
      "⚠️ getAgentURI:"
    );

    console.log(
      agentUriResult.error
    );

  }

  console.log("");


  // ========================================
  // AGENT WALLET
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "      TEST 4 — AGENT WALLET"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  const walletResult =
    await safeRead(

      "getMetadata",

      [

        BigInt(
          TEST_AGENT_ID
        ),

        "agentWallet"

      ]

    );


  if (
    walletResult.status ===
    "OK"
  ) {

    console.log(
      "✅ agentWallet:"
    );

    console.log(
      walletResult.value
    );

  } else {

    console.log(
      "⚠️ agentWallet okunamadı:"
    );

    console.log(
      walletResult.error
    );

  }

  console.log("");


  // ========================================
  // BALANCE
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "       TEST 5 — OWNER BALANCE"
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
        "✅ balanceOf:"
      );

      console.log(
        balanceResult.value.toString()
      );

    } else {

      console.log(
        "❌ balanceOf:"
      );

      console.log(
        balanceResult.error
      );

    }

  }

  console.log("");


  // ========================================
  // VALIDATION
  // ========================================

  const expectedOwner =
    "0xBB30e40F0887b060e9339f6541E29AfA5A3A9dBb";


  const knownAgentVerified =
    ownerResult.status ===
      "OK" &&
    ownerResult.value.toLowerCase() ===
      expectedOwner.toLowerCase();


  // ========================================
  // DISCOVERY CAPABILITY
  // ========================================

  let discoveryCapability =
    "UNKNOWN";


  if (
    ownerResult.status ===
      "OK" &&
    tokenUriResult.status ===
      "OK"
  ) {

    discoveryCapability =
      "DIRECT_IDENTITY_READ";

  } else if (
    ownerResult.status ===
      "OK"
  ) {

    discoveryCapability =
      "OWNER_BASED_IDENTITY_READ";

  } else {

    discoveryCapability =
      "IDENTITY_READ_FAILED";

  }


  // ========================================
  // SUMMARY
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "             V15.1 SUMMARY"
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
    "getAgentURI:",
    agentUriResult.status
  );

  console.log(
    "agentWallet:",
    walletResult.status
  );

  console.log(
    "balanceOf:",
    balanceResult.status
  );

  console.log("");


  if (
    knownAgentVerified
  ) {

    console.log(
      "🟢 KNOWN AGENT VERIFIED"
    );

    console.log(
      "Agent 845265 owner eşleşmesi başarılı."
    );

  } else {

    console.log(
      "🔴 KNOWN AGENT VERIFICATION FAILED"
    );

  }

  console.log("");

  console.log(
    "Discovery capability:",
    discoveryCapability
  );

  console.log("");


  // ========================================
  // OUTPUT
  // ========================================

  const output = {

    schemaVersion:
      "1.5.1",

    network:
      "Arc Testnet",

    identityRegistry:
      IDENTITY_REGISTRY,

    generatedAt:
      new Date().toISOString(),

    currentBlock:
      currentBlock.toString(),

    testAgent:
      TEST_AGENT_ID,

    knownAgentVerified,

    discoveryCapability,

    tests: {

      ownerOf:
        serialize(
          ownerResult
        ),

      tokenURI:
        serialize(
          tokenUriResult
        ),

      getAgentURI:
        serialize(
          agentUriResult
        ),

      agentWallet:
        serialize(
          walletResult
        ),

      balanceOf:
        serialize(
          balanceResult
        ),

    },

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
    "      V15.1 TEST TAMAMLANDI"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "📁 Dosya:"
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
        "❌ V15.1 kritik hata:"
      );

      console.error(
        error.shortMessage ||
        error.message
      );

      console.error("");

      process.exit(1);

    }
  );