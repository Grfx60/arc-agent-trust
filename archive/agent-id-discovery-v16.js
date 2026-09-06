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
// TEST RANGE
// ============================================

const START_AGENT_ID =
  844000;

const END_AGENT_ID =
  846000;


const OUTPUT_FILE =
  "agent-id-discovery-v16.json";


// ============================================
// CONCURRENCY
// ============================================
//
// Aynı anda kaç agent sorgulanacak.
//
// Çok yüksek tutmuyoruz.
// RPC'yi gereksiz zorlamıyoruz.
//

const CONCURRENCY =
  5;


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
// SAFE AGENT READ
// ============================================

async function readAgent(
  agentId
) {

  try {

    const owner =
      await client.readContract({

        address:
          IDENTITY_REGISTRY,

        abi:
          identityAbi,

        functionName:
          "ownerOf",

        args:
          [
            BigInt(agentId)
          ],

      });


    let tokenURI =
      null;


    try {

      tokenURI =
        await client.readContract({

          address:
            IDENTITY_REGISTRY,

          abi:
            identityAbi,

          functionName:
            "tokenURI",

          args:
            [
              BigInt(agentId)
            ],

        });

    } catch (
      error
    ) {

      tokenURI =
        null;

    }


    return {

      found:
        true,

      agentId,

      owner,

      tokenURI,

    };


  } catch (
    error
  ) {

    return {

      found:
        false,

      agentId,

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
    "       AGENT ID DISCOVERY ENGINE v16"
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
    "Start Agent ID:",
    START_AGENT_ID
  );

  console.log(
    "End Agent ID:",
    END_AGENT_ID
  );

  console.log(
    "Range size:",
    END_AGENT_ID -
    START_AGENT_ID +
    1
  );

  console.log(
    "Concurrency:",
    CONCURRENCY
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
  // STORAGE
  // ========================================

  const discoveredAgents =
    [];

  let checked =
    0;

  let failed =
    0;


  const total =
    END_AGENT_ID -
    START_AGENT_ID +
    1;


  // ========================================
  // BATCH LOOP
  // ========================================

  for (
    let start =
      START_AGENT_ID;

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
          readAgent
        )

      );


    for (
      const result
      of results
    ) {

      checked++;


      if (
        result.found
      ) {

        discoveredAgents.push(
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
          "Token URI:",
          result.tokenURI ||
          "NOT AVAILABLE"
        );

      }

    }


    // ======================================
    // PROGRESS
    // ======================================

    const percentage =
      (
        checked /
        total *
        100
      ).toFixed(1);


    process.stdout.write(
      `\r🔎 Progress: ${checked}/${total} (${percentage}%)`
    );

  }


  console.log("");

  console.log("");


  // ========================================
  // RESULT
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "          DISCOVERY RESULT"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "Range:",
    `${START_AGENT_ID} → ${END_AGENT_ID}`
  );

  console.log(
    "Total IDs:",
    total
  );

  console.log(
    "Checked:",
    checked
  );

  console.log(
    "Discovered agents:",
    discoveredAgents.length
  );

  console.log("");


  // ========================================
  // AGENT LIST
  // ========================================

  console.log(
    "=========================================="
  );

  console.log(
    "          DISCOVERED AGENTS"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  if (
    discoveredAgents.length ===
    0
  ) {

    console.log(
      "⚠️ Agent bulunamadı."
    );

  } else {

    for (
      const agent
      of discoveredAgents
    ) {

      console.log(
        `Agent ${agent.agentId}`
      );

      console.log(
        `  Owner: ${agent.owner}`
      );

      console.log(
        `  URI: ${agent.tokenURI || "N/A"}`
      );

      console.log("");

    }

  }


  // ========================================
  // KNOWN AGENT CHECK
  // ========================================

  const knownAgent =
    discoveredAgents.find(

      agent =>
        agent.agentId ===
        845265

    );


  console.log(
    "=========================================="
  );

  console.log(
    "        KNOWN AGENT VALIDATION"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  if (
    knownAgent
  ) {

    console.log(
      "🟢 Agent 845265 bulundu."
    );

    console.log(
      "Discovery yöntemi doğrulandı."
    );

  } else {

    console.log(
      "🔴 Agent 845265 bulunamadı."
    );

    console.log(
      "Discovery yöntemi henüz doğrulanmadı."
    );

  }

  console.log("");


  // ========================================
  // OUTPUT
  // ========================================

  const output = {

    schemaVersion:
      "1.6",

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

    },

    validation: {

      knownAgent:
        845265,

      knownAgentFound:
        Boolean(
          knownAgent
        ),

    },

    agents:
      discoveredAgents,

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
    "      AGENT DISCOVERY v16 TAMAMLANDI"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "📁 Discovery dosyası:"
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
        "❌ V16 kritik hata:"
      );

      console.error(
        error.shortMessage ||
        error.message
      );

      console.error("");

      process.exit(1);

    }
  );