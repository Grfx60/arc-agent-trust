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


// IMPORTANT:
// This is the ERC-8004 Identity Registry
// on Arc Testnet.

const IDENTITY_REGISTRY =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e";


const TEST_AGENT_ID =
  845265;


const OUTPUT_FILE =
  "agent-registry-discovery-v15.json";


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

    "function ownerOf(uint256 agentId) view returns (address)",

    "function getAgentURI(uint256 agentId) view returns (string)",

    "function balanceOf(address owner) view returns (uint256)",

    "function getMetadata(uint256 agentId, string metadataKey) view returns (bytes)",

  ]);


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
    "     IDENTITY REGISTRY TEST v15"
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
  // BLOCK
  // ========================================

  const currentBlock =
    await client.getBlockNumber();


  console.log(
    "📦 Current block:",
    currentBlock.toString()
  );

  console.log("");


  // ========================================
  // TEST 1
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
  // TEST 2
  // AGENT URI
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "        TEST 2 — AGENT URI"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  const uriResult =
    await safeRead(

      "getAgentURI",

      [
        BigInt(
          TEST_AGENT_ID
        )
      ]

    );


  if (
    uriResult.status ===
    "OK"
  ) {

    console.log(
      "✅ getAgentURI:"
    );

    console.log(
      uriResult.value
    );

  } else {

    console.log(
      "❌ getAgentURI:"
    );

    console.log(
      uriResult.error
    );

  }

  console.log("");


  // ========================================
  // TEST 3
  // METADATA
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "       TEST 3 — METADATA"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  const metadataResult =
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
    metadataResult.status ===
    "OK"
  ) {

    console.log(
      "✅ getMetadata(agentWallet)"
    );

    console.log(
      metadataResult.value
    );

  } else {

    console.log(
      "⚠️ Metadata okunamadı:"
    );

    console.log(
      metadataResult.error
    );

  }

  console.log("");


  // ========================================
  // TEST 4
  // OWNER BALANCE
  // ========================================

  let balanceResult = {

    status:
      "SKIPPED"

  };


  if (
    ownerResult.status ===
    "OK"
  ) {

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

    console.log("");

  }


  // ========================================
  // SUMMARY
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "             V15 SUMMARY"
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
    "getAgentURI:",
    uriResult.status
  );

  console.log(
    "getMetadata:",
    metadataResult.status
  );

  console.log(
    "balanceOf:",
    balanceResult.status
  );

  console.log("");


  // ========================================
  // VALIDATION
  // ========================================

  let knownAgentVerified =
    false;


  if (
    ownerResult.status ===
    "OK"
  ) {

    const expectedOwner =
      "0xBB30e40F0887b060e9339f6541E29AfA5A3A9dBb";


    if (
      ownerResult.value.toLowerCase() ===
      expectedOwner.toLowerCase()
    ) {

      knownAgentVerified =
        true;

    }

  }


  console.log(
    "=========================================="
  );

  console.log(
    "       KNOWN AGENT VALIDATION"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  if (
    knownAgentVerified
  ) {

    console.log(
      "🟢 Agent 845265 doğrulandı."
    );

    console.log(
      "Registry → Owner eşleşiyor."
    );

  } else {

    console.log(
      "🔴 Agent 845265 doğrulanamadı."
    );

  }

  console.log("");


  // ========================================
  // DISCOVERY CAPABILITY
  // ========================================

  let discoveryCapability =
    "UNKNOWN";


  if (
    ownerResult.status ===
      "OK" &&
    uriResult.status ===
      "OK"
  ) {

    discoveryCapability =
      "DIRECT_IDENTITY_READ";

  } else {

    discoveryCapability =
      "IDENTITY_READ_INCOMPLETE";

  }


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
      "1.5",

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

    tests: {

      ownerOf:
        ownerResult,

      getAgentURI:
        uriResult,

      getMetadata:
        metadataResult,

      balanceOf:
        balanceResult,

    },

    discoveryCapability,

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
    "       IDENTITY REGISTRY TEST TAMAMLANDI"
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
        "❌ V15 kritik hata:"
      );

      console.error(
        error.shortMessage ||
        error.message
      );

      console.error("");

      process.exit(1);

    }
  );