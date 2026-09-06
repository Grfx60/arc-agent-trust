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

const INPUT_FILE =
  "agent-discovery-v17.json";

const OUTPUT_FILE =
  "agent-discovery-v18-recovery.json";

const MAX_RETRIES =
  5;

const BASE_DELAY_MS =
  2000;


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
  ]);


// ============================================
// HELPERS
// ============================================

function sleep(ms) {
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}


function getErrorMessage(error) {
  return (
    error?.shortMessage ||
    error?.message ||
    "Unknown error"
  );
}


// ============================================
// SAFE READ
// ============================================

async function readWithRetry(
  functionName,
  agentId
) {

  let lastError = null;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {

    try {

      const value =
        await client.readContract({

          address:
            IDENTITY_REGISTRY,

          abi:
            identityAbi,

          functionName,

          args: [
            BigInt(agentId)
          ],

        });


      return {

        status:
          "OK",

        value,

        attempts:
          attempt,

      };

    } catch (error) {

      lastError =
        getErrorMessage(error);


      console.log(
        `      ⚠️ ${functionName} | attempt ${attempt}/${MAX_RETRIES}`
      );

      console.log(
        `         ${lastError}`
      );


      if (
        attempt <
        MAX_RETRIES
      ) {

        const delay =
          BASE_DELAY_MS *
          Math.pow(
            2,
            attempt - 1
          );

        await sleep(delay);

      }

    }

  }


  return {

    status:
      "FAILED",

    error:
      lastError,

    attempts:
      MAX_RETRIES,

  };

}


// ============================================
// RECOVER AGENT
// ============================================

async function recoverAgent(
  agentId
) {

  console.log("");
  console.log(
    `🔎 Recovering Agent ${agentId}`
  );


  // ==========================================
  // OWNER
  // ==========================================

  const ownerResult =
    await readWithRetry(
      "ownerOf",
      agentId
    );


  if (
    ownerResult.status !==
    "OK"
  ) {

    return {

      agentId,

      status:
        "STILL_FAILED",

      owner:
        null,

      tokenURI:
        null,

      error:
        ownerResult.error,

      ownerAttempts:
        ownerResult.attempts,

    };

  }


  const owner =
    ownerResult.value;


  console.log(
    `   🟢 OWNER FOUND: ${owner}`
  );


  // ==========================================
  // TOKEN URI
  // ==========================================

  const uriResult =
    await readWithRetry(
      "tokenURI",
      agentId
    );


  let tokenURI =
    null;

  let tokenURIStatus =
    "NOT_AVAILABLE";

  let tokenURIAttempts =
    uriResult.attempts;


  if (
    uriResult.status ===
    "OK"
  ) {

    tokenURI =
      uriResult.value;

    tokenURIStatus =
      "OK";

    console.log(
      `   🟢 URI: ${tokenURI}`
    );

  } else {

    tokenURIStatus =
      "FAILED";

    console.log(
      "   ⚠️ Owner bulundu fakat tokenURI okunamadı."
    );

  }


  return {

    agentId,

    status:
      "RECOVERED",

    owner,

    tokenURI,

    tokenURIStatus,

    ownerAttempts:
      ownerResult.attempts,

    tokenURIAttempts,

  };

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
    "     AGENT DISCOVERY RECOVERY v18"
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


  // ========================================
  // LOAD V17
  // ========================================

  if (
    !fs.existsSync(
      INPUT_FILE
    )
  ) {

    throw new Error(
      `V17 dosyası bulunamadı: ${INPUT_FILE}`
    );

  }


  const v17 =
    JSON.parse(
      fs.readFileSync(
        INPUT_FILE,
        "utf8"
      )
    );


  // ========================================
  // FIND RPC ERRORS
  // ========================================

  const rpcAgents =
    (
      v17.agents ||
      []
    )
      .filter(
        agent =>
          agent.status ===
          "RPC_ERROR"
      );


  console.log(
    "=========================================="
  );

  console.log(
    "          V17 RPC ERROR DATA"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "RPC error agents:",
    rpcAgents.length
  );

  console.log("");


  if (
    rpcAgents.length ===
    0
  ) {

    console.log(
      "🟢 Recovery gerektiren RPC error yok."
    );

    return;

  }


  // ========================================
  // CURRENT BLOCK
  // ========================================

  const currentBlock =
    await client.getBlockNumber();


  console.log(
    "Current block:",
    currentBlock.toString()
  );

  console.log("");


  // ========================================
  // RECOVERY
  // ========================================

  const recovered =
    [];

  const stillFailed =
    [];


  for (
    let i = 0;
    i < rpcAgents.length;
    i++
  ) {

    const agent =
      rpcAgents[i];


    console.log(
      "------------------------------------------"
    );

    console.log(
      `Progress: ${i + 1}/${rpcAgents.length}`
    );


    const result =
      await recoverAgent(
        agent.agentId
      );


    if (
      result.status ===
      "RECOVERED"
    ) {

      recovered.push(
        result
      );

    } else {

      stillFailed.push(
        result
      );

    }

  }


  // ========================================
  // MERGE
  // ========================================

  const originalAgents =
    (
      v17.agents ||
      []
    )
      .filter(
        agent =>
          agent.status !==
          "RPC_ERROR"
      );


  const recoveredAgents =
    recovered.map(
      item => ({

        agentId:
          item.agentId,

        status:
          "FOUND",

        owner:
          item.owner,

        tokenURI:
          item.tokenURI,

        tokenURIStatus:
          item.tokenURIStatus,

        recovery:
          true,

        recoveryAttempts:
          item.ownerAttempts,

      })
    );


  const finalAgents =
    [
      ...originalAgents,
      ...recoveredAgents,
    ]
      .sort(
        (
          a,
          b
        ) =>
          Number(a.agentId) -
          Number(b.agentId)
      );


  // ========================================
  // SUMMARY
  // ========================================

  const originalFound =
    (
      v17.agents ||
      []
    )
      .filter(
        agent =>
          agent.status ===
          "FOUND"
      )
      .length;


  const originalNotFound =
    (
      v17.agents ||
      []
    )
      .filter(
        agent =>
          agent.status ===
          "NOT_FOUND"
      )
      .length;


  const finalFound =
    finalAgents.filter(
      agent =>
        agent.status ===
        "FOUND"
    ).length;


  // ========================================
  // OUTPUT
  // ========================================

  const output = {

    schemaVersion:
      "1.8",

    network:
      "Arc Testnet",

    identityRegistry:
      IDENTITY_REGISTRY,

    source:
      INPUT_FILE,

    generatedAt:
      new Date().toISOString(),

    currentBlock:
      currentBlock.toString(),

    recovery: {

      sourceRpcErrors:
        rpcAgents.length,

      recovered:
        recovered.length,

      stillFailed:
        stillFailed.length,

      maxRetries:
        MAX_RETRIES,

      baseDelayMs:
        BASE_DELAY_MS,

    },

    summary: {

      originalFound,

      originalNotFound,

      originalRpcErrors:
        rpcAgents.length,

      recovered:
        recovered.length,

      stillFailed:
        stillFailed.length,

      finalFound,

      finalNotFound:
        originalNotFound,

    },

    knownAgent: {

      agentId:
        845265,

      found:
        finalAgents.some(
          agent =>
            Number(agent.agentId) ===
            845265
        ),

      record:
        finalAgents.find(
          agent =>
            Number(agent.agentId) ===
            845265
        ) ||
        null,

    },

    recoveredAgents:
      recovered,

    stillFailedAgents:
      stillFailed,

    agents:
      finalAgents,

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
  // RESULT
  // ========================================

  console.log("");
  console.log(
    "=========================================="
  );

  console.log(
    "       RECOVERY RESULT"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "V17 RPC errors:",
    rpcAgents.length
  );

  console.log(
    "Recovered:",
    recovered.length
  );

  console.log(
    "Still failed:",
    stillFailed.length
  );

  console.log("");

  console.log(
    "Original FOUND:",
    originalFound
  );

  console.log(
    "Final FOUND:",
    finalFound
  );

  console.log(
    "Final NOT_FOUND:",
    originalNotFound
  );

  console.log("");


  // ========================================
  // KNOWN AGENT
  // ========================================

  const knownAgent =
    finalAgents.find(
      agent =>
        Number(agent.agentId) ===
        845265
    );


  console.log(
    "=========================================="
  );

  console.log(
    "       KNOWN AGENT 845265"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  if (
    knownAgent
  ) {

    console.log(
      "🟢 845265 FOUND"
    );

    console.log(
      "Owner:",
      knownAgent.owner
    );

    console.log(
      "URI:",
      knownAgent.tokenURI ||
      "NOT AVAILABLE"
    );

  } else {

    console.log(
      "🔴 845265 hâlâ bulunamadı."
    );

  }


  console.log("");

  console.log(
    "📁 Recovery dosyası:"
  );

  console.log(
    OUTPUT_FILE
  );

  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "     AGENT DISCOVERY RECOVERY TAMAMLANDI"
  );

  console.log(
    "=========================================="
  );

}


main()
  .catch(
    error => {

      console.error("");
      console.error(
        "❌ V18 kritik hata:"
      );

      console.error(
        error.message ||
        error
      );

      console.error("");

      process.exit(1);

    }
  );