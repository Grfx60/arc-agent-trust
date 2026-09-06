const {
  createPublicClient,
  http,
  getContract,
  encodeFunctionData,
} = require("viem");

const fs = require("fs");

const TARGET_AGENT = 845265n;

const RPC_URL =
  process.env.ARC_RPC_URL ||
  "https://rpc.testnet.arc.network";

const REGISTRY =
  "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";

const VALIDATOR =
  "0xe18f822b5071553d62cf119ce57da6c1636f2524";

const TARGET_OWNER =
  "0xBB30e40F0887b060e9339f6541E29AfA5A3A9dBb";

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

function writeJson(file, data) {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

function lower(address) {
  return String(address).toLowerCase();
}

function hexByteLength(code) {
  if (!code) return 0;
  return Math.max(0, (code.length - 2) / 2);
}

async function main() {

  console.log("");
  console.log("==========================================");
  console.log(" VALIDATOR CONTRACT & ACTIVITY FORENSICS v59");
  console.log("==========================================");
  console.log("");

  console.log("Network: Arc Testnet");
  console.log("Target Agent:", TARGET_AGENT.toString());
  console.log("Validator:", VALIDATOR);
  console.log("Registry:", REGISTRY);
  console.log("");

  /*
  ==================================================
  RPC
  ==================================================
  */

  console.log("==========================================");
  console.log("          RPC CONNECTIVITY");
  console.log("==========================================");

  const chainId =
    await client.getChainId();

  const latestBlock =
    await client.getBlockNumber();

  console.log("Chain ID:", chainId);
  console.log("Latest block:", latestBlock.toString());
  console.log("");

  /*
  ==================================================
  VALIDATOR ACCOUNT
  ==================================================
  */

  console.log("==========================================");
  console.log("          VALIDATOR ACCOUNT");
  console.log("==========================================");

  const validatorCode =
    await client.getBytecode({
      address: VALIDATOR,
    });

  const validatorBalance =
    await client.getBalance({
      address: VALIDATOR,
    });

  const validatorNonce =
    await client.getTransactionCount({
      address: VALIDATOR,
    });

  console.log(
    "Contract:",
    !!validatorCode
  );

  console.log(
    "Code bytes:",
    hexByteLength(validatorCode)
  );

  console.log(
    "Native balance:",
    validatorBalance.toString()
  );

  console.log(
    "Transaction count:",
    validatorNonce
  );

  console.log("");

  /*
  ==================================================
  TARGET RELATIONSHIP
  ==================================================
  */

  console.log("==========================================");
  console.log("        TARGET RELATIONSHIP");
  console.log("==========================================");

  console.log(
    "Validator == target owner:",
    lower(VALIDATOR) === lower(TARGET_OWNER)
  );

  console.log(
    "Validator == target wallet:",
    lower(VALIDATOR) === lower(TARGET_OWNER)
  );

  console.log("");

  /*
  ==================================================
  TARGET VALIDATION HISTORY
  ==================================================
  */

  console.log("==========================================");
  console.log("       TARGET VALIDATION HISTORY");
  console.log("==========================================");

  let requestHashes = [];

  try {

    requestHashes =
      await client.readContract({
        address: REGISTRY,
        abi: validationAbi,
        functionName: "getAgentValidations",
        args: [TARGET_AGENT],
      });

  } catch (error) {

    console.log(
      "Target history read failed:"
    );

    console.log(
      error.shortMessage ||
      error.message
    );
  }

  console.log(
    "Request count:",
    requestHashes.length
  );

  const targetRecords = [];

  for (
    let i = 0;
    i < requestHashes.length;
    i++
  ) {

    try {

      const [
        validatorAddress,
        agentId,
        response,
        responseHash,
        tag,
        lastUpdate,
      ] =
        await client.readContract({
          address: REGISTRY,
          abi: validationAbi,
          functionName: "getValidationStatus",
          args: [requestHashes[i]],
        });

      const record = {
        requestHash:
          requestHashes[i],

        validator:
          validatorAddress,

        validatorMatches:
          lower(validatorAddress) ===
          lower(VALIDATOR),

        agentId:
          agentId.toString(),

        response:
          Number(response),

        responseHash,

        tag,

        lastUpdate:
          lastUpdate.toString(),

        lastUpdateISO:
          new Date(
            Number(lastUpdate) * 1000
          ).toISOString(),
      };

      targetRecords.push(record);

      console.log("");
      console.log(
        `Record ${i + 1}`
      );
      console.log(
        "Request:",
        record.requestHash
      );
      console.log(
        "Validator:",
        record.validator
      );
      console.log(
        "Validator matches:",
        record.validatorMatches
      );
      console.log(
        "Agent:",
        record.agentId
      );
      console.log(
        "Response:",
        record.response + "/100"
      );
      console.log(
        "Tag:",
        record.tag
      );
      console.log(
        "Time:",
        record.lastUpdateISO
      );

    } catch (error) {

      console.log(
        `Record ${i + 1}: READ_FAILED`
      );
    }
  }

  console.log("");

  /*
  ==================================================
  VALIDATOR-SPECIFIC TARGET COUNT
  ==================================================
  */

  const validatorTargetRecords =
    targetRecords.filter(
      record =>
        record.validatorMatches
    );

  console.log(
    "=========================================="
  );

  console.log(
    "      VALIDATOR TARGET ACTIVITY"
  );

  console.log(
    "=========================================="
  );

  console.log(
    "Target records:",
    validatorTargetRecords.length
  );

  console.log(
    "Target ratio:",
    targetRecords.length > 0
      ? (
          validatorTargetRecords.length /
          targetRecords.length *
          100
        ).toFixed(2) + "%"
      : "N/A"
  );

  console.log("");

  /*
  ==================================================
  RESPONSE PATTERN
  ==================================================
  */

  const targetResponses =
    validatorTargetRecords
      .map(
        x =>
          x.response
      );

  const hasResponse1 =
    targetResponses.includes(1);

  const hasResponse100 =
    targetResponses.includes(100);

  const lowToHigh =
    hasResponse1 &&
    hasResponse100;

  console.log(
    "=========================================="
  );

  console.log(
    "        RESPONSE BEHAVIOR"
  );

  console.log(
    "=========================================="
  );

  console.log(
    "Response values:",
    targetResponses.join(", ")
  );

  console.log(
    "1/100 observed:",
    hasResponse1
  );

  console.log(
    "100/100 observed:",
    hasResponse100
  );

  console.log(
    "Low -> High observed:",
    lowToHigh
  );

  console.log("");

  /*
  ==================================================
  CONTRACT CODE ANALYSIS
  ==================================================
  */

  console.log(
    "=========================================="
  );

  console.log(
    "       CONTRACT CODE ANALYSIS"
  );

  console.log(
    "=========================================="
  );

  const codeHex =
    validatorCode || null;

  let codePreview =
    null;

  if (codeHex) {

    codePreview =
      codeHex.length > 202
        ? codeHex.slice(0, 202) + "..."
        : codeHex;

    console.log(
      "Code prefix:",
      codePreview
    );

  } else {

    console.log(
      "No contract bytecode available."
    );
  }

  console.log("");

  /*
  ==================================================
  FUNCTION PROBES
  ==================================================

  We intentionally do NOT assume the validator's
  contract ABI.

  Instead we record only the basic account/code
  facts and registry-confirmed activity.
  ==================================================
  */

  const probes = {

    registryRecognizesTargetValidation:
      validatorTargetRecords.length > 0,

    validatorIsContract:
      !!validatorCode,

    validatorHasNativeBalance:
      validatorBalance > 0n,

    validatorHasTransactions:
      validatorNonce > 0,

    validatorEqualsOwner:
      lower(VALIDATOR) ===
      lower(TARGET_OWNER),

    targetValidationHistoryReadable:
      targetRecords.length ===
      requestHashes.length,

  };

  /*
  ==================================================
  ACTIVITY CLASSIFICATION
  ==================================================
  */

  let activityClassification;

  if (
    validatorTargetRecords.length >= 2 &&
    probes.validatorIsContract
  ) {

    activityClassification =
      "TARGET_VALIDATION_ACTIVITY_CONFIRMED";

  } else if (
    validatorTargetRecords.length > 0
  ) {

    activityClassification =
      "TARGET_VALIDATION_ACTIVITY_PRESENT";

  } else {

    activityClassification =
      "TARGET_VALIDATION_ACTIVITY_NOT_ESTABLISHED";
  }

  /*
  IMPORTANT:
  Activity is NOT trust.
  Activity is NOT maliciousness.
  ==================================================
  */

  const trustEstablished =
    false;

  const fraudEstablished =
    false;

  const maliciousnessEstablished =
    false;

  const manipulationEstablished =
    false;

  /*
  ==================================================
  FINAL RESULT
  ==================================================
  */

  const result = {

    version:
      "59",

    network:
      "Arc Testnet",

    targetAgent:
      TARGET_AGENT.toString(),

    validator:
      VALIDATOR,

    registry:
      REGISTRY,

    latestBlock:
      latestBlock.toString(),

    validatorAccount: {

      isContract:
        !!validatorCode,

      codeBytes:
        hexByteLength(validatorCode),

      nativeBalance:
        validatorBalance.toString(),

      transactionCount:
        validatorNonce,

    },

    targetRelationship: {

      validatorEqualsOwner:
        lower(VALIDATOR) ===
        lower(TARGET_OWNER),

      validatorEqualsWallet:
        lower(VALIDATOR) ===
        lower(TARGET_OWNER),

    },

    targetValidationHistory: {

      requestCount:
        requestHashes.length,

      recordsRead:
        targetRecords.length,

      records:
        targetRecords,

      validatorTargetRecords:
        validatorTargetRecords.length,

      targetRatio:
        targetRecords.length > 0
          ? validatorTargetRecords.length /
            targetRecords.length *
            100
          : null,

    },

    responseBehavior: {

      values:
        targetResponses,

      lowObserved:
        hasResponse1,

      highObserved:
        hasResponse100,

      lowToHighObserved:
        lowToHigh,

    },

    probes,

    activityClassification,

    safety: {

      trustEstablished,

      fraudEstablished,

      maliciousnessEstablished,

      manipulationEstablished,

      activityIsTrustProof:
        false,

      lowToHighIsManipulationProof:
        false,

      automaticAllow:
        false,

      automaticBlock:
        false,

    },

    conclusion:
      "Validator contract presence and target validation activity are established to the extent directly supported by the registry and account data. This does not independently establish trust, fraud, maliciousness, or manipulation.",

  };

  /*
  ==================================================
  WRITE JSON
  ==================================================
  */

  writeJson(
    "agent-validator-deep-forensics-v59.json",
    result
  );

  /*
  ==================================================
  SUMMARY
  ==================================================
  */

  const summary =
`ARC AGENT TRUST — VALIDATOR DEEP FORENSICS v59

Network: Arc Testnet
Target Agent: ${TARGET_AGENT.toString()}

Validator:
${VALIDATOR}

Registry:
${REGISTRY}

Latest block:
${latestBlock.toString()}

VALIDATOR ACCOUNT

Contract:
${!!validatorCode}

Code bytes:
${hexByteLength(validatorCode)}

Native balance:
${validatorBalance.toString()}

Transaction count:
${validatorNonce}

TARGET VALIDATION

Target request count:
${requestHashes.length}

Records read:
${targetRecords.length}

Validator target records:
${validatorTargetRecords.length}

Target ratio:
${
  targetRecords.length > 0
    ? (
        validatorTargetRecords.length /
        targetRecords.length *
        100
      ).toFixed(2) + "%"
    : "N/A"
}

RESPONSE BEHAVIOR

Responses:
${targetResponses.join(", ") || "none"}

1/100 observed:
${hasResponse1}

100/100 observed:
${hasResponse100}

Low -> High:
${lowToHigh}

ACTIVITY CLASSIFICATION

${activityClassification}

SAFETY

Trust established:
false

Fraud established:
false

Maliciousness established:
false

Manipulation established:
false

Automatic ALLOW:
false

Automatic BLOCK:
false

CONCLUSION

Validator activity is supported by direct registry/account evidence.
Activity alone is not proof of trust or maliciousness.
`;

  fs.writeFileSync(
    "agent-validator-deep-forensics-v59-summary.txt",
    summary,
    "utf8"
  );

  /*
  ==================================================
  TERMINAL RESULT
  ==================================================
  */

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "          V59 FINAL RESULT"
  );
  console.log(
    "=========================================="
  );
  console.log("");

  console.log(
    "Validator:",
    VALIDATOR
  );

  console.log(
    "Contract:",
    !!validatorCode
  );

  console.log(
    "Code bytes:",
    hexByteLength(validatorCode)
  );

  console.log(
    "Transaction count:",
    validatorNonce
  );

  console.log(
    "Target validation records:",
    validatorTargetRecords.length
  );

  console.log(
    "Target ratio:",
    targetRecords.length > 0
      ? (
          validatorTargetRecords.length /
          targetRecords.length *
          100
        ).toFixed(2) + "%"
      : "N/A"
  );

  console.log(
    "Response values:",
    targetResponses.join(", ") || "none"
  );

  console.log(
    "Low -> High observed:",
    lowToHigh
  );

  console.log("");

  console.log(
    "Activity classification:",
    activityClassification
  );

  console.log("");

  console.log(
    "Trust established: false"
  );

  console.log(
    "Fraud established: false"
  );

  console.log(
    "Maliciousness established: false"
  );

  console.log(
    "Manipulation established: false"
  );

  console.log(
    "Automatic ALLOW: false"
  );

  console.log(
    "Automatic BLOCK: false"
  );

  console.log("");

  console.log(
    "Created:"
  );

  console.log(
    "  agent-validator-deep-forensics-v59.json"
  );

  console.log(
    "  agent-validator-deep-forensics-v59-summary.txt"
  );

  console.log("");

  console.log(
    "V59 VALIDATOR DEEP FORENSICS TAMAMLANDI"
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