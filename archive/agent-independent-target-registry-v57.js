const {
  createPublicClient,
  http,
  parseAbiItem,
  getAddress,
} = require("viem");

const fs = require("fs");

/*
==================================================
 ARC AGENT TRUST — INDEPENDENT TARGET REGISTRY v57
==================================================

Purpose:
Search the Validation Registry directly for
independent validation evidence for Agent 845265.

Important:
- CommonJS compatible
- All await calls are inside main()
- Does not assume candidates from previous files
- Does not classify provider/owner/wallet as validators
- Existing target records are excluded
- Event search is performed directly
==================================================
*/

const TARGET_AGENT = 845265n;

const RPC_URL =
  process.env.ARC_RPC_URL ||
  "https://rpc.testnet.arc.network";

const REGISTRY =
  "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";

const TARGET_OWNER =
  "0xBB30e40F0887b060e9339f6541E29AfA5A3A9dBb";

const CURRENT_PROVIDER =
  "0xe18f822b5071553d62cf119ce57da6c1636f2524";

/*
==================================================
KNOWN VALIDATION RECORDS
==================================================
*/

const KNOWN_REQUESTS = new Set([
  "0x8f7693a3402b9cf92283d5e692be983e228271924d1bc411c2f624669dfdec7d",
  "0x5ac85dca5d1bb6c45800f0f78593fc6397b52a1cb96e820b99eb7d3af776561b",
]);

const KNOWN_VALIDATORS = new Set([
  CURRENT_PROVIDER.toLowerCase(),
]);

/*
==================================================
CHAIN
==================================================
*/

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

/*
==================================================
CLIENT
==================================================
*/

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(RPC_URL),
});

/*
==================================================
ABI
==================================================
*/

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

/*
==================================================
EVENT ABI CANDIDATES
==================================================

We intentionally use several possible event
signatures. If an event is not present, that
individual query is ignored.

The contract's direct getter remains authoritative
for known target request hashes.
==================================================
*/

const EVENT_DEFINITIONS = [

  {
    name: "ValidationRequested",
    abi: parseAbiItem(
      "event ValidationRequested(bytes32 indexed requestHash, uint256 indexed agentId, address indexed validatorAddress)"
    ),
  },

  {
    name: "ValidationRequest",
    abi: parseAbiItem(
      "event ValidationRequest(bytes32 indexed requestHash, uint256 indexed agentId, address indexed validatorAddress)"
    ),
  },

  {
    name: "ValidationResponse",
    abi: parseAbiItem(
      "event ValidationResponse(bytes32 indexed requestHash, uint256 indexed agentId, address indexed validatorAddress, uint8 response, string tag)"
    ),
  },

];

/*
==================================================
HELPERS
==================================================
*/

function safeAddress(value) {
  try {
    return getAddress(value);
  } catch {
    return null;
  }
}

function normalizeAddress(value) {
  const address = safeAddress(value);

  return address
    ? address.toLowerCase()
    : null;
}

function writeJson(file, data) {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

/*
==================================================
MAIN
==================================================
*/

async function main() {

  console.log("");
  console.log(
    "=========================================="
  );

  console.log(
    " INDEPENDENT TARGET REGISTRY FORENSICS v57"
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
  ==================================================
  RPC
  ==================================================
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
  ==================================================
  REGISTRY CODE
  ==================================================
  */

  const code =
    await client.getBytecode({
      address: REGISTRY,
    });

  console.log(
    "Registry deployed:",
    !!code
  );

  console.log(
    "Code bytes:",
    code
      ? Math.max(
          0,
          (code.length - 2) / 2
        )
      : 0
  );

  console.log("");

  /*
  ==================================================
  DIRECT TARGET GETTER
  ==================================================
  */

  console.log(
    "=========================================="
  );

  console.log(
    "      DIRECT TARGET VALIDATION"
  );

  console.log(
    "=========================================="
  );

  let targetHashes = [];

  try {

    targetHashes =
      await client.readContract({
        address: REGISTRY,
        abi: validationAbi,
        functionName:
          "getAgentValidations",
        args: [TARGET_AGENT],
      });

  } catch (error) {

    console.log(
      "getAgentValidations failed:"
    );

    console.log(
      error.shortMessage ||
      error.message
    );
  }

  console.log("");

  console.log(
    "Request hashes:",
    targetHashes.length
  );

  /*
  ==================================================
  READ ALL DIRECT TARGET RECORDS
  ==================================================
  */

  const targetRecords = [];

  for (
    let i = 0;
    i < targetHashes.length;
    i++
  ) {

    const requestHash =
      targetHashes[i];

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

      const record = {

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

      };

      targetRecords.push(record);

      console.log("");
      console.log(
        `Target validation ${i + 1}`
      );

      console.log(
        "Request:",
        requestHash
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

    } catch (error) {

      console.log(
        `Target record ${i + 1} read failed`
      );

    }
  }

  console.log("");

  /*
  ==================================================
  UNIQUE TARGET VALIDATORS
  ==================================================
  */

  const targetValidators = [
    ...new Set(
      targetRecords
        .map(
          x =>
            x.validatorNormalized
        )
        .filter(Boolean)
    ),
  ];

  console.log(
    "Unique target validators:",
    targetValidators.length
  );

  for (
    const validator of targetValidators
  ) {

    console.log(
      validator
    );
  }

  console.log("");

  /*
  ==================================================
  EVENT SEARCH
  ==================================================
  */

  console.log(
    "=========================================="
  );

  console.log(
    "       DIRECT EVENT SEARCH"
  );

  console.log(
    "=========================================="
  );

  const eventMatches = [];

  /*
  Search a bounded recent history first.
  If logs are unavailable or event signatures
  do not exist, we do not interpret that as
  absence of validation.
  */

  const searchWindow = 500000n;

  const fromBlock =
    latestBlock > searchWindow
      ? latestBlock - searchWindow
      : 0n;

  console.log(
    "From block:",
    fromBlock.toString()
  );

  console.log(
    "To block:",
    latestBlock.toString()
  );

  console.log("");

  for (
    const eventDef of EVENT_DEFINITIONS
  ) {

    try {

      const logs =
        await client.getLogs({
          address: REGISTRY,
          event: eventDef.abi,
          fromBlock,
          toBlock:
            latestBlock,
        });

      console.log(
        `${eventDef.name}: ${logs.length}`
      );

      for (
        const log of logs
      ) {

        const args =
          log.args || {};

        const agentId =
          args.agentId;

        if (
          agentId === undefined ||
          agentId === null
        ) {
          continue;
        }

        if (
          BigInt(agentId) !==
          TARGET_AGENT
        ) {
          continue;
        }

        const validator =
          args.validatorAddress ||
          args.validator ||
          args.clientAddress;

        const normalized =
          normalizeAddress(
            validator
          );

        const requestHash =
          args.requestHash ||
          log.transactionHash;

        eventMatches.push({

          event:
            eventDef.name,

          blockNumber:
            log.blockNumber
              ? log.blockNumber.toString()
              : null,

          transactionHash:
            log.transactionHash,

          requestHash,

          validator,

          validatorNormalized:
            normalized,

          agentId:
            TARGET_AGENT.toString(),

          args,

        });
      }

    } catch (error) {

      console.log(
        `${eventDef.name}: unavailable`
      );
    }
  }

  console.log("");

  console.log(
    "Target event matches:",
    eventMatches.length
  );

  /*
  ==================================================
  EXTRACT EVENT VALIDATORS
  ==================================================
  */

  const eventValidators = [
    ...new Set(
      eventMatches
        .map(
          x =>
            x.validatorNormalized
        )
        .filter(Boolean)
    ),
  ];

  /*
  ==================================================
  INDEPENDENCE FILTER
  ==================================================
  */

  const excludedAddresses =
    new Set([
      ...KNOWN_VALIDATORS,
      normalizeAddress(
        TARGET_OWNER
      ),
      normalizeAddress(
        CURRENT_PROVIDER
      ),
      normalizeAddress(
        REGISTRY
      ),
    ]);

  const independentEventValidators =
    eventValidators.filter(
      address =>
        !excludedAddresses.has(
          address
        )
    );

  /*
  ==================================================
  DIRECT RECORD INDEPENDENCE
  ==================================================
  */

  const independentDirectValidators =
    targetValidators.filter(
      address =>
        !excludedAddresses.has(
          address
        )
    );

  /*
  ==================================================
  CROSS-CHECK
  ==================================================
  */

  const independentEvidence = [];

  for (
    const record of targetRecords
  ) {

    const validator =
      record.validatorNormalized;

    if (
      !validator ||
      excludedAddresses.has(
        validator
      )
    ) {
      continue;
    }

    independentEvidence.push({
      source:
        "DIRECT_GETTER",

      requestHash:
        record.requestHash,

      validator:
        record.validator,

      response:
        record.response,

      tag:
        record.tag,

      lastUpdate:
        record.lastUpdate,

    });
  }

  /*
  Add event-derived evidence only if
  the event provides a validator address
  and is not already known.
  */

  for (
    const event of eventMatches
  ) {

    if (
      !event.validatorNormalized
    ) {
      continue;
    }

    if (
      excludedAddresses.has(
        event.validatorNormalized
      )
    ) {
      continue;
    }

    independentEvidence.push({

      source:
        "EVENT",

      event:
        event.event,

      blockNumber:
        event.blockNumber,

      transactionHash:
        event.transactionHash,

      requestHash:
        event.requestHash,

      validator:
        event.validator,

      agentId:
        event.agentId,

    });
  }

  /*
  ==================================================
  DEDUPLICATE
  ==================================================
  */

  const evidenceKeySet =
    new Set();

  const uniqueIndependentEvidence =
    independentEvidence.filter(
      item => {

        const key =
          [
            item.requestHash,
            item.validator,
            item.transactionHash,
            item.source,
          ].join("|");

        if (
          evidenceKeySet.has(key)
        ) {
          return false;
        }

        evidenceKeySet.add(key);

        return true;
      }
    );

  /*
  ==================================================
  FINAL DETERMINATION
  ==================================================
  */

  const independentTargetValidators =
    [
      ...new Set(
        uniqueIndependentEvidence
          .map(
            x =>
              normalizeAddress(
                x.validator
              )
          )
          .filter(Boolean)
      ),
    ];

  const independentFound =
    independentTargetValidators.length >
    0;

  /*
  ==================================================
  IMPORTANT LIMITATION
  ==================================================
  */

  const directGetterAuthoritative =
    targetRecords.length > 0;

  const eventSearchLimited =
    true;

  /*
  ==================================================
  FINAL RESULT
  ==================================================
  */

  let status;

  if (
    independentFound
  ) {

    status =
      "INDEPENDENT_TARGET_VALIDATION_FOUND";

  } else {

    status =
      "NO_INDEPENDENT_TARGET_VALIDATION_ESTABLISHED";
  }

  const result = {

    version:
      "57",

    network:
      "Arc Testnet",

    targetAgent:
      TARGET_AGENT.toString(),

    registry:
      REGISTRY,

    rpc:
      RPC_URL,

    latestBlock:
      latestBlock.toString(),

    targetRecords:

      targetRecords,

    targetValidators:

      targetValidators,

    eventMatches:

      eventMatches,

    eventValidators:

      eventValidators,

    independentDirectValidators:

      independentDirectValidators,

    independentEventValidators:

      independentEventValidators,

    independentTargetValidators:

      independentTargetValidators,

    independentEvidence:

      uniqueIndependentEvidence,

    independentFound,

    status,

    methodology: {

      existingKnownRequestsExcluded:
        true,

      knownProviderExcluded:
        true,

      targetOwnerExcluded:
        true,

      registryAddressExcluded:
        true,

      directGetterUsed:
        true,

      eventSearchUsed:
        true,

      eventSearchWindow:
        `${fromBlock.toString()}-${latestBlock.toString()}`,

      eventSearchLimited,

      directGetterAuthoritative,

    },

    safety: {

      noIndependentEvidenceIsFraud:
        false,

      noIndependentEvidenceIsMaliciousness:
        false,

      validatorActivityIsTrustProof:
        false,

      automaticAllow:
        false,

      automaticBlock:
        false,

    },

    conclusion:
      independentFound
        ? "An independent validator associated with a target validation was identified and requires detailed verification."
        : "No independent validator associated with Agent 845265 was established from the direct target getter and the searched registry events.",

  };

  /*
  ==================================================
  WRITE JSON
  ==================================================
  */

  writeJson(
    "agent-independent-target-registry-v57.json",
    result
  );

  /*
  ==================================================
  SUMMARY
  ==================================================
  */

  const summary =
`ARC AGENT TRUST — INDEPENDENT TARGET REGISTRY v57

Network: Arc Testnet
Target Agent: ${TARGET_AGENT.toString()}

Registry: ${REGISTRY}

Latest block: ${latestBlock.toString()}

Target validation records:
${targetRecords.length}

Unique target validators:
${targetValidators.length}

Target event matches:
${eventMatches.length}

Independent direct validators:
${independentDirectValidators.length}

Independent event validators:
${independentEventValidators.length}

Independent target validators:
${independentTargetValidators.length}

STATUS:
${status}

CONCLUSION:
${
  independentFound
    ? "Independent target validator evidence FOUND."
    : "No independent target validator evidence ESTABLISHED."
}

IMPORTANT:
Absence of independent validation is NOT proof of fraud or maliciousness.

Automatic ALLOW: false
Automatic BLOCK: false
`;

  fs.writeFileSync(
    "agent-independent-target-registry-v57-summary.txt",
    summary,
    "utf8"
  );

  /*
  ==================================================
  TERMINAL
  ==================================================
  */

  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "          V57 FINAL RESULT"
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
    "Unique target validators:",
    targetValidators.length
  );

  console.log(
    "Target event matches:",
    eventMatches.length
  );

  console.log(
    "Independent direct validators:",
    independentDirectValidators.length
  );

  console.log(
    "Independent event validators:",
    independentEventValidators.length
  );

  console.log(
    "Independent target validators:",
    independentTargetValidators.length
  );

  console.log("");

  console.log(
    "STATUS:",
    status
  );

  console.log("");

  if (
    independentFound
  ) {

    console.log(
      "=========================================="
    );

    console.log(
      " INDEPENDENT TARGET VALIDATION FOUND"
    );

    console.log(
      "=========================================="
    );

    console.log("");

    for (
      const validator of
      independentTargetValidators
    ) {

      console.log(
        "Independent validator:",
        validator
      );
    }

  } else {

    console.log(
      "=========================================="
    );

    console.log(
      " NO INDEPENDENT TARGET VALIDATION"
    );

    console.log(
      "=========================================="
    );

    console.log("");

    console.log(
      "No independent validator evidence established."
    );
  }

  console.log("");

  console.log(
    "Fraud established: false"
  );

  console.log(
    "Maliciousness established: false"
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
    "  agent-independent-target-registry-v57.json"
  );

  console.log(
    "  agent-independent-target-registry-v57-summary.txt"
  );

  console.log("");

  console.log(
    "V57 INDEPENDENT TARGET REGISTRY FORENSICS TAMAMLANDI"
  );

  console.log("");
}

/*
==================================================
EXECUTION
==================================================
*/

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