const { createPublicClient, http } = require("viem");
const fs = require("fs");

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
      http: ["https://rpc.testnet.arc.network"],
    },
  },
};

const REGISTRY =
  "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";

const TARGET_AGENT = 845265n;

const CURRENT_VALIDATOR =
  "0xe18f822b5071553d62cf119ce57da6c1636f2524";

const abi = [
  {
    name: "getValidatorRequests",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "validatorAddress",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "requestHashes",
        type: "bytes32[]",
      },
    ],
  },

  {
    name: "getValidationStatus",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "requestHash",
        type: "bytes32",
      },
    ],
    outputs: [
      {
        name: "validatorAddress",
        type: "address",
      },
      {
        name: "agentId",
        type: "uint256",
      },
      {
        name: "response",
        type: "uint8",
      },
      {
        name: "responseHash",
        type: "bytes32",
      },
      {
        name: "tag",
        type: "string",
      },
      {
        name: "lastUpdate",
        type: "uint256",
      },
    ],
  },
];

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

function sleep(ms) {
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}

function normalize(value) {
  return String(value).toLowerCase();
}

function loadJson(file) {
  if (!fs.existsSync(file)) {
    return null;
  }

  try {
    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch {
    return null;
  }
}

async function main() {

  console.log("");
  console.log("==========================================");
  console.log(" VALIDATOR RELATIONSHIP FORENSICS v50");
  console.log("==========================================");
  console.log("");

  console.log(
    "Network: Arc Testnet"
  );

  console.log(
    "Target Agent:",
    TARGET_AGENT.toString()
  );

  console.log(
    "Validator:",
    CURRENT_VALIDATOR
  );

  console.log(
    "Registry:",
    REGISTRY
  );

  console.log("");


  // ==================================================
  // RPC
  // ==================================================

  console.log("==========================================");
  console.log("          RPC CONNECTIVITY");
  console.log("==========================================");
  console.log("");

  const chainId =
    await client.getChainId();

  const latestBlock =
    await client.getBlockNumber();

  console.log(
    "Chain ID:",
    chainId
  );

  console.log(
    "Latest block:",
    latestBlock.toString()
  );

  console.log("");


  // ==================================================
  // GET VALIDATOR REQUESTS
  // ==================================================

  console.log("==========================================");
  console.log("       VALIDATOR REQUEST HISTORY");
  console.log("==========================================");
  console.log("");

  let requestHashes;

  try {

    requestHashes =
      await client.readContract({
        address:
          REGISTRY,

        abi,

        functionName:
          "getValidatorRequests",

        args: [
          CURRENT_VALIDATOR
        ],
      });

  } catch (error) {

    console.log(
      "Registry query failed:"
    );

    console.log(
      error.message
    );

    process.exit(1);
  }

  console.log(
    "Total requests:",
    requestHashes.length
  );

  console.log("");


  // ==================================================
  // READ RECORDS
  // ==================================================

  const records = [];

  let readErrors = 0;

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
            REGISTRY,

          abi,

          functionName:
            "getValidationStatus",

          args: [
            requestHash
          ],
        });

      const [
        validatorAddress,
        agentId,
        response,
        responseHash,
        tag,
        lastUpdate,
      ] = result;

      records.push({

        requestHash,

        validatorAddress,

        agentId:
          agentId.toString(),

        response:
          Number(response),

        responseHash,

        tag:
          tag || "",

        lastUpdate:
          lastUpdate.toString(),

      });

    } catch {

      readErrors++;

    }

    if (
      (i + 1) % 50 === 0 ||
      i === requestHashes.length - 1
    ) {

      console.log(
        `Progress: ${i + 1}/${requestHashes.length} | Records: ${records.length} | Errors: ${readErrors}`
      );

    }

    await sleep(15);
  }


  // ==================================================
  // UNIQUE AGENTS
  // ==================================================

  const uniqueAgents = [
    ...new Set(
      records.map(
        x => x.agentId
      )
    )
  ];


  // ==================================================
  // TARGET RECORDS
  // ==================================================

  const targetRecords =
    records.filter(
      x =>
        x.agentId ===
        TARGET_AGENT.toString()
    );


  // ==================================================
  // RESPONSE DISTRIBUTION
  // ==================================================

  const responseCounts = {};

  for (
    const record of records
  ) {

    const value =
      String(
        record.response
      );

    responseCounts[value] =
      (
        responseCounts[value] ||
        0
      ) + 1;

  }


  // ==================================================
  // TAG DISTRIBUTION
  // ==================================================

  const tagCounts = {};

  for (
    const record of records
  ) {

    const tag =
      record.tag ||
      "(empty)";

    tagCounts[tag] =
      (
        tagCounts[tag] ||
        0
      ) + 1;

  }


  // ==================================================
  // RESPONSE SEQUENCES BY AGENT
  // ==================================================

  const byAgent = {};

  for (
    const record of records
  ) {

    if (
      !byAgent[record.agentId]
    ) {

      byAgent[record.agentId] =
        [];

    }

    byAgent[record.agentId].push(
      record
    );

  }


  const agentBehavior = [];

  for (
    const [agentId, agentRecords]
    of Object.entries(byAgent)
  ) {

    const ordered =
      [...agentRecords].sort(
        (a, b) =>
          Number(a.lastUpdate) -
          Number(b.lastUpdate)
      );


    const responses =
      ordered.map(
        x => x.response
      );


    const hasLow =
      responses.some(
        x => x <= 10
      );

    const hasHigh =
      responses.some(
        x => x >= 90
      );

    const lowToHigh =
      responses.some(
        (value, index) => {

          if (
            index === 0
          ) {
            return false;
          }

          return (
            responses[index - 1] <= 10 &&
            value >= 90
          );

        }
      );


    agentBehavior.push({

      agentId,

      records:
        ordered.length,

      minResponse:
        Math.min(...responses),

      maxResponse:
        Math.max(...responses),

      averageResponse:
        responses.reduce(
          (a, b) => a + b,
          0
        ) /
        responses.length,

      lowToHigh,

    });

  }


  const lowToHighAgents =
    agentBehavior.filter(
      x =>
        x.lowToHigh
    );


  // ==================================================
  // TARGET TIMELINE
  // ==================================================

  const targetTimeline =
    [...targetRecords].sort(
      (a, b) =>
        Number(a.lastUpdate) -
        Number(b.lastUpdate)
    );


  let targetLowToHigh =
    false;


  for (
    let i = 1;
    i < targetTimeline.length;
    i++
  ) {

    if (
      targetTimeline[i - 1].response <= 10 &&
      targetTimeline[i].response >= 90
    ) {

      targetLowToHigh =
        true;

    }

  }


  // ==================================================
  // VALIDATOR CONCENTRATION
  // ==================================================

  const targetRatio =
    records.length > 0
      ? targetRecords.length /
        records.length
      : 0;


  // ==================================================
  // LOAD V49
  // ==================================================

  const v49 =
    loadJson(
      "agent-independent-target-validator-v49.json"
    );


  // ==================================================
  // FINAL CLASSIFICATION
  // ==================================================

  let behaviorClassification;

  if (
    targetLowToHigh &&
    lowToHighAgents.length > 1
  ) {

    behaviorClassification =
      "LOW_TO_HIGH_PATTERN_NOT_UNIQUE";

  } else if (
    targetLowToHigh
  ) {

    behaviorClassification =
      "TARGET_LOW_TO_HIGH_OBSERVED";

  } else {

    behaviorClassification =
      "NO_TARGET_LOW_TO_HIGH_PATTERN";

  }


  console.log("");
  console.log("==========================================");
  console.log("       V50 VALIDATOR PROFILE");
  console.log("==========================================");
  console.log("");

  console.log(
    "Validation requests:",
    requestHashes.length
  );

  console.log(
    "Records read:",
    records.length
  );

  console.log(
    "Read errors:",
    readErrors
  );

  console.log(
    "Unique agents:",
    uniqueAgents.length
  );

  console.log(
    "Unique tags:",
    Object.keys(tagCounts).length
  );

  console.log("");

  console.log(
    "Target validations:",
    targetRecords.length
  );

  console.log(
    "Target ratio:",
    (
      targetRatio * 100
    ).toFixed(2) + "%"
  );

  console.log("");

  console.log(
    "Low → High agents:",
    lowToHighAgents.length
  );

  console.log(
    "Target Low → High:",
    targetLowToHigh
  );

  console.log(
    "Behavior:",
    behaviorClassification
  );

  console.log("");


  // ==================================================
  // RESPONSE DISTRIBUTION
  // ==================================================

  console.log("==========================================");
  console.log("       RESPONSE DISTRIBUTION");
  console.log("==========================================");
  console.log("");

  Object.entries(
    responseCounts
  )
    .sort(
      (a, b) =>
        Number(a[0]) -
        Number(b[0])
    )
    .forEach(
      ([response, count]) => {

        console.log(
          `${response}/100: ${count}`
        );

      }
    );


  console.log("");


  // ==================================================
  // TAG DISTRIBUTION
  // ==================================================

  console.log("==========================================");
  console.log("          TAG DISTRIBUTION");
  console.log("==========================================");
  console.log("");

  Object.entries(
    tagCounts
  )
    .sort(
      (a, b) =>
        b[1] -
        a[1]
    )
    .forEach(
      ([tag, count]) => {

        console.log(
          `${tag}: ${count}`
        );

      }
    );


  console.log("");


  // ==================================================
  // TARGET TIMELINE
  // ==================================================

  console.log("==========================================");
  console.log("          TARGET TIMELINE");
  console.log("==========================================");
  console.log("");

  if (
    targetTimeline.length === 0
  ) {

    console.log(
      "No target validation records."
    );

  } else {

    targetTimeline.forEach(
      (record, index) => {

        console.log(
          `${index + 1}. Response ${record.response}/100 | Tag ${record.tag || "(empty)"} | Timestamp ${record.lastUpdate}`
        );

        console.log(
          `   Request: ${record.requestHash}`
        );

      }
    );

  }


  console.log("");


  // ==================================================
  // V50 FINAL
  // ==================================================

  console.log("==========================================");
  console.log("          V50 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Validator:",
    CURRENT_VALIDATOR
  );

  console.log(
    "Total records:",
    records.length
  );

  console.log(
    "Unique agents:",
    uniqueAgents.length
  );

  console.log(
    "Target records:",
    targetRecords.length
  );

  console.log(
    "Target ratio:",
    (
      targetRatio * 100
    ).toFixed(2) + "%"
  );

  console.log(
    "Low → High agents:",
    lowToHighAgents.length
  );

  console.log(
    "Target Low → High:",
    targetLowToHigh
  );

  console.log(
    "Behavior classification:",
    behaviorClassification
  );

  console.log("");

  console.log("==========================================");
  console.log("          V35-002 STATUS");
  console.log("==========================================");
  console.log("");

  if (
    targetLowToHigh &&
    lowToHighAgents.length > 1
  ) {

    console.log(
      "Role overlap remains OPEN."
    );

    console.log(
      "Validator behavior is not unique to target."
    );

  } else {

    console.log(
      "Role overlap remains OPEN."
    );

    console.log(
      "Behavioral evidence is insufficient to independently justify dual role."
    );

  }

  console.log("");

  console.log("==========================================");
  console.log("             SAFETY CHECKS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Validator behavior = maliciousness:",
    false
  );

  console.log(
    "Low → high response = manipulation:",
    false
  );

  console.log(
    "Target concentration = fraud:",
    false
  );

  console.log(
    "Provider overlap = fraud:",
    false
  );

  console.log(
    "Automatic ALLOW:",
    false
  );

  console.log(
    "Automatic BLOCK:",
    false
  );

  console.log("");


  // ==================================================
  // OUTPUT
  // ==================================================

  const output = {

    engine:
      "VALIDATOR_RELATIONSHIP_FORENSICS",

    version:
      "50.0",

    network:
      "Arc Testnet",

    targetAgent:
      TARGET_AGENT.toString(),

    validator:
      CURRENT_VALIDATOR,

    registry:
      REGISTRY,

    chainId,

    latestBlock:
      latestBlock.toString(),

    requestCount:
      requestHashes.length,

    recordsRead:
      records.length,

    readErrors,

    uniqueAgents:
      uniqueAgents.length,

    targetRecords,

    responseCounts,

    tagCounts,

    lowToHighAgents,

    targetLowToHigh,

    targetRatio,

    behaviorClassification,

    targetTimeline,

    v49Available:
      Boolean(v49),

    v35_002: {

      status:
        "OPEN",

      nextAction:
        "REVIEW_ROLE_RELATIONSHIP"

    },

    safety: {

      behaviorIsNotMaliciousness:
        true,

      responseChangeIsNotManipulationProof:
        true,

      concentrationIsNotFraudProof:
        true,

      overlapIsNotFraudProof:
        true,

      automaticAllow:
        false,

      automaticBlock:
        false

    }

  };


  fs.writeFileSync(
    "agent-validator-relationship-v50.json",
    JSON.stringify(
      output,
      null,
      2
    )
  );


  console.log(
    "Output: agent-validator-relationship-v50.json"
  );

  console.log("");

  console.log("==========================================");
  console.log(
    "   VALIDATOR RELATIONSHIP FORENSICS TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");
}


main().catch(
  error => {

    console.error("");
    console.error(
      "FATAL ERROR:",
      error.message
    );
    console.error("");

    process.exit(1);

  }
);