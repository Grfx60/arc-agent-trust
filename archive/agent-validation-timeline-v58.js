const {
  createPublicClient,
  http,
} = require("viem");

const fs = require("fs");

const TARGET_AGENT = 845265n;

const RPC_URL =
  process.env.ARC_RPC_URL ||
  "https://rpc.testnet.arc.network";

const REGISTRY =
  "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";

const EXPECTED_VALIDATOR =
  "0xe18f822b5071553d62cf119ce57da6c1636f2524";

const KNOWN_REQUESTS = [
  "0x8f7693a3402b9cf92283d5e692be983e228271924d1bc411c2f624669dfdec7d",
  "0x5ac85dca5d1bb6c45800f0f78593fc6397b52a1cb96e820b99eb7d3af776561b",
];

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
      http: [RPC_URL],
    },
  },
};

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(RPC_URL),
});

const validationAbi = [
  {
    name: "getAgentValidations",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "agentId",
        type: "uint256",
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

function normalizeAddress(address) {
  return String(address).toLowerCase();
}

function writeJson(file, data) {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

async function main() {

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    " DIRECT VALIDATION TIMELINE FORENSICS v58"
  );
  console.log(
    "=========================================="
  );
  console.log("");

  console.log(
    "Network: Arc Testnet"
  );

  console.log(
    "Target Agent:",
    TARGET_AGENT.toString()
  );

  console.log(
    "Registry:",
    REGISTRY
  );

  console.log("");

  /*
  ================================================
  RPC
  ================================================
  */

  console.log(
    "=========================================="
  );
  console.log(
    "          RPC CONNECTIVITY"
  );
  console.log(
    "=========================================="
  );

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

  /*
  ================================================
  GET AGENT VALIDATIONS
  ================================================
  */

  console.log(
    "=========================================="
  );
  console.log(
    "       AGENT VALIDATION INDEX"
  );
  console.log(
    "=========================================="
  );

  let indexedHashes = [];

  try {

    indexedHashes =
      await client.readContract({
        address: REGISTRY,
        abi: validationAbi,
        functionName:
          "getAgentValidations",
        args: [TARGET_AGENT],
      });

  } catch (error) {

    console.error(
      "getAgentValidations failed:"
    );

    console.error(
      error.shortMessage ||
      error.message
    );

    process.exit(1);
  }

  console.log(
    "Registry request hashes:",
    indexedHashes.length
  );

  for (
    let i = 0;
    i < indexedHashes.length;
    i++
  ) {

    console.log(
      `${i + 1}. ${indexedHashes[i]}`
    );
  }

  console.log("");

  /*
  ================================================
  COMPARE KNOWN HASHES
  ================================================
  */

  const indexedNormalized =
    indexedHashes.map(
      x => x.toLowerCase()
    );

  const knownFound =
    KNOWN_REQUESTS.map(
      hash => ({
        hash,
        found:
          indexedNormalized.includes(
            hash.toLowerCase()
          ),
      })
    );

  console.log(
    "=========================================="
  );
  console.log(
    "        KNOWN REQUEST CROSS-CHECK"
  );
  console.log(
    "=========================================="
  );

  for (
    const item of knownFound
  ) {

    console.log(
      item.hash,
      "=>",
      item.found
        ? "FOUND"
        : "NOT_FOUND"
    );
  }

  console.log("");

  /*
  ================================================
  READ REQUEST RECORDS
  ================================================
  */

  console.log(
    "=========================================="
  );
  console.log(
    "       VALIDATION RECORD DETAILS"
  );
  console.log(
    "=========================================="
  );

  const records = [];

  for (
    let i = 0;
    i < indexedHashes.length;
    i++
  ) {

    const requestHash =
      indexedHashes[i];

    try {

      const result =
        await client.readContract({
          address: REGISTRY,
          abi: validationAbi,
          functionName:
            "getValidationStatus",
          args: [requestHash],
        });

      const [
        validatorAddress,
        agentId,
        response,
        responseHash,
        tag,
        lastUpdate,
      ] = result;

      const timestamp =
        Number(lastUpdate);

      const date =
        Number.isFinite(timestamp) &&
        timestamp > 0
          ? new Date(
              timestamp * 1000
            ).toISOString()
          : null;

      const record = {

        index:
          i + 1,

        requestHash,

        validator:
          validatorAddress,

        validatorNormalized:
          normalizeAddress(
            validatorAddress
          ),

        agentId:
          agentId.toString(),

        response:
          Number(response),

        responseHash,

        tag,

        lastUpdate:
          lastUpdate.toString(),

        lastUpdateISO:
          date,

        agentMatchesTarget:
          agentId === TARGET_AGENT,

        validatorMatchesExpected:
          normalizeAddress(
            validatorAddress
          ) ===
          normalizeAddress(
            EXPECTED_VALIDATOR
          ),

      };

      records.push(record);

      console.log("");
      console.log(
        `Validation ${i + 1}`
      );
      console.log(
        "------------------------"
      );
      console.log(
        "Request:",
        requestHash
      );
      console.log(
        "Agent:",
        agentId.toString()
      );
      console.log(
        "Validator:",
        validatorAddress
      );
      console.log(
        "Response:",
        Number(response) + "/100"
      );
      console.log(
        "Tag:",
        tag || "(empty)"
      );
      console.log(
        "Last Update:",
        lastUpdate.toString()
      );
      console.log(
        "ISO Time:",
        date || "N/A"
      );

    } catch (error) {

      console.log("");
      console.log(
        `Validation ${i + 1}: READ_FAILED`
      );

      console.log(
        error.shortMessage ||
        error.message
      );
    }
  }

  console.log("");

  /*
  ================================================
  STRUCTURAL RECORD CHECK
  ================================================
  */

  const uniqueRequests =
    [
      ...new Set(
        records.map(
          x =>
            x.requestHash.toLowerCase()
        )
      ),
    ];

  const uniqueValidators =
    [
      ...new Set(
        records.map(
          x =>
            x.validatorNormalized
        )
      ),
    ];

  const uniqueAgents =
    [
      ...new Set(
        records.map(
          x =>
            x.agentId
        )
      ),
    ];

  const uniqueTags =
    [
      ...new Set(
        records.map(
          x =>
            x.tag
        )
      ),
    ];

  const responses =
    records.map(
      x =>
        x.response
    );

  const hasLow =
    responses.includes(1);

  const hasHigh =
    responses.includes(100);

  /*
  ================================================
  TIMELINE
  ================================================
  */

  const chronological =
    [...records].sort(
      (a, b) =>
        Number(a.lastUpdate) -
        Number(b.lastUpdate)
    );

  let timelineOrder =
    "INSUFFICIENT_DATA";

  if (
    chronological.length >= 2
  ) {

    const first =
      chronological[0];

    const second =
      chronological[1];

    if (
      Number(first.lastUpdate) <
      Number(second.lastUpdate)
    ) {

      timelineOrder =
        "CHRONOLOGICAL_ORDER_ESTABLISHED";

    } else {

      timelineOrder =
        "NON_INCREASING_TIMESTAMP";
    }
  }

  /*
  ================================================
  RESPONSE CHANGE
  ================================================
  */

  let responseTransition =
    "NOT_ESTABLISHED";

  if (
    chronological.length >= 2
  ) {

    const first =
      chronological[0];

    const second =
      chronological[1];

    responseTransition =
      `${first.response} -> ${second.response}`;
  }

  /*
  ================================================
  TIME DELTA
  ================================================
  */

  let timeDeltaSeconds =
    null;

  let timeDeltaHours =
    null;

  if (
    chronological.length >= 2
  ) {

    timeDeltaSeconds =
      Number(
        chronological[
          1
        ].lastUpdate
      ) -
      Number(
        chronological[
          0
        ].lastUpdate
      );

    timeDeltaHours =
      timeDeltaSeconds /
      3600;
  }

  /*
  ================================================
  CONSISTENCY CHECKS
  ================================================
  */

  const checks = {

    registryIndexAccessible:
      indexedHashes.length > 0,

    knownRequest1Present:
      knownFound[0]
        ? knownFound[0].found
        : false,

    knownRequest2Present:
      knownFound[1]
        ? knownFound[1].found
        : false,

    recordsReadable:
      records.length ===
      indexedHashes.length,

    allAgentIdsMatchTarget:
      records.length > 0 &&
      records.every(
        x =>
          x.agentMatchesTarget
      ),

    sameValidatorAcrossRecords:
      uniqueValidators.length === 1,

    expectedValidatorConfirmed:
      records.length > 0 &&
      records.every(
        x =>
          x.validatorMatchesExpected
      ),

    requestsAreDistinct:
      uniqueRequests.length ===
      records.length,

    targetOnlyRecords:
      uniqueAgents.length === 1 &&
      uniqueAgents[0] ===
        TARGET_AGENT.toString(),

    identityTagOnly:
      uniqueTags.length === 1 &&
      uniqueTags[0] ===
        "identity",

    lowToHighObserved:
      responseTransition ===
      "1 -> 100",

    timestampsIncreasing:
      timelineOrder ===
      "CHRONOLOGICAL_ORDER_ESTABLISHED",

  };

  /*
  ================================================
  INTERPRETATION
  ================================================
  */

  let interpretation;

  if (
    checks.recordsReadable &&
    checks.allAgentIdsMatchTarget &&
    checks.sameValidatorAcrossRecords &&
    checks.requestsAreDistinct &&
    checks.timestampsIncreasing
  ) {

    interpretation =
      "Two distinct target validation records by the same validator are confirmed, with an observed chronological response transition.";

  } else {

    interpretation =
      "The available records do not satisfy all consistency checks required for a complete timeline conclusion.";
  }

  /*
  IMPORTANT:
  Never label 1 -> 100 as manipulation automatically.
  */

  const manipulationEstablished =
    false;

  const fraudEstablished =
    false;

  const maliciousnessEstablished =
    false;

  /*
  ================================================
  FINAL RESULT
  ================================================
  */

  const result = {

    version:
      "58",

    network:
      "Arc Testnet",

    targetAgent:
      TARGET_AGENT.toString(),

    registry:
      REGISTRY,

    latestBlock:
      latestBlock.toString(),

    indexedRequestCount:
      indexedHashes.length,

    recordsRead:
      records.length,

    uniqueRequests:
      uniqueRequests.length,

    uniqueValidators:
      uniqueValidators,

    uniqueAgents:
      uniqueAgents,

    uniqueTags:
      uniqueTags,

    chronologicalRecords:
      chronological,

    responseTransition,

    timeDeltaSeconds,

    timeDeltaHours,

    timelineOrder,

    checks,

    interpretation,

    safety: {

      manipulationEstablished,

      fraudEstablished,

      maliciousnessEstablished,

      responseChangeIsManipulationProof:
        false,

      automaticAllow:
        false,

      automaticBlock:
        false,

    },

    conclusion:
      interpretation,

  };

  /*
  ================================================
  WRITE JSON
  ================================================
  */

  writeJson(
    "agent-validation-timeline-v58.json",
    result
  );

  /*
  ================================================
  SUMMARY
  ================================================
  */

  const summary =
`ARC AGENT TRUST — DIRECT VALIDATION TIMELINE v58

Network: Arc Testnet
Target Agent: ${TARGET_AGENT.toString()}

Registry:
${REGISTRY}

Latest block:
${latestBlock.toString()}

Indexed request count:
${indexedHashes.length}

Records successfully read:
${records.length}

Unique requests:
${uniqueRequests.length}

Unique validators:
${uniqueValidators.length}

Unique agents:
${uniqueAgents.length}

Unique tags:
${uniqueTags.length}

Response transition:
${responseTransition}

Timeline:
${timelineOrder}

Time delta seconds:
${timeDeltaSeconds ?? "N/A"}

Time delta hours:
${timeDeltaHours ?? "N/A"}

KEY CHECKS

All Agent IDs match target:
${checks.allAgentIdsMatchTarget}

Same validator:
${checks.sameValidatorAcrossRecords}

Expected validator confirmed:
${checks.expectedValidatorConfirmed}

Requests distinct:
${checks.requestsAreDistinct}

Identity tag only:
${checks.identityTagOnly}

Chronological order:
${checks.timestampsIncreasing}

INTERPRETATION

${interpretation}

SAFETY

Manipulation established:
false

Fraud established:
false

Maliciousness established:
false

Automatic ALLOW:
false

Automatic BLOCK:
false
`;

  fs.writeFileSync(
    "agent-validation-timeline-v58-summary.txt",
    summary,
    "utf8"
  );

  /*
  ================================================
  TERMINAL
  ================================================
  */

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "          V58 FINAL RESULT"
  );
  console.log(
    "=========================================="
  );
  console.log("");

  console.log(
    "Agent:",
    TARGET_AGENT.toString()
  );

  console.log(
    "Indexed requests:",
    indexedHashes.length
  );

  console.log(
    "Records read:",
    records.length
  );

  console.log(
    "Unique requests:",
    uniqueRequests.length
  );

  console.log(
    "Unique validators:",
    uniqueValidators.length
  );

  console.log(
    "Unique agents:",
    uniqueAgents.length
  );

  console.log(
    "Unique tags:",
    uniqueTags.length
  );

  console.log("");

  console.log(
    "Response transition:",
    responseTransition
  );

  console.log(
    "Timeline:",
    timelineOrder
  );

  console.log(
    "Time delta:",
    timeDeltaHours === null
      ? "N/A"
      : `${timeDeltaHours} hours`
  );

  console.log("");

  console.log(
    "=========================================="
  );
  console.log(
    "          CONSISTENCY CHECKS"
  );
  console.log(
    "=========================================="
  );
  console.log("");

  console.log(
    "All Agent IDs match target:",
    checks.allAgentIdsMatchTarget
  );

  console.log(
    "Same validator:",
    checks.sameValidatorAcrossRecords
  );

  console.log(
    "Expected validator confirmed:",
    checks.expectedValidatorConfirmed
  );

  console.log(
    "Requests distinct:",
    checks.requestsAreDistinct
  );

  console.log(
    "Identity tag only:",
    checks.identityTagOnly
  );

  console.log(
    "Chronological order:",
    checks.timestampsIncreasing
  );

  console.log("");

  console.log(
    "=========================================="
  );
  console.log(
    "          INTERPRETATION"
  );
  console.log(
    "=========================================="
  );
  console.log("");

  console.log(
    interpretation
  );

  console.log("");

  console.log(
    "Response 1 -> 100 = manipulation:",
    false
  );

  console.log(
    "Fraud established:",
    false
  );

  console.log(
    "Maliciousness established:",
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

  console.log(
    "Created:"
  );

  console.log(
    "  agent-validation-timeline-v58.json"
  );

  console.log(
    "  agent-validation-timeline-v58-summary.txt"
  );

  console.log("");

  console.log(
    "V58 DIRECT VALIDATION TIMELINE FORENSICS TAMAMLANDI"
  );

  console.log("");
}

main().catch(error => {

  console.error("");
  console.error(
    "FATAL ERROR:"
  );

  console.error(
    error.shortMessage ||
    error.message ||
    error
  );

  process.exit(1);
});