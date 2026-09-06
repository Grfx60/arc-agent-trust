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
  "agent-discovery-v18-1.json";

const START_AGENT_ID =
  844000;

const END_AGENT_ID =
  846000;

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


function errorMessage(error) {
  return (
    error?.shortMessage ||
    error?.message ||
    "Unknown error"
  );
}


// ============================================
// CONTRACT READ
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
        status: "OK",
        value,
        attempts: attempt,
      };

    } catch (error) {

      lastError =
        errorMessage(error);


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
    status: "FAILED",
    error: lastError,
    attempts: MAX_RETRIES,
  };

}


// ============================================
// RECOVERY READ
// ============================================

async function recoverAgent(
  agentId
) {

  console.log(
    `\n🔎 Recovery → Agent ${agentId}`
  );


  const ownerResult =
    await readWithRetry(
      "ownerOf",
      agentId
    );


  if (
    ownerResult.status !==
    "OK"
  ) {

    console.log(
      `   🔴 OWNER FAILED`
    );

    return {

      agentId,

      status:
        "STILL_UNKNOWN",

      owner:
        null,

      tokenURI:
        null,

      error:
        ownerResult.error,

      attempts:
        ownerResult.attempts,

    };

  }


  const owner =
    ownerResult.value;


  console.log(
    `   🟢 OWNER: ${owner}`
  );


  const uriResult =
    await readWithRetry(
      "tokenURI",
      agentId
    );


  let tokenURI =
    null;

  let tokenURIStatus =
    "NOT_AVAILABLE";


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
      `   🟡 URI okunamadı`
    );

  }


  return {

    agentId,

    status:
      "FOUND",

    owner,

    tokenURI,

    tokenURIStatus,

    recovery:
      true,

    ownerAttempts:
      ownerResult.attempts,

    tokenURIAttempts:
      uriResult.attempts,

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
    "    DISCOVERY AUDIT & RECOVERY v18.1"
  );
  console.log(
    "=========================================="
  );
  console.log("");

  console.log(
    "Input:",
    INPUT_FILE
  );

  console.log(
    "Range:",
    `${START_AGENT_ID} → ${END_AGENT_ID}`
  );

  console.log("");


  // ==========================================
  // LOAD V17
  // ==========================================

  if (
    !fs.existsSync(
      INPUT_FILE
    )
  ) {

    throw new Error(
      `Dosya bulunamadı: ${INPUT_FILE}`
    );

  }


  const v17 =
    JSON.parse(
      fs.readFileSync(
        INPUT_FILE,
        "utf8"
      )
    );


  const agents =
    Array.isArray(
      v17.agents
    )
      ? v17.agents
      : [];


  // ==========================================
  // DATASET AUDIT
  // ==========================================

  console.log(
    "=========================================="
  );

  console.log(
    "          DATASET INTEGRITY AUDIT"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  const totalRange =
    END_AGENT_ID -
    START_AGENT_ID +
    1;


  const foundRecords =
    agents.filter(
      agent =>
        agent.status ===
        "FOUND"
    );


  const notFoundRecords =
    agents.filter(
      agent =>
        agent.status ===
        "NOT_FOUND"
    );


  const rpcRecords =
    agents.filter(
      agent =>
        agent.status ===
        "RPC_ERROR"
    );


  const knownIds =
    new Set(
      agents.map(
        agent =>
          Number(
            agent.agentId
          )
      )
    );


  const duplicateIds =
    agents
      .map(
        agent =>
          Number(
            agent.agentId
          )
      )
      .filter(
        (id, index, array) =>
          array.indexOf(id) !==
          index
      );


  const missingIds =
    [];


  for (
    let id =
      START_AGENT_ID;

    id <=
    END_AGENT_ID;

    id++
  ) {

    if (
      !knownIds.has(id)
    ) {

      missingIds.push(id);

    }

  }


  console.log(
    "Expected IDs:",
    totalRange
  );

  console.log(
    "JSON records:",
    agents.length
  );

  console.log(
    "FOUND:",
    foundRecords.length
  );

  console.log(
    "NOT_FOUND:",
    notFoundRecords.length
  );

  console.log(
    "RPC_ERROR records:",
    rpcRecords.length
  );

  console.log(
    "Missing IDs:",
    missingIds.length
  );

  console.log(
    "Duplicate IDs:",
    duplicateIds.length
  );

  console.log("");


  // ==========================================
  // IMPORTANT DATASET CHECK
  // ==========================================

  const accounted =
    foundRecords.length +
    notFoundRecords.length +
    rpcRecords.length;


  console.log(
    "Accounted records:",
    accounted
  );

  console.log(
    "Expected records:",
    totalRange
  );

  console.log("");


  if (
    accounted ===
    totalRange
  ) {

    console.log(
      "🟢 Status: DATASET COMPLETE"
    );

  } else {

    console.log(
      "🟡 Status: DATASET INCOMPLETE"
    );

    console.log(
      `   ${totalRange - accounted} kayıt sınıflandırılmamış.`
    );

  }


  // ==========================================
  // BUILD RECOVERY LIST
  // ==========================================

  const recoveryIds =
    [
      ...new Set(
        [
          ...rpcRecords.map(
            agent =>
              Number(
                agent.agentId
              )
          ),

          ...missingIds,

        ]
      )
    ]
      .sort(
        (a, b) =>
          a - b
      );


  console.log("");
  console.log(
    "=========================================="
  );

  console.log(
    "           RECOVERY TARGET"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "RPC_ERROR targets:",
    rpcRecords.length
  );

  console.log(
    "Missing-ID targets:",
    missingIds.length
  );

  console.log(
    "Unique recovery targets:",
    recoveryIds.length
  );

  console.log("");


  if (
    recoveryIds.length ===
    0
  ) {

    console.log(
      "🟢 Recovery target yok."
    );

  }


  // ==========================================
  // CURRENT BLOCK
  // ==========================================

  const currentBlock =
    await client.getBlockNumber();


  console.log(
    "Current block:",
    currentBlock.toString()
  );

  console.log("");


  // ==========================================
  // RECOVERY
  // ==========================================

  const recovered =
    [];

  const stillUnknown =
    [];


  for (
    let i = 0;
    i < recoveryIds.length;
    i++
  ) {

    const agentId =
      recoveryIds[i];


    console.log(
      `\nProgress: ${i + 1}/${recoveryIds.length}`
    );


    const result =
      await recoverAgent(
        agentId
      );


    if (
      result.status ===
      "FOUND"
    ) {

      recovered.push(
        result
      );

    } else {

      stillUnknown.push(
        result
      );

    }

  }


  // ==========================================
  // MERGE DATA
  // ==========================================

  const originalById =
    new Map();


  for (
    const agent
    of agents
  ) {

    originalById.set(
      Number(
        agent.agentId
      ),
      agent
    );

  }


  for (
    const result
    of recovered
  ) {

    originalById.set(
      Number(
        result.agentId
      ),
      result
    );

  }


  const finalAgents =
    Array.from(
      originalById.values()
    )
      .sort(
        (a, b) =>
          Number(a.agentId) -
          Number(b.agentId)
      );


  // ==========================================
  // FINAL COUNTS
  // ==========================================

  const finalFound =
    finalAgents.filter(
      agent =>
        agent.status ===
        "FOUND"
    ).length;


  const finalNotFound =
    finalAgents.filter(
      agent =>
        agent.status ===
        "NOT_FOUND"
    ).length;


  const finalUnknown =
    stillUnknown.length;


  // ==========================================
  // KNOWN AGENT
  // ==========================================

  const knownAgent =
    finalAgents.find(
      agent =>
        Number(
          agent.agentId
        ) ===
        845265
    );


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "1.8.1",

    network:
      "Arc Testnet",

    identityRegistry:
      IDENTITY_REGISTRY,

    generatedAt:
      new Date().toISOString(),

    source:
      INPUT_FILE,

    currentBlock:
      currentBlock.toString(),

    audit: {

      expectedIds:
        totalRange,

      jsonRecords:
        agents.length,

      originalFound:
        foundRecords.length,

      originalNotFound:
        notFoundRecords.length,

      originalRpcErrors:
        rpcRecords.length,

      missingIds:
        missingIds.length,

      duplicateIds:
        duplicateIds.length,

      accountedRecords:
        accounted,

      datasetComplete:
        accounted ===
        totalRange,

    },

    recovery: {

      rpcErrorTargets:
        rpcRecords.length,

      missingIdTargets:
        missingIds.length,

      totalTargets:
        recoveryIds.length,

      recovered:
        recovered.length,

      stillUnknown:
        stillUnknown.length,

      maxRetries:
        MAX_RETRIES,

    },

    final: {

      found:
        finalFound,

      notFound:
        finalNotFound,

      unknown:
        finalUnknown,

      coverage:

        Number(
          (
            (
              finalFound +
              finalNotFound
            ) /
            totalRange
          ) *
          100
        ).toFixed(2),

    },

    knownAgent: {

      agentId:
        845265,

      found:
        Boolean(
          knownAgent
        ),

      record:
        knownAgent ||
        null,

    },

    missingIds,

    duplicateIds,

    recovered,

    stillUnknown,

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


  // ==========================================
  // FINAL REPORT
  // ==========================================

  console.log("");
  console.log(
    "=========================================="
  );

  console.log(
    "         V18.1 FINAL RESULT"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "Expected IDs:",
    totalRange
  );

  console.log(
    "Original JSON records:",
    agents.length
  );

  console.log(
    "Original FOUND:",
    foundRecords.length
  );

  console.log(
    "Original NOT_FOUND:",
    notFoundRecords.length
  );

  console.log(
    "Original RPC_ERROR:",
    rpcRecords.length
  );

  console.log(
    "Missing IDs:",
    missingIds.length
  );

  console.log("");

  console.log(
    "Recovery targets:",
    recoveryIds.length
  );

  console.log(
    "Recovered:",
    recovered.length
  );

  console.log(
    "Still UNKNOWN:",
    stillUnknown.length
  );

  console.log("");

  console.log(
    "FINAL FOUND:",
    finalFound
  );

  console.log(
    "FINAL NOT_FOUND:",
    finalNotFound
  );

  console.log(
    "FINAL UNKNOWN:",
    finalUnknown
  );

  console.log(
    "FINAL COVERAGE:",
    `${output.final.coverage}%`
  );

  console.log("");


  // ==========================================
  // KNOWN AGENT
  // ==========================================

  console.log(
    "=========================================="
  );

  console.log(
    "         KNOWN AGENT 845265"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  if (
    knownAgent
  ) {

    console.log(
      "🟢 Agent 845265 FOUND"
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
      "🔴 Agent 845265 datasette bulunamadı."
    );

  }


  console.log("");

  console.log(
    "📁 Output:"
  );

  console.log(
    OUTPUT_FILE
  );

  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "       V18.1 TAMAMLANDI"
  );

  console.log(
    "=========================================="
  );

}


// ============================================
// START
// ============================================

main()
  .catch(
    error => {

      console.error("");
      console.error(
        "❌ V18.1 kritik hata:"
      );

      console.error(
        error.message ||
        error
      );

      console.error("");

      process.exit(1);

    }
  );