const fs = require("fs");
const {
  createPublicClient,
  http,
  getAddress,
} = require("viem");

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

const TARGET_AGENT = 845265n;

const VALIDATION_REGISTRY =
  "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";

const CURRENT_VALIDATOR =
  "0xe18f822b5071553d62cf119ce57da6c1636f2524";

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(
    process.env.ARC_RPC_URL ||
      "https://rpc.testnet.arc.network"
  ),
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

function safeAddress(address) {
  try {
    return getAddress(address);
  } catch {
    return address;
  }
}

function lower(address) {
  return String(address).toLowerCase();
}

function readJson(file) {
  try {
    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch {
    return null;
  }
}

function collectCandidates() {
  const candidates = new Set();

  const files = fs
    .readdirSync(".")
    .filter(
      (file) =>
        file.endsWith(".json") &&
        (
          file.includes("validator") ||
          file.includes("validation")
        )
    );

  for (const file of files) {
    const data = readJson(file);

    if (!data) continue;

    const text = JSON.stringify(data);

    const matches =
      text.match(
        /0x[a-fA-F0-9]{40}/g
      ) || [];

    for (const address of matches) {
      const normalized =
        lower(address);

      if (
        normalized !==
        lower(
          CURRENT_VALIDATOR
        )
      ) {
        candidates.add(
          safeAddress(address)
        );
      }
    }
  }

  return [
    ...candidates,
  ];
}

async function readValidation(
  requestHash
) {
  return await client.readContract({
    address: VALIDATION_REGISTRY,
    abi: validationAbi,
    functionName:
      "getValidationStatus",
    args: [requestHash],
  });
}

async function main() {

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    " INDEPENDENT TARGET VALIDATION v54"
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
    "Validation Registry:",
    VALIDATION_REGISTRY
  );
  console.log("");

  // ------------------------------------------------
  // RPC
  // ------------------------------------------------

  const chainId =
    await client.getChainId();

  const blockNumber =
    await client.getBlockNumber();

  console.log(
    "=========================================="
  );
  console.log(
    "          RPC CONNECTIVITY"
  );
  console.log(
    "=========================================="
  );
  console.log("");

  console.log(
    "Chain ID:",
    chainId
  );

  console.log(
    "Latest block:",
    blockNumber.toString()
  );

  console.log("");

  // ------------------------------------------------
  // TARGET DIRECT QUERY
  // ------------------------------------------------

  console.log(
    "=========================================="
  );
  console.log(
    "      TARGET DIRECT REGISTRY QUERY"
  );
  console.log(
    "=========================================="
  );
  console.log("");

  let targetHashes = [];

  try {

    targetHashes =
      await client.readContract({
        address:
          VALIDATION_REGISTRY,
        abi: validationAbi,
        functionName:
          "getAgentValidations",
        args: [TARGET_AGENT],
      });

    console.log(
      "Target request hashes:",
      targetHashes.length
    );

  } catch (error) {

    console.log(
      "Target registry query FAILED:"
    );

    console.log(
      error.shortMessage ||
        error.message
    );

    console.log("");

    process.exit(1);
  }

  console.log("");

  // ------------------------------------------------
  // READ TARGET HISTORY
  // ------------------------------------------------

  const targetRecords = [];

  for (
    let i = 0;
    i < targetHashes.length;
    i++
  ) {

    const hash =
      targetHashes[i];

    try {

      const result =
        await readValidation(
          hash
        );

      const [
        validatorAddress,
        returnedAgentId,
        response,
        responseHash,
        tag,
        lastUpdate,
      ] = result;

      const record = {
        requestHash: hash,
        validator:
          safeAddress(
            validatorAddress
          ),
        agentId:
          returnedAgentId.toString(),
        response:
          Number(response),
        responseHash,
        tag: tag || "",
        lastUpdate:
          lastUpdate.toString(),
      };

      targetRecords.push(
        record
      );

      console.log(
        `[TARGET ${i + 1}/${targetHashes.length}]`,
        record.validator,
        "|",
        record.response +
          "/100",
        "|",
        record.tag || "(empty)"
      );

    } catch (error) {

      console.log(
        `[TARGET ${i + 1}/${targetHashes.length}] READ ERROR`
      );

    }
  }

  console.log("");

  // ------------------------------------------------
  // TARGET VALIDATOR SET
  // ------------------------------------------------

  const targetValidators =
    new Set(
      targetRecords.map(
        (record) =>
          lower(
            record.validator
          )
      )
    );

  console.log(
    "=========================================="
  );
  console.log(
    "        TARGET VALIDATOR HISTORY"
  );
  console.log(
    "=========================================="
  );
  console.log("");

  console.log(
    "Records:",
    targetRecords.length
  );

  console.log(
    "Unique validators:",
    targetValidators.size
  );

  for (
    const validator of targetValidators
  ) {
    console.log(
      validator
    );
  }

  console.log("");

  // ------------------------------------------------
  // CANDIDATES FROM LOCAL DATA
  // ------------------------------------------------

  const candidates =
    collectCandidates();

  console.log(
    "=========================================="
  );
  console.log(
    "        LOCAL VALIDATOR CANDIDATES"
  );
  console.log(
    "=========================================="
  );
  console.log("");

  console.log(
    "Candidates discovered:",
    candidates.length
  );

  for (
    const candidate of candidates
  ) {
    console.log(
      candidate
    );
  }

  console.log("");

  // ------------------------------------------------
  // IMPORTANT:
  // We do NOT manufacture validation.
  // We only compare already known target
  // validation records with discovered validators.
  // ------------------------------------------------

  console.log(
    "=========================================="
  );
  console.log(
    "       INDEPENDENT TARGET CHECK"
  );
  console.log(
    "=========================================="
  );
  console.log("");

  const independentTargetValidators =
    targetRecords
      .filter(
        (record) =>
          lower(
            record.validator
          ) !==
          lower(
            CURRENT_VALIDATOR
          )
      )
      .map(
        (record) =>
          record.validator
      );

  const uniqueIndependentTargetValidators =
    [
      ...new Set(
        independentTargetValidators
      ),
    ];

  console.log(
    "Current validator:",
    CURRENT_VALIDATOR
  );

  console.log(
    "Independent target validators:",
    uniqueIndependentTargetValidators.length
  );

  if (
    uniqueIndependentTargetValidators.length
  ) {

    for (
      const validator of
        uniqueIndependentTargetValidators
    ) {

      console.log(
        "FOUND:",
        validator
      );

    }

  } else {

    console.log(
      "NO INDEPENDENT TARGET VALIDATOR FOUND"
    );

  }

  console.log("");

  // ------------------------------------------------
  // FULL CANDIDATE MATCH
  // ------------------------------------------------

  const candidateResults =
    candidates.map(
      (candidate) => {

        const matchingRecords =
          targetRecords.filter(
            (record) =>
              lower(
                record.validator
              ) ===
              lower(candidate)
          );

        return {
          validator:
            candidate,
          targetValidation:
            matchingRecords.length > 0,
          targetRecords:
            matchingRecords.length,
        };
      }
    );

  console.log(
    "=========================================="
  );
  console.log(
    "       CANDIDATE TARGET MATCH"
  );
  console.log(
    "=========================================="
  );
  console.log("");

  for (
    const result of candidateResults
  ) {

    console.log(
      result.validator,
      "| Target validation:",
      result.targetValidation
        ? "YES"
        : "NO",
      "| Records:",
      result.targetRecords
    );

  }

  console.log("");

  // ------------------------------------------------
  // FINAL STATUS
  // ------------------------------------------------

  const independentFound =
    uniqueIndependentTargetValidators
      .length > 0;

  const status =
    independentFound
      ? "INDEPENDENT_TARGET_VALIDATOR_FOUND"
      : "INDEPENDENT_TARGET_VALIDATOR_NOT_FOUND";

  const nextAction =
    independentFound
      ? "ANALYZE_INDEPENDENT_VALIDATION"
      : "FINALIZE_EVIDENCE_ASSESSMENT";

  const output = {

    engine:
      "INDEPENDENT_TARGET_VALIDATION",

    version:
      "54",

    generatedAt:
      new Date().toISOString(),

    network:
      "Arc Testnet",

    targetAgent:
      TARGET_AGENT.toString(),

    registry:
      VALIDATION_REGISTRY,

    currentValidator:
      CURRENT_VALIDATOR,

    rpc: {
      chainId,
      latestBlock:
        blockNumber.toString(),
    },

    target: {

      requestHashes:
        targetHashes.length,

      records:
        targetRecords,

      uniqueValidators:
        [
          ...targetValidators,
        ],

    },

    candidates: {

      discovered:
        candidates,

      count:
        candidates.length,

      results:
        candidateResults,

    },

    independentTargetValidators:
      uniqueIndependentTargetValidators,

    independentTargetValidatorCount:
      uniqueIndependentTargetValidators.length,

    status,

    nextAction,

    safety: {

      noTransactionSent:
        true,

      noValidationCreated:
        true,

      candidateDoesNotEqualProof:
        true,

      noIndependentValidatorDoesNotEqualFraud:
        true,

    },

  };

  fs.writeFileSync(
    "agent-independent-target-validation-v54.json",
    JSON.stringify(
      output,
      null,
      2
    ),
    "utf8"
  );

  // ------------------------------------------------
  // FINAL OUTPUT
  // ------------------------------------------------

  console.log(
    "=========================================="
  );
  console.log(
    "          V54 FINAL RESULT"
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
    "Target validation records:",
    targetRecords.length
  );

  console.log(
    "Target validators:",
    targetValidators.size
  );

  console.log(
    "Validator candidates:",
    candidates.length
  );

  console.log(
    "Independent target validators:",
    uniqueIndependentTargetValidators.length
  );

  console.log("");

  if (independentFound) {

    console.log(
      "🟢 INDEPENDENT TARGET VALIDATOR FOUND"
    );

    console.log("");

    for (
      const validator of
        uniqueIndependentTargetValidators
    ) {

      console.log(
        validator
      );

    }

  } else {

    console.log(
      "🟡 NO INDEPENDENT TARGET VALIDATOR FOUND"
    );

  }

  console.log("");

  console.log(
    "=========================================="
  );
  console.log(
    "          V35-001 STATUS"
  );
  console.log(
    "=========================================="
  );
  console.log("");

  if (independentFound) {

    console.log(
      "Status: EVIDENCE_FOUND"
    );

    console.log(
      "Next action:",
      nextAction
    );

  } else {

    console.log(
      "Status: EVIDENCE_NOT_FOUND"
    );

    console.log(
      "Meaning: No independent validator validation record exists in the scanned target history."
    );

    console.log(
      "This does NOT establish fraud or maliciousness."
    );

    console.log(
      "Next action:",
      nextAction
    );

  }

  console.log("");

  console.log(
    "=========================================="
  );
  console.log(
    "             SAFETY CHECKS"
  );
  console.log(
    "=========================================="
  );
  console.log("");

  console.log(
    "Validation creation:",
    "NONE"
  );

  console.log(
    "Transaction sent:",
    "NONE"
  );

  console.log(
    "Candidate = proof:",
    "false"
  );

  console.log(
    "No independent validator = fraud:",
    "false"
  );

  console.log(
    "Automatic ALLOW:",
    "false"
  );

  console.log(
    "Automatic BLOCK:",
    "false"
  );

  console.log("");

  console.log(
    "Output:",
    "agent-independent-target-validation-v54.json"
  );

  console.log("");

  console.log(
    "=========================================="
  );
  console.log(
    "       V54 TARAMASI TAMAMLANDI"
  );
  console.log(
    "=========================================="
  );
  console.log("");
}

main().catch(
  (error) => {

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
  }
);