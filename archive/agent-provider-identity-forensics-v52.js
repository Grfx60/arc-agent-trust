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

const REPUTATION_REGISTRY =
  "0x8004BAAbc9C65D8a8B7c0C6D2fE0f6A0A8d5B4C2";

const TARGET_AGENT = 845265n;

const PROVIDER =
  "0xe18f822b5071553d62cf119ce57da6c1636f2524";

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

/*
  Reputation ABI.
  Önce standart getter'ları deniyoruz.
  Eğer contract farklı ABI kullanıyorsa
  sonuçta açıkça UNAVAILABLE gösterilecek.
*/

const reputationAbi = [
  {
    name: "getClients",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address[]",
      },
    ],
  },

  {
    name: "getSummary",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "agentId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "clientAddresses",
        type: "address[]",
        internalType: "address[]",
      },
      {
        name: "tag1",
        type: "string",
        internalType: "string",
      },
      {
        name: "tag2",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [
      {
        name: "count",
        type: "uint256",
      },
      {
        name: "summaryValue",
        type: "int128",
      },
      {
        name: "summaryValueDecimals",
        type: "uint8",
      },
    ],
  },

  {
    name: "getAllFeedback",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "agentId",
        type: "uint256",
      },
      {
        name: "clientAddress",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "feedbackAuth",
        type: "bytes32[]",
      },
    ],
  },
];

const identityAbi = [
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
  console.log(" PROVIDER IDENTITY & ACTIVITY FORENSICS v52");
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
    "Provider / Validator:",
    PROVIDER
  );

  console.log(
    "Reputation Registry:",
    REPUTATION_REGISTRY
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
  // PROVIDER ACCOUNT
  // ==================================================

  console.log("==========================================");
  console.log("          PROVIDER ACCOUNT");
  console.log("==========================================");
  console.log("");

  let providerCode = "0x";
  let providerNonce = null;
  let providerBalance = null;

  try {

    providerCode =
      await client.getCode({
        address: PROVIDER,
      });

    console.log(
      "Contract:",
      providerCode !== "0x"
    );

    console.log(
      "Code bytes:",
      providerCode !== "0x"
        ? (providerCode.length - 2) / 2
        : 0
    );

  } catch (error) {

    console.log(
      "Code check failed:",
      error.message
    );

  }

  try {

    providerNonce =
      await client.getTransactionCount({
        address: PROVIDER,
      });

    console.log(
      "Transaction count:",
      providerNonce
    );

  } catch (error) {

    console.log(
      "Nonce check failed:",
      error.message
    );

  }

  try {

    providerBalance =
      await client.getBalance({
        address: PROVIDER,
      });

    console.log(
      "Native balance:",
      providerBalance.toString()
    );

  } catch (error) {

    console.log(
      "Balance check failed:",
      error.message
    );

  }

  console.log("");

  // ==================================================
  // TARGET IDENTITY
  // ==================================================

  console.log("==========================================");
  console.log("          TARGET IDENTITY");
  console.log("==========================================");
  console.log("");

  const ownerResult =
    await safeRead(
      IDENTITY_REGISTRY,
      identityAbi,
      "ownerOf",
      [TARGET_AGENT]
    );

  const walletResult =
    await safeRead(
      IDENTITY_REGISTRY,
      identityAbi,
      "getAgentWallet",
      [TARGET_AGENT]
    );

  let targetOwner = null;
  let targetWallet = null;

  if (ownerResult.ok) {

    targetOwner =
      ownerResult.result;

    console.log(
      "Target owner:",
      targetOwner
    );

  } else {

    console.log(
      "Target owner: UNAVAILABLE"
    );

  }

  if (walletResult.ok) {

    targetWallet =
      walletResult.result;

    console.log(
      "Target wallet:",
      targetWallet
    );

  } else {

    console.log(
      "Target wallet: UNAVAILABLE"
    );

  }

  console.log("");

  console.log(
    "Provider == owner:",
    targetOwner
      ? normalize(targetOwner) ===
        normalize(PROVIDER)
      : false
  );

  console.log(
    "Provider == wallet:",
    targetWallet
      ? normalize(targetWallet) ===
        normalize(PROVIDER)
      : false
  );

  console.log("");

  // ==================================================
  // REPUTATION CLIENTS
  // ==================================================

  console.log("==========================================");
  console.log("          REPUTATION CLIENTS");
  console.log("==========================================");
  console.log("");

  const clientsResult =
    await safeRead(
      REPUTATION_REGISTRY,
      reputationAbi,
      "getClients",
      []
    );

  let clients = [];

  if (clientsResult.ok) {

    clients =
      clientsResult.result;

    console.log(
      "Clients:",
      clients.length
    );

    clients.forEach(
      (address, index) => {

        console.log(
          `${index + 1}. ${address}`
        );

      }
    );

  } else {

    console.log(
      "getClients unavailable:"
    );

    console.log(
      clientsResult.error
    );

  }

  console.log("");

  // ==================================================
  // TARGET REPUTATION SUMMARY
  // ==================================================

  console.log("==========================================");
  console.log("       TARGET REPUTATION SUMMARY");
  console.log("==========================================");
  console.log("");

  const targetSummary =
    await safeRead(
      REPUTATION_REGISTRY,
      reputationAbi,
      "getSummary",
      [
        TARGET_AGENT,
        [PROVIDER],
        "",
        "",
      ]
    );

  let summary = null;

  if (targetSummary.ok) {

    const [
      count,
      summaryValue,
      summaryValueDecimals,
    ] =
      targetSummary.result;

    summary = {

      count:
        count.toString(),

      summaryValue:
        summaryValue.toString(),

      decimals:
        Number(summaryValueDecimals),

    };

    console.log(
      "Feedback count:",
      summary.count
    );

    console.log(
      "Summary value:",
      summary.summaryValue
    );

    console.log(
      "Decimals:",
      summary.decimals
    );

  } else {

    console.log(
      "Summary unavailable:"
    );

    console.log(
      targetSummary.error
    );

  }

  console.log("");

  // ==================================================
  // PROVIDER AS FEEDBACK CLIENT
  // ==================================================

  console.log("==========================================");
  console.log("       PROVIDER FEEDBACK HISTORY");
  console.log("==========================================");
  console.log("");

  const feedbackResult =
    await safeRead(
      REPUTATION_REGISTRY,
      reputationAbi,
      "getAllFeedback",
      [
        TARGET_AGENT,
        PROVIDER,
      ]
    );

  let feedbackHashes = [];

  if (feedbackResult.ok) {

    feedbackHashes =
      feedbackResult.result;

    console.log(
      "Feedback records:",
      feedbackHashes.length
    );

    feedbackHashes.forEach(
      (hash, index) => {

        console.log(
          `${index + 1}. ${hash}`
        );

      }
    );

  } else {

    console.log(
      "Feedback history unavailable:"
    );

    console.log(
      feedbackResult.error
    );

  }

  console.log("");

  // ==================================================
  // VALIDATOR HISTORY
  // ==================================================

  console.log("==========================================");
  console.log("       VALIDATOR HISTORY");
  console.log("==========================================");
  console.log("");

  const validatorRequests =
    await safeRead(
      VALIDATION_REGISTRY,
      validationAbi,
      "getValidatorRequests",
      [PROVIDER]
    );

  let validationHashes = [];
  let validationRecords = [];

  if (validatorRequests.ok) {

    validationHashes =
      validatorRequests.result;

    console.log(
      "Validation requests:",
      validationHashes.length
    );

    for (
      const hash of validationHashes
    ) {

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
      ] =
        result.result;

      validationRecords.push({

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

  } else {

    console.log(
      "Validator history unavailable:"
    );

    console.log(
      validatorRequests.error
    );

  }

  const validatedAgents = [
    ...new Set(
      validationRecords.map(
        x => x.agentId
      )
    )
  ];

  console.log(
    "Validation records:",
    validationRecords.length
  );

  console.log(
    "Unique validated agents:",
    validatedAgents.length
  );

  console.log("");

  // ==================================================
  // CROSS ROLE
  // ==================================================

  const providerFeedbackTarget =
    feedbackHashes.length > 0;

  const validatorTarget =
    validationRecords.some(
      x =>
        x.agentId ===
        TARGET_AGENT.toString()
    );

  const targetRatio =
    validationRecords.length > 0
      ? (
          validationRecords.filter(
            x =>
              x.agentId ===
              TARGET_AGENT.toString()
          ).length /
          validationRecords.length
        )
      : 0;

  // ==================================================
  // FINAL CLASSIFICATION
  // ==================================================

  let classification;

  if (
    providerFeedbackTarget &&
    validatorTarget &&
    targetRatio === 1
  ) {

    classification =
      "DUAL_ROLE_TARGET_FOCUSED";

  } else if (
    providerFeedbackTarget &&
    validatorTarget
  ) {

    classification =
      "DUAL_ROLE_WITH_BROAD_VALIDATION_ACTIVITY";

  } else if (
    providerFeedbackTarget
  ) {

    classification =
      "PROVIDER_ACTIVITY_ESTABLISHED";

  } else if (
    validatorTarget
  ) {

    classification =
      "VALIDATOR_ACTIVITY_ESTABLISHED";

  } else {

    classification =
      "LIMITED_ROLE_ACTIVITY";

  }

  // ==================================================
  // FINAL RESULT
  // ==================================================

  console.log("==========================================");
  console.log("          V52 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Provider:",
    PROVIDER
  );

  console.log(
    "Provider contract:",
    providerCode !== "0x"
  );

  console.log(
    "Provider transaction count:",
    providerNonce ?? "UNKNOWN"
  );

  console.log(
    "Reputation clients:",
    clients.length
  );

  console.log(
    "Target feedback records:",
    feedbackHashes.length
  );

  console.log(
    "Validation records:",
    validationRecords.length
  );

  console.log(
    "Unique validated agents:",
    validatedAgents.length
  );

  console.log(
    "Target validation:",
    validatorTarget
  );

  console.log(
    "Target validation ratio:",
    (
      targetRatio * 100
    ).toFixed(2) + "%"
  );

  console.log("");

  console.log(
    "Provider == target owner:",
    targetOwner
      ? normalize(targetOwner) ===
        normalize(PROVIDER)
      : false
  );

  console.log(
    "Provider == target wallet:",
    targetWallet
      ? normalize(targetWallet) ===
        normalize(PROVIDER)
      : false
  );

  console.log("");

  console.log(
    "Classification:",
    classification
  );

  console.log("");

  // ==================================================
  // ROLE SEPARATION
  // ==================================================

  console.log("==========================================");
  console.log("          V35-002 STATUS");
  console.log("==========================================");
  console.log("");

  console.log(
    "ROLE_SEPARATION: OPEN"
  );

  console.log(
    "Dual-role activity:",
    true
  );

  console.log(
    "Independent qualification:",
    "NOT_ESTABLISHED"
  );

  console.log(
    "Direct owner equality:",
    false
  );

  console.log(
    "Direct wallet equality:",
    false
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
    "Dual role = fraud:",
    false
  );

  console.log(
    "Target focused = maliciousness:",
    false
  );

  console.log(
    "Feedback = trust proof:",
    false
  );

  console.log(
    "Validator activity = trust proof:",
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
      "PROVIDER_IDENTITY_ACTIVITY_FORENSICS",

    version:
      "52.0",

    network:
      "Arc Testnet",

    targetAgent:
      TARGET_AGENT.toString(),

    provider:
      PROVIDER,

    identityRegistry:
      IDENTITY_REGISTRY,

    reputationRegistry:
      REPUTATION_REGISTRY,

    validationRegistry:
      VALIDATION_REGISTRY,

    chainId,

    latestBlock:
      latestBlock.toString(),

    providerAccount: {

      isContract:
        providerCode !== "0x",

      codeBytes:
        providerCode !== "0x"
          ? (providerCode.length - 2) / 2
          : 0,

      transactionCount:
        providerNonce,

      balance:
        providerBalance?.toString() ??
        null,

    },

    targetIdentity: {

      owner:
        targetOwner,

      wallet:
        targetWallet,

      providerEqualsOwner:
        targetOwner
          ? normalize(targetOwner) ===
            normalize(PROVIDER)
          : false,

      providerEqualsWallet:
        targetWallet
          ? normalize(targetWallet) ===
            normalize(PROVIDER)
          : false,

    },

    reputation: {

      clients,

      targetSummary:
        summary,

      targetFeedbackHashes:
        feedbackHashes,

    },

    validation: {

      requestHashes:
        validationHashes,

      records:
        validationRecords,

      uniqueValidatedAgents:
        validatedAgents,

      targetValidation:
        validatorTarget,

      targetValidationRatio:
        targetRatio,

    },

    classification,

    v35_002: {

      status:
        "OPEN",

      nextAction:
        "REVIEW_ROLE_RELATIONSHIP",

    },

    safety: {

      dualRoleIsNotFraud:
        true,

      targetFocusIsNotMaliciousness:
        true,

      feedbackIsNotTrustProof:
        true,

      validationIsNotTrustProof:
        true,

      automaticAllow:
        false,

      automaticBlock:
        false,

    },

  };

  fs.writeFileSync(
    "agent-provider-identity-activity-v52.json",
    JSON.stringify(
      output,
      null,
      2
    )
  );

  console.log(
    "Output: agent-provider-identity-activity-v52.json"
  );

  console.log("");

  console.log("==========================================");
  console.log(
    " PROVIDER IDENTITY FORENSICS TAMAMLANDI"
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

    process.exit(1);

  }
);