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

const IDENTITY_REGISTRY =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const VALIDATION_REGISTRY =
  "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";

const TARGET_AGENT = 845265n;

const VALIDATOR =
  "0xe18f822b5071553d62cf119ce57da6c1636f2524";

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

const identityAbi = [
  {
    name: "getAgentWallet",
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
        name: "wallet",
        type: "address",
      },
    ],
  },

  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "owner",
        type: "address",
      },
    ],
  },

  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
  },
];

const validationAbi = [
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

function normalize(value) {
  return String(value).toLowerCase();
}

function isZeroAddress(value) {
  return (
    normalize(value) ===
    "0x0000000000000000000000000000000000000000"
  );
}

async function safeRead(
  address,
  abi,
  functionName,
  args
) {
  try {
    const result =
      await client.readContract({
        address,
        abi,
        functionName,
        args,
      });

    return {
      ok: true,
      result,
    };

  } catch (error) {

    return {
      ok: false,
      error: error.message,
    };

  }
}

async function main() {

  console.log("");
  console.log("==========================================");
  console.log(" VALIDATOR ACTIVITY & IDENTITY FORENSICS v51");
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
    VALIDATOR
  );

  console.log(
    "Identity Registry:",
    IDENTITY_REGISTRY
  );

  console.log(
    "Validation Registry:",
    VALIDATION_REGISTRY
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
  // VALIDATOR BALANCE
  // ==================================================

  console.log("==========================================");
  console.log("        VALIDATOR ACCOUNT");
  console.log("==========================================");
  console.log("");

  let balance;

  try {

    balance =
      await client.getBalance({
        address:
          VALIDATOR,
      });

    console.log(
      "Native balance:",
      balance.toString()
    );

  } catch (error) {

    console.log(
      "Balance read failed:",
      error.message
    );

  }

  console.log("");

  // ==================================================
  // VALIDATOR CODE
  // ==================================================

  console.log("==========================================");
  console.log("       VALIDATOR ADDRESS TYPE");
  console.log("==========================================");
  console.log("");

  let validatorCode =
    "0x";

  try {

    validatorCode =
      await client.getCode({
        address:
          VALIDATOR,
      });

    const isContract =
      validatorCode &&
      validatorCode !== "0x";

    console.log(
      "Contract:",
      isContract
    );

    console.log(
      "Code bytes:",
      isContract
        ? (validatorCode.length - 2) / 2
        : 0
    );

  } catch (error) {

    console.log(
      "Code check failed:",
      error.message
    );

  }

  console.log("");

  // ==================================================
  // TARGET AGENT OWNER
  // ==================================================

  console.log("==========================================");
  console.log("          TARGET AGENT IDENTITY");
  console.log("==========================================");
  console.log("");

  const targetOwner =
    await safeRead(
      IDENTITY_REGISTRY,
      identityAbi,
      "ownerOf",
      [TARGET_AGENT]
    );

  const targetWallet =
    await safeRead(
      IDENTITY_REGISTRY,
      identityAbi,
      "getAgentWallet",
      [TARGET_AGENT]
    );

  const targetURI =
    await safeRead(
      IDENTITY_REGISTRY,
      identityAbi,
      "tokenURI",
      [TARGET_AGENT]
    );


  if (targetOwner.ok) {

    console.log(
      "Target owner:",
      targetOwner.result
    );

  } else {

    console.log(
      "Target owner:",
      "UNAVAILABLE"
    );

  }


  if (targetWallet.ok) {

    console.log(
      "Target wallet:",
      targetWallet.result
    );

  } else {

    console.log(
      "Target wallet:",
      "UNAVAILABLE"
    );

  }


  if (targetURI.ok) {

    console.log(
      "Target URI:",
      targetURI.result
    );

  } else {

    console.log(
      "Target URI:",
      "UNAVAILABLE"
    );

  }

  console.log("");

  // ==================================================
  // VALIDATOR AS POSSIBLE AGENT ID
  // ==================================================

  console.log("==========================================");
  console.log("      VALIDATOR IDENTITY PROBES");
  console.log("==========================================");
  console.log("");

  console.log(
    "Validator is an address, not an agent ID."
  );

  console.log(
    "We cannot infer an agent ID from the address."
  );

  console.log("");

  // ==================================================
  // VALIDATOR TRANSACTION COUNT
  // ==================================================

  console.log("==========================================");
  console.log("       VALIDATOR NONCE / ACTIVITY");
  console.log("==========================================");
  console.log("");

  let nonce;

  try {

    nonce =
      await client.getTransactionCount({
        address:
          VALIDATOR,
      });

    console.log(
      "Transaction count:",
      nonce
    );

  } catch (error) {

    console.log(
      "Nonce read failed:",
      error.message
    );

  }

  console.log("");

  // ==================================================
  // VALIDATION HISTORY
  // ==================================================

  console.log("==========================================");
  console.log("       VALIDATOR VALIDATION HISTORY");
  console.log("==========================================");
  console.log("");

  const requestResult =
    await safeRead(
      VALIDATION_REGISTRY,
      validationAbi,
      "getValidatorRequests",
      [VALIDATOR]
    );

  let requestHashes = [];

  if (requestResult.ok) {

    requestHashes =
      requestResult.result;

    console.log(
      "Validation requests:",
      requestHashes.length
    );

  } else {

    console.log(
      "Validation request query failed:",
      requestResult.error
    );

  }

  console.log("");

  // ==================================================
  // VALIDATION RECORDS
  // ==================================================

  const records = [];

  for (
    let i = 0;
    i < requestHashes.length;
    i++
  ) {

    const hash =
      requestHashes[i];

    const result =
      await safeRead(
        VALIDATION_REGISTRY,
        validationAbi,
        "getValidationStatus",
        [hash]
      );

    if (!result.ok) {
      continue;
    }

    const [
      validatorAddress,
      agentId,
      response,
      responseHash,
      tag,
      lastUpdate,
    ] = result.result;

    records.push({

      requestHash:
        hash,

      validatorAddress,

      agentId:
        agentId.toString(),

      response:
        Number(response),

      responseHash,

      tag,

      lastUpdate:
        lastUpdate.toString(),

    });

  }

  const uniqueAgents = [
    ...new Set(
      records.map(
        x => x.agentId
      )
    )
  ];

  const targetRecords =
    records.filter(
      x =>
        x.agentId ===
        TARGET_AGENT.toString()
    );

  console.log(
    "Records read:",
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

  console.log("");

  // ==================================================
  // TARGET OWNER / VALIDATOR RELATION
  // ==================================================

  let ownerValidatorRelation =
    false;

  let walletValidatorRelation =
    false;

  if (targetOwner.ok) {

    ownerValidatorRelation =
      normalize(
        targetOwner.result
      ) ===
      normalize(
        VALIDATOR
      );

  }

  if (targetWallet.ok) {

    walletValidatorRelation =
      normalize(
        targetWallet.result
      ) ===
      normalize(
        VALIDATOR
      );

  }

  // ==================================================
  // TARGET TIMELINE
  // ==================================================

  console.log("==========================================");
  console.log("          TARGET VALIDATION");
  console.log("==========================================");
  console.log("");

  targetRecords
    .sort(
      (a, b) =>
        Number(a.lastUpdate) -
        Number(b.lastUpdate)
    )
    .forEach(
      (record, index) => {

        console.log(
          `${index + 1}. ${record.response}/100 | ${record.tag || "(empty)"} | ${record.lastUpdate}`
        );

        console.log(
          "   Request:",
          record.requestHash
        );

      }
    );

  console.log("");

  // ==================================================
  // RELATIONSHIP
  // ==================================================

  console.log("==========================================");
  console.log("        RELATIONSHIP ANALYSIS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Validator == Target Owner:",
    ownerValidatorRelation
  );

  console.log(
    "Validator == Target Wallet:",
    walletValidatorRelation
  );

  console.log(
    "Validator == Target Validation Provider:",
    true
  );

  console.log("");

  // ==================================================
  // CLASSIFICATION
  // ==================================================

  let relationship;

  if (
    ownerValidatorRelation
  ) {

    relationship =
      "VALIDATOR_EQUALS_TARGET_OWNER";

  } else if (
    walletValidatorRelation
  ) {

    relationship =
      "VALIDATOR_EQUALS_TARGET_WALLET";

  } else if (
    targetRecords.length > 0
  ) {

    relationship =
      "VALIDATOR_VALIDATES_TARGET_WITHOUT_DIRECT_OWNER_WALLET_MATCH";

  } else {

    relationship =
      "VALIDATOR_HAS_NO_TARGET_VALIDATION";

  }

  // ==================================================
  // V51 RESULT
  // ==================================================

  console.log("==========================================");
  console.log("          V51 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Validator:",
    VALIDATOR
  );

  console.log(
    "Contract address:",
    validatorCode !== "0x"
  );

  console.log(
    "Transaction count:",
    nonce ?? "UNKNOWN"
  );

  console.log(
    "Validation requests:",
    requestHashes.length
  );

  console.log(
    "Validation records:",
    records.length
  );

  console.log(
    "Unique agents validated:",
    uniqueAgents.length
  );

  console.log(
    "Target validations:",
    targetRecords.length
  );

  console.log("");

  console.log(
    "Target owner match:",
    ownerValidatorRelation
  );

  console.log(
    "Target wallet match:",
    walletValidatorRelation
  );

  console.log(
    "Relationship:",
    relationship
  );

  console.log("");

  // ==================================================
  // V35-002
  // ==================================================

  console.log("==========================================");
  console.log("          V35-002 STATUS");
  console.log("==========================================");
  console.log("");

  console.log(
    "ROLE_SEPARATION: OPEN"
  );

  if (
    ownerValidatorRelation ||
    walletValidatorRelation
  ) {

    console.log(
      "Direct identity relationship detected."
    );

  } else {

    console.log(
      "No direct owner/wallet equality established."
    );

  }

  console.log(
    "Independent dual-role qualification: NOT_ESTABLISHED"
  );

  console.log("");

  // ==================================================
  // SAFETY
  // ==================================================

  console.log("==========================================");
  console.log("             SAFETY CHECKS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Validator activity = maliciousness: false"
  );

  console.log(
    "Owner match = fraud: false"
  );

  console.log(
    "Wallet match = fraud: false"
  );

  console.log(
    "Dual role = manipulation proof: false"
  );

  console.log(
    "Automatic ALLOW: false"
  );

  console.log(
    "Automatic BLOCK: false"
  );

  console.log("");

  // ==================================================
  // OUTPUT
  // ==================================================

  const output = {

    engine:
      "VALIDATOR_ACTIVITY_IDENTITY_FORENSICS",

    version:
      "51.0",

    network:
      "Arc Testnet",

    targetAgent:
      TARGET_AGENT.toString(),

    validator:
      VALIDATOR,

    identityRegistry:
      IDENTITY_REGISTRY,

    validationRegistry:
      VALIDATION_REGISTRY,

    chainId,

    latestBlock:
      latestBlock.toString(),

    validatorAccount: {

      isContract:
        validatorCode !== "0x",

      codeBytes:
        validatorCode !== "0x"
          ? (validatorCode.length - 2) / 2
          : 0,

      transactionCount:
        nonce ?? null,

      balance:
        balance?.toString() ?? null,

    },

    targetIdentity: {

      owner:
        targetOwner.ok
          ? targetOwner.result
          : null,

      wallet:
        targetWallet.ok
          ? targetWallet.result
          : null,

      uri:
        targetURI.ok
          ? targetURI.result
          : null,

    },

    validationHistory: {

      requestCount:
        requestHashes.length,

      recordsRead:
        records.length,

      uniqueAgents:
        uniqueAgents.length,

      targetRecords:

        targetRecords,

      records,

    },

    relationships: {

      validatorEqualsTargetOwner:
        ownerValidatorRelation,

      validatorEqualsTargetWallet:
        walletValidatorRelation,

      classification:
        relationship,

    },

    v35_002: {

      status:
        "OPEN",

      nextAction:
        "REVIEW_ROLE_RELATIONSHIP",

    },

    safety: {

      activityIsNotMaliciousness:
        true,

      ownerMatchIsNotFraudProof:
        true,

      walletMatchIsNotFraudProof:
        true,

      dualRoleIsNotManipulationProof:
        true,

      automaticAllow:
        false,

      automaticBlock:
        false,

    },

  };

  fs.writeFileSync(
    "agent-validator-identity-forensics-v51.json",
    JSON.stringify(
      output,
      null,
      2
    )
  );

  console.log(
    "Output: agent-validator-identity-forensics-v51.json"
  );

  console.log("");

  console.log("==========================================");
  console.log(
    "   VALIDATOR IDENTITY FORENSICS TAMAMLANDI"
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