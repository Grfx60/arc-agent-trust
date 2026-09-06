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


// ============================================
// SCAN RANGE
// ============================================

const START_AGENT_ID =
  844000;

const END_AGENT_ID =
  846000;


// ============================================
// PERFORMANCE
// ============================================

const CONCURRENCY =
  5;

const MAX_RETRIES =
  3;

const RETRY_DELAY_MS =
  1000;


// ============================================
// FILES
// ============================================

const CHECKPOINT_FILE =
  "agent-discovery-v17-checkpoint.json";

const OUTPUT_FILE =
  "agent-discovery-v17.json";


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


function normalizeAddress(
  address
) {

  if (
    typeof address !==
    "string"
  ) {

    return address;

  }

  return address.toLowerCase();

}


function isLikelyRpcError(
  error
) {

  const message =
    (
      error?.shortMessage ||
      error?.message ||
      ""
    ).toLowerCase();


  const rpcIndicators = [

    "rate limit",

    "request exceeds",

    "timeout",

    "timed out",

    "network",

    "fetch",

    "429",

    "503",

    "502",

    "504",

    "temporarily",

    "internal error",

  ];


  return rpcIndicators.some(
    indicator =>
      message.includes(
        indicator
      )
  );

}


// ============================================
// CHECKPOINT
// ============================================

function createEmptyCheckpoint() {

  return {

    schemaVersion:
      "1.7",

    startAgentId:
      START_AGENT_ID,

    endAgentId:
      END_AGENT_ID,

    lastProcessedAgentId:
      START_AGENT_ID - 1,

    status:
      "RUNNING",

    updatedAt:
      new Date().toISOString(),

  };

}


function loadCheckpoint() {

  if (
    !fs.existsSync(
      CHECKPOINT_FILE
    )
  ) {

    return createEmptyCheckpoint();

  }


  try {

    const data =
      JSON.parse(
        fs.readFileSync(
          CHECKPOINT_FILE,
          "utf8"
        )
      );


    if (
      data.startAgentId !==
        START_AGENT_ID ||
      data.endAgentId !==
        END_AGENT_ID
    ) {

      console.log(
        "⚠️ Eski checkpoint farklı range içeriyor."
      );

      console.log(
        "Yeni checkpoint oluşturuluyor."
      );

      return createEmptyCheckpoint();

    }


    return data;

  } catch (
    error
  ) {

    console.log(
      "⚠️ Checkpoint okunamadı."
    );

    console.log(
      "Yeni checkpoint oluşturuluyor."
    );


    return createEmptyCheckpoint();

  }

}


function saveCheckpoint(
  checkpoint
) {

  checkpoint.updatedAt =
    new Date().toISOString();


  fs.writeFileSync(

    CHECKPOINT_FILE,

    JSON.stringify(
      checkpoint,
      null,
      2
    ),

    "utf8"

  );

}


// ============================================
// SAFE CONTRACT READ
// ============================================

async function readContractWithRetry(
  functionName,
  agentId
) {

  let lastError =
    null;


  for (
    let attempt = 1;

    attempt <=
      MAX_RETRIES;

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

          args:
            [
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

    } catch (
      error
    ) {

      lastError =
        error;


      // --------------------------------------
      // RPC ERROR
      // --------------------------------------

      if (
        isLikelyRpcError(
          error
        )
      ) {

        if (
          attempt <
          MAX_RETRIES
        ) {

          await sleep(
            RETRY_DELAY_MS *
            attempt
          );

          continue;

        }


        return {

          status:
            "RPC_ERROR",

          error:
            error.shortMessage ||
            error.message,

          attempts:
            attempt,

        };

      }


      // --------------------------------------
      // CONTRACT REVERT
      //
      // ownerOf revert generally means
      // token/agent does not exist.
      // --------------------------------------

      return {

        status:
          "NOT_FOUND",

        error:
          error.shortMessage ||
          error.message,

        attempts:
          attempt,

      };

    }

  }


  return {

    status:
      "RPC_ERROR",

    error:
      lastError?.shortMessage ||
      lastError?.message ||
      "Unknown error",

    attempts:
      MAX_RETRIES,

  };

}


// ============================================
// AGENT SCAN
// ============================================

async function scanAgent(
  agentId
) {

  const ownerResult =
    await readContractWithRetry(

      "ownerOf",

      agentId

    );


  // ==========================================
  // NOT FOUND
  // ==========================================

  if (
    ownerResult.status ===
    "NOT_FOUND"
  ) {

    return {

      agentId,

      status:
        "NOT_FOUND",

      owner:
        null,

      tokenURI:
        null,

      ownerAttempts:
        ownerResult.attempts,

    };

  }


  // ==========================================
  // RPC ERROR
  // ==========================================

  if (
    ownerResult.status ===
    "RPC_ERROR"
  ) {

    return {

      agentId,

      status:
        "RPC_ERROR",

      owner:
        null,

      tokenURI:
        null,

      ownerError:
        ownerResult.error,

      ownerAttempts:
        ownerResult.attempts,

    };

  }


  // ==========================================
  // FOUND
  // ==========================================

  const owner =
    ownerResult.value;


  const uriResult =
    await readContractWithRetry(

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

  } else if (
    uriResult.status ===
    "RPC_ERROR"
  ) {

    tokenURIStatus =
      "RPC_ERROR";

  }


  return {

    agentId,

    status:
      "FOUND",

    owner,

    tokenURI,

    tokenURIStatus,

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
    "       AGENT DISCOVERY ENGINE v17"
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
    `Range: ${START_AGENT_ID} → ${END_AGENT_ID}`
  );

  console.log(
    "Concurrency:",
    CONCURRENCY
  );

  console.log(
    "Max retries:",
    MAX_RETRIES
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
  // CHECKPOINT
  // ========================================

  const checkpoint =
    loadCheckpoint();


  let resumeFrom =
    checkpoint.lastProcessedAgentId +
    1;


  if (
    resumeFrom <
    START_AGENT_ID
  ) {

    resumeFrom =
      START_AGENT_ID;

  }


  if (
    resumeFrom >
    END_AGENT_ID
  ) {

    resumeFrom =
      END_AGENT_ID + 1;

  }


  if (
    resumeFrom <=
    END_AGENT_ID
  ) {

    console.log(
      "▶️ Resume from Agent ID:",
      resumeFrom
    );

  } else {

    console.log(
      "ℹ️ Bu range daha önce tamamlanmış."
    );

  }

  console.log("");


  // ========================================
  // RESULTS
  // ========================================

  const agents =
    [];

  let checked =
    0;

  let found =
    0;

  let notFound =
    0;

  let rpcErrors =
    0;

  let tokenURIMissing =
    0;


  const total =
    END_AGENT_ID -
    START_AGENT_ID +
    1;


  const scanTotal =
    resumeFrom <=
    END_AGENT_ID

      ? END_AGENT_ID -
        resumeFrom +
        1

      : 0;


  // ========================================
  // SCAN LOOP
  // ========================================

  for (
    let start =
      resumeFrom;

    start <=
      END_AGENT_ID;

    start +=
      CONCURRENCY

  ) {

    const batch =
      [];


    for (
      let i =
        0;

      i <
        CONCURRENCY;

      i++

    ) {

      const agentId =
        start + i;


      if (
        agentId >
        END_AGENT_ID
      ) {

        break;

      }


      batch.push(
        agentId
      );

    }


    const results =
      await Promise.all(

        batch.map(
          scanAgent
        )

      );


    for (
      const result
      of results
    ) {

      checked++;


      if (
        result.status ===
        "FOUND"
      ) {

        found++;


        if (
          result.tokenURI ===
          null
        ) {

          tokenURIMissing++;

        }


        agents.push(
          result
        );


        console.log("");

        console.log(
          "🟢 AGENT FOUND"
        );

        console.log(
          "Agent ID:",
          result.agentId
        );

        console.log(
          "Owner:",
          result.owner
        );

        console.log(
          "URI:",
          result.tokenURI ||
          "NOT AVAILABLE"
        );

      } else if (
        result.status ===
        "RPC_ERROR"
      ) {

        rpcErrors++;

        console.log("");

        console.log(
          "🔴 RPC ERROR"
        );

        console.log(
          "Agent ID:",
          result.agentId
        );

        console.log(
          "Error:",
          result.ownerError
        );

      } else {

        notFound++;

      }

    }


    // ======================================
    // CHECKPOINT
    // ======================================

    const lastProcessed =
      batch[
        batch.length - 1
      ];


    checkpoint.lastProcessedAgentId =
      lastProcessed;

    checkpoint.status =
      "RUNNING";

    checkpoint.found =
      found;

    checkpoint.notFound =
      notFound;

    checkpoint.rpcErrors =
      rpcErrors;


    saveCheckpoint(
      checkpoint
    );


    const processed =
      lastProcessed -
      resumeFrom +
      1;


    const percentage =
      scanTotal > 0

        ? (
            processed /
            scanTotal *
            100
          ).toFixed(1)

        : "100.0";


    process.stdout.write(

      `\r🔎 Progress: ${processed}/${scanTotal} (${percentage}%) | FOUND: ${found} | RPC: ${rpcErrors}`

    );

  }


  console.log("");

  console.log("");


  // ========================================
  // RELATIONSHIPS
  // ========================================

  const ownerGroups =
    {};

  const uriGroups =
    {};


  for (
    const agent
    of agents
  ) {

    // --------------------------------------
    // OWNER
    // --------------------------------------

    if (
      agent.owner
    ) {

      const owner =
        normalizeAddress(
          agent.owner
        );


      if (
        !ownerGroups[owner]
      ) {

        ownerGroups[owner] =
          [];

      }


      ownerGroups[owner].push(
        agent.agentId
      );

    }


    // --------------------------------------
    // URI
    // --------------------------------------

    if (
      agent.tokenURI
    ) {

      const uri =
        agent.tokenURI;


      if (
        !uriGroups[uri]
      ) {

        uriGroups[uri] =
          [];

      }


      uriGroups[uri].push(
        agent.agentId
      );

    }

  }


  // ========================================
  // DUPLICATE OWNER RELATIONSHIPS
  // ========================================

  const sharedOwners =
    Object.entries(
      ownerGroups
    )
      .filter(
        (
          [
            owner,
            ids
          ]
        ) =>
          ids.length > 1
      )
      .map(
        (
          [
            owner,
            ids
          ]
        ) => ({

          owner,

          agentIds:
            ids,

          agentCount:
            ids.length,

        })
      );


  // ========================================
  // SHARED URI RELATIONSHIPS
  // ========================================

  const sharedURIs =
    Object.entries(
      uriGroups
    )
      .filter(
        (
          [
            uri,
            ids
          ]
        ) =>
          ids.length > 1
      )
      .map(
        (
          [
            uri,
            ids
          ]
        ) => ({

          uri,

          agentIds:
            ids,

          agentCount:
            ids.length,

        })
      );


  // ========================================
  // KNOWN AGENT
  // ========================================

  const knownAgent =
    agents.find(

      agent =>
        agent.agentId ===
        845265

    );


  // ========================================
  // CHECKPOINT COMPLETE
  // ========================================

  checkpoint.lastProcessedAgentId =
    END_AGENT_ID;

  checkpoint.status =
    "COMPLETE";

  checkpoint.completedAt =
    new Date().toISOString();

  checkpoint.total =
    total;

  checkpoint.found =
    found;

  checkpoint.notFound =
    notFound;

  checkpoint.rpcErrors =
    rpcErrors;

  checkpoint.tokenURIMissing =
    tokenURIMissing;


  saveCheckpoint(
    checkpoint
  );


  // ========================================
  // RESULT SUMMARY
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "           DISCOVERY RESULT"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "Total IDs:",
    total
  );

  console.log(
    "Checked:",
    checked
  );

  console.log(
    "Found:",
    found
  );

  console.log(
    "Not found:",
    notFound
  );

  console.log(
    "RPC errors:",
    rpcErrors
  );

  console.log(
    "Token URI missing:",
    tokenURIMissing
  );

  console.log("");


  // ========================================
  // RELATIONSHIP SUMMARY
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "        RELATIONSHIP ANALYSIS"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "Unique owners:",
    Object.keys(
      ownerGroups
    ).length
  );

  console.log(
    "Owners with multiple agents:",
    sharedOwners.length
  );

  console.log(
    "Shared metadata URIs:",
    sharedURIs.length
  );

  console.log("");


  // ========================================
  // KNOWN AGENT
  // ========================================

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
      "⚠️ Agent 845265 bu scan sonucunda bulunamadı."
    );

    console.log(
      "Bu sonuç tek başına agent yok anlamına gelmez."
    );

  }

  console.log("");


  // ========================================
  // OUTPUT
  // ========================================

  const output = {

    schemaVersion:
      "1.7",

    network:
      "Arc Testnet",

    identityRegistry:
      IDENTITY_REGISTRY,

    generatedAt:
      new Date().toISOString(),

    currentBlock:
      currentBlock.toString(),

    scan: {

      startAgentId:
        START_AGENT_ID,

      endAgentId:
        END_AGENT_ID,

      totalIds:
        total,

      checked,

      concurrency:
        CONCURRENCY,

      maxRetries:
        MAX_RETRIES,

    },

    summary: {

      found,

      notFound,

      rpcErrors,

      tokenURIMissing,

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

    relationships: {

      uniqueOwners:
        Object.keys(
          ownerGroups
        ).length,

      sharedOwners,

      sharedURIs,

    },

    agents,

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
    "       AGENT DISCOVERY v17 TAMAMLANDI"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "📁 Ana çıktı:"
  );

  console.log(
    OUTPUT_FILE
  );

  console.log("");

  console.log(
    "📁 Checkpoint:"
  );

  console.log(
    CHECKPOINT_FILE
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
        "❌ V17 kritik hata:"
      );

      console.error(
        error.shortMessage ||
        error.message
      );

      console.error("");

      process.exit(1);

    }
  );