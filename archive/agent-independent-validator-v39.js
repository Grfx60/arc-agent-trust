const fs = require("fs");

const AGENT_ID = 845265;

const IDENTITY_REGISTRY =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const VALIDATION_REGISTRY =
  process.env.VALIDATION_REGISTRY ||
  "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";

const RPC_URL =
  process.env.ARC_RPC_URL ||
  "https://rpc.testnet.arc.network";

const CURRENT_VALIDATOR =
  "0xe18f822b5071553d62cf119ce57da6c1636f2524";

const OUTPUT_FILE =
  "agent-independent-validator-v39.json";

const VALIDATION_ABI = [
  {
    name: "getAgentValidations",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "agentId",
        type: "uint256"
      }
    ],
    outputs: [
      {
        name: "requestHashes",
        type: "bytes32[]"
      }
    ]
  },
  {
    name: "getValidationStatus",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "requestHash",
        type: "bytes32"
      }
    ],
    outputs: [
      {
        name: "validatorAddress",
        type: "address"
      },
      {
        name: "agentId",
        type: "uint256"
      },
      {
        name: "response",
        type: "uint8"
      },
      {
        name: "responseHash",
        type: "bytes32"
      },
      {
        name: "tag",
        type: "string"
      },
      {
        name: "lastUpdate",
        type: "uint256"
      }
    ]
  }
];

function loadJSON(file) {
  if (!fs.existsSync(file)) return null;

  try {
    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch {
    return null;
  }
}

function normalize(value) {
  if (!value) return "";

  return String(value)
    .trim()
    .toLowerCase();
}

function unique(values) {
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map(normalize)
    )
  ];
}

function sleep(ms) {
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}

async function main() {

  console.log("");
  console.log("==========================================");
  console.log("   INDEPENDENT VALIDATOR DISCOVERY v39");
  console.log("==========================================");
  console.log("");

  console.log(
    "Network: Arc Testnet"
  );

  console.log(
    "Target Agent:",
    AGENT_ID
  );

  console.log(
    "Current Validator:",
    CURRENT_VALIDATOR
  );

  console.log("");

  let viem;

  try {
    viem = require("viem");
  } catch {
    console.log(
      "❌ viem bulunamadı."
    );
    console.log(
      "npm install viem"
    );
    return;
  }

  const {
    createPublicClient,
    http,
    getAddress
  } = viem;

  const client =
    createPublicClient({
      chain: {
        id: 0,
        name: "Arc Testnet",
        nativeCurrency: {
          name: "USDC",
          symbol: "USDC",
          decimals: 6
        },
        rpcUrls: {
          default: {
            http: [RPC_URL]
          }
        }
      },
      transport: http(RPC_URL)
    });

  const registry =
    getAddress(
      VALIDATION_REGISTRY
    );

  // ==========================================
  // STEP 1 — LOAD DISCOVERED AGENTS
  // ==========================================

  console.log("==========================================");
  console.log("       STEP 1 — AGENT SOURCE");
  console.log("==========================================");
  console.log("");

  const sourceFiles = [
    "agent-id-discovery-v16.json",
    "agent-discovery-v17.json",
    "agent-metadata-intelligence-v19.json"
  ];

  const agents = new Set();

  for (const file of sourceFiles) {

    const data =
      loadJSON(file);

    if (!data) continue;

    const list =
      Array.isArray(data)
        ? data
        : (
            data.agents ||
            data.results ||
            []
          );

    for (const item of list) {

      const id =
        item.agentId ??
        item.id ??
        item.tokenId;

      if (
        id !== undefined &&
        /^\d+$/.test(String(id))
      ) {

        agents.add(
          String(id)
        );

      }

    }

  }

  // Always include target.
  agents.add(
    String(AGENT_ID)
  );

  const agentIds =
    [...agents]
      .map(Number)
      .sort((a, b) => a - b);

  console.log(
    "Candidate agents:",
    agentIds.length
  );

  console.log("");

  // ==========================================
  // STEP 2 — SCAN VALIDATION REGISTRY
  // ==========================================

  console.log("==========================================");
  console.log("       STEP 2 — VALIDATION SCAN");
  console.log("==========================================");
  console.log("");

  const validatorMap = new Map();

  let scanned = 0;
  let validationRequests = 0;
  let readErrors = 0;

  for (
    const agentId
    of agentIds
  ) {

    scanned++;

    let hashes;

    try {

      hashes =
        await client.readContract({
          address:
            registry,

          abi:
            VALIDATION_ABI,

          functionName:
            "getAgentValidations",

          args: [
            BigInt(agentId)
          ]
        });

    } catch {

      readErrors++;

      continue;
    }

    if (
      !Array.isArray(hashes) ||
      hashes.length === 0
    ) {
      continue;
    }

    validationRequests +=
      hashes.length;

    for (
      const hash
      of hashes
    ) {

      try {

        const result =
          await client.readContract({
            address:
              registry,

            abi:
              VALIDATION_ABI,

            functionName:
              "getValidationStatus",

            args: [
              hash
            ]
          });

        const validator =
          normalize(
            result[0]
          );

        if (!validator) {
          continue;
        }

        const record = {

          agentId:
            String(agentId),

          requestHash:
            hash,

          validator,

          response:
            Number(result[2]),

          responseHash:
            result[3],

          tag:
            result[4],

          lastUpdate:
            result[5].toString()

        };

        if (
          !validatorMap.has(
            validator
          )
        ) {

          validatorMap.set(
            validator,
            []
          );

        }

        validatorMap
          .get(validator)
          .push(record);

      } catch {

        readErrors++;

      }

    }

    if (
      scanned % 25 === 0
    ) {

      console.log(
        `Progress: ${scanned}/${agentIds.length} | Validators: ${validatorMap.size} | Requests: ${validationRequests}`
      );

    }

    /*
     * Small delay to avoid hammering
     * the public RPC.
     */
    await sleep(40);

  }

  // ==========================================
  // STEP 3 — VALIDATOR SUMMARY
  // ==========================================

  console.log("");
  console.log("==========================================");
  console.log("       STEP 3 — VALIDATOR SUMMARY");
  console.log("==========================================");
  console.log("");

  const validators =
    [...validatorMap.keys()];

  console.log(
    "Unique validators:",
    validators.length
  );

  console.log(
    "Validation requests:",
    validationRequests
  );

  console.log(
    "Read errors:",
    readErrors
  );

  console.log("");

  // ==========================================
  // STEP 4 — EXCLUDE CURRENT VALIDATOR
  // ==========================================

  const alternativeValidators =
    validators.filter(
      validator =>
        validator !==
        normalize(
          CURRENT_VALIDATOR
        )
    );

  console.log(
    "Current validator:",
    normalize(
      CURRENT_VALIDATOR
    )
  );

  console.log(
    "Alternative validators:",
    alternativeValidators.length
  );

  console.log("");

  // ==========================================
  // STEP 5 — VALIDATOR CANDIDATES
  // ==========================================

  const candidates =
    alternativeValidators.map(
      validator => {

        const records =
          validatorMap.get(
            validator
          ) || [];

        const validatedAgents =
          unique(
            records.map(
              record =>
                record.agentId
            )
          );

        const tags =
          unique(
            records.map(
              record =>
                record.tag
            )
          );

        return {

          validator,

          validationCount:
            records.length,

          validatedAgentCount:
            validatedAgents.length,

          validatedAgents,

          tags,

          independentFromCurrentValidator:
            true,

          independenceVerified:
            false,

          status:
            "CANDIDATE"

        };

      }
    );

  candidates.sort(
    (a, b) =>
      b.validatedAgentCount -
      a.validatedAgentCount
  );

  // ==========================================
  // STEP 6 — TARGET AGENT CHECK
  // ==========================================

  const targetValidators =
    validators.filter(
      validator => {

        const records =
          validatorMap.get(
            validator
          ) || [];

        return records.some(
          record =>
            record.agentId ===
            String(AGENT_ID)
        );

      }
    );

  const alternativeTargetValidators =
    targetValidators.filter(
      validator =>
        validator !==
        normalize(
          CURRENT_VALIDATOR
        )
    );

  console.log("==========================================");
  console.log("       STEP 6 — TARGET AGENT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Validators for agent 845265:",
    targetValidators.length
  );

  console.log(
    "Alternative validators for agent 845265:",
    alternativeTargetValidators.length
  );

  for (
    const validator
    of targetValidators
  ) {

    console.log(
      validator
    );

  }

  console.log("");

  // ==========================================
  // STEP 7 — INDEPENDENCE STATUS
  // ==========================================

  let status;

  if (
    alternativeTargetValidators.length >= 1
  ) {

    status =
      "SECOND_VALIDATOR_FOUND";

  } else if (
    alternativeValidators.length >= 1
  ) {

    status =
      "CANDIDATE_VALIDATORS_FOUND";

  } else {

    status =
      "NO_ALTERNATIVE_VALIDATOR_FOUND";

  }

  // ==========================================
  // STEP 8 — V35-001
  // ==========================================

  let v35Status;

  if (
    alternativeTargetValidators.length >= 1
  ) {

    v35Status =
      "CANDIDATE_FOR_RESOLUTION";

  } else {

    v35Status =
      "OPEN";

  }

  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "3.9",

    engine:
      "INDEPENDENT_VALIDATOR_DISCOVERY",

    generatedAt:
      new Date().toISOString(),

    network:
      "Arc Testnet",

    agent:
      AGENT_ID,

    validationRegistry:
      registry,

    scan: {

      candidateAgents:
        agentIds.length,

      scannedAgents:
        scanned,

      validationRequests,

      readErrors

    },

    validatorSummary: {

      uniqueValidators:
        validators.length,

      currentValidator:
        normalize(
          CURRENT_VALIDATOR
        ),

      alternativeValidators:
        alternativeValidators.length,

      targetValidators:
        targetValidators.length,

      alternativeTargetValidators:
        alternativeTargetValidators.length

    },

    validators,

    candidates,

    target: {

      validators:
        targetValidators,

      alternativeValidators:
        alternativeTargetValidators

    },

    assessment: {

      status,

      v35Task:
        "V35-001",

      v35Status

    },

    safety: {

      candidateValidatorIsNotProof:
        true,

      alternativeValidatorIsNotAutomaticallyIndependent:
        true,

      validatorDiscoveryDoesNotProveTrust:
        true,

      sharedValidatorDoesNotProveFraud:
        true,

      automaticAllow:
        false,

      automaticBlock:
        false

    }

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
  console.log("==========================================");
  console.log("          V39 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agent:",
    AGENT_ID
  );

  console.log(
    "Agents scanned:",
    scanned
  );

  console.log(
    "Validation requests:",
    validationRequests
  );

  console.log(
    "Unique validators:",
    validators.length
  );

  console.log(
    "Alternative validators:",
    alternativeValidators.length
  );

  console.log(
    "Validators for 845265:",
    targetValidators.length
  );

  console.log(
    "Alternative validators for 845265:",
    alternativeTargetValidators.length
  );

  console.log("");

  console.log("==========================================");
  console.log("       VALIDATOR CANDIDATES");
  console.log("==========================================");
  console.log("");

  if (
    candidates.length === 0
  ) {

    console.log(
      "No alternative validator candidate found."
    );

  } else {

    for (
      const candidate
      of candidates.slice(0, 20)
    ) {

      console.log(
        "Validator:",
        candidate.validator
      );

      console.log(
        "Validation count:",
        candidate.validationCount
      );

      console.log(
        "Validated agents:",
        candidate.validatedAgentCount
      );

      console.log(
        "Tags:",
        candidate.tags.join(", ") ||
        "N/A"
      );

      console.log(
        "Status:",
        candidate.status
      );

      console.log("");

    }

  }

  console.log("==========================================");
  console.log("          TARGET AGENT RESULT");
  console.log("==========================================");
  console.log("");

  if (
    targetValidators.length
  ) {

    for (
      const validator
      of targetValidators
    ) {

      console.log(
        "Validator:",
        validator
      );

    }

  } else {

    console.log(
      "No validator found for target."
    );

  }

  console.log("");

  console.log(
    "Alternative target validators:",
    alternativeTargetValidators.length
  );

  console.log("");

  console.log("==========================================");
  console.log("          V35-001 STATUS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Status:",
    v35Status
  );

  console.log(
    "Discovery:",
    status
  );

  console.log("");

  console.log("==========================================");
  console.log("             SAFETY CHECKS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Candidate = independent proof:",
    false
  );

  console.log(
    "Validator discovery = trust proof:",
    false
  );

  console.log(
    "Shared validator = fraud:",
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
    "📁 Output:",
    OUTPUT_FILE
  );

  console.log("");

  console.log("==========================================");
  console.log(
    "     INDEPENDENT VALIDATOR DISCOVERY TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");
}

main().catch(
  error => {

    console.error("");
    console.error(
      "❌ V39 kritik hata:"
    );

    console.error(
      error.message ||
      error
    );

    console.error("");

    process.exit(1);

  }
);