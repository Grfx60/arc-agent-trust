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

const CANDIDATES = [
  "0x6f17f1a69ce4cb1828ee95d6b4b426050d49e05e",
  "0xb152c3b6436318ad340153f1d30c9bbb8634681a",
  "0x415fb8814084bdbc7b6964620ba5be5939ad2333",
  "0x9c6d75628bd6c18258ac1125f32dfbced59e8a1d",
  "0xb3cf6b5a6aa8ed4e1309fd0631deb6cb06b7afca",
  "0xbefef9cdcbebf78d1ede55ea37e33690938daea8",
  "0x19762748a5e03dfe3dd9c4ddca6818d44f3c866c",
];

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

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

function sleep(ms) {
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}

async function readValidator(validator) {

  const result = {
    validator,
    requestCount: 0,
    recordsRead: 0,
    targetMatches: [],
    errors: [],
  };

  try {

    const hashes =
      await client.readContract({
        address: REGISTRY,
        abi,
        functionName: "getValidatorRequests",
        args: [validator],
      });

    result.requestCount =
      hashes.length;

    console.log(
      `   Requests: ${hashes.length}`
    );

    for (
      let i = 0;
      i < hashes.length;
      i++
    ) {

      const hash =
        hashes[i];

      try {

        const data =
          await client.readContract({
            address: REGISTRY,
            abi,
            functionName: "getValidationStatus",
            args: [hash],
          });

        const [
          validatorAddress,
          agentId,
          response,
          responseHash,
          tag,
          lastUpdate,
        ] = data;

        result.recordsRead++;

        if (
          agentId === TARGET_AGENT
        ) {

          const match = {
            requestHash: hash,
            validatorAddress,
            agentId:
              agentId.toString(),
            response:
              Number(response),
            responseHash,
            tag,
            lastUpdate:
              lastUpdate.toString(),
          };

          result.targetMatches.push(
            match
          );

          console.log("");
          console.log(
            "   🎯 TARGET FOUND!"
          );
          console.log(
            "   Agent:",
            agentId.toString()
          );
          console.log(
            "   Validator:",
            validatorAddress
          );
          console.log(
            "   Response:",
            response.toString()
          );
          console.log(
            "   Tag:",
            tag
          );
          console.log(
            "   Request:",
            hash
          );
          console.log("");

        }

      } catch (error) {

        result.errors.push({
          requestHash: hash,
          error: error.message,
        });

      }

      await sleep(25);
    }

  } catch (error) {

    result.errors.push({
      stage: "getValidatorRequests",
      error: error.message,
    });

  }

  return result;
}

async function main() {

  console.log("");
  console.log("==========================================");
  console.log(" INDEPENDENT TARGET VALIDATOR SCAN v49");
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
    "Registry:",
    REGISTRY
  );

  console.log(
    "Candidates:",
    CANDIDATES.length
  );

  console.log("");

  // RPC
  console.log("==========================================");
  console.log("          RPC CONNECTIVITY");
  console.log("==========================================");
  console.log("");

  const chainId =
    await client.getChainId();

  const block =
    await client.getBlockNumber();

  console.log(
    "Chain ID:",
    chainId
  );

  console.log(
    "Latest block:",
    block.toString()
  );

  console.log("");

  // Scan
  console.log("==========================================");
  console.log("       CANDIDATE VALIDATOR SCAN");
  console.log("==========================================");
  console.log("");

  const results = [];

  for (
    let i = 0;
    i < CANDIDATES.length;
    i++
  ) {

    const validator =
      CANDIDATES[i];

    console.log(
      `[${i + 1}/${CANDIDATES.length}] ${validator}`
    );

    const result =
      await readValidator(
        validator
      );

    results.push(
      result
    );

    console.log(
      `   Records read: ${result.recordsRead}`
    );

    console.log(
      `   Target matches: ${result.targetMatches.length}`
    );

    console.log("");

  }

  // Results
  const targetValidatorResults =
    results.filter(
      x =>
        x.targetMatches.length > 0
    );

  const independentTargetValidators =
    targetValidatorResults.filter(
      x =>
        x.validator.toLowerCase() !==
        CURRENT_VALIDATOR.toLowerCase()
    );

  console.log("==========================================");
  console.log("          V49 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agent:",
    TARGET_AGENT.toString()
  );

  console.log(
    "Candidates scanned:",
    CANDIDATES.length
  );

  console.log(
    "Validators with target evidence:",
    targetValidatorResults.length
  );

  console.log(
    "Independent target validators:",
    independentTargetValidators.length
  );

  console.log("");

  if (
    independentTargetValidators.length > 0
  ) {

    console.log(
      "🟢 INDEPENDENT TARGET VALIDATOR FOUND"
    );

    for (
      const item of
      independentTargetValidators
    ) {

      console.log("");
      console.log(
        "Validator:",
        item.validator
      );

      for (
        const match of
        item.targetMatches
      ) {

        console.log(
          "  Request:",
          match.requestHash
        );

        console.log(
          "  Response:",
          match.response
        );

        console.log(
          "  Tag:",
          match.tag
        );

      }

    }

  } else {

    console.log(
      "🟡 NO INDEPENDENT TARGET VALIDATOR FOUND"
    );

  }

  console.log("");

  console.log("==========================================");
  console.log("          V35-001 STATUS");
  console.log("==========================================");
  console.log("");

  let status;
  let nextAction;

  if (
    independentTargetValidators.length > 0
  ) {

    status =
      "RESOLVED";

    nextAction =
      "RECALCULATE_INDEPENDENCE";

  } else {

    status =
      "OPEN";

    nextAction =
      "SEEK_TARGET_VALIDATION";

  }

  console.log(
    "Status:",
    status
  );

  console.log(
    "Next action:",
    nextAction
  );

  console.log("");

  console.log("==========================================");
  console.log("             SAFETY CHECKS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Candidate = target validation proof:",
    false
  );

  console.log(
    "Target validation = automatic trust:",
    false
  );

  console.log(
    "No alternative validator = fraud:",
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

  const output = {

    engine:
      "INDEPENDENT_TARGET_VALIDATOR_SCAN",

    version:
      "49.0",

    network:
      "Arc Testnet",

    targetAgent:
      TARGET_AGENT.toString(),

    registry:
      REGISTRY,

    currentValidator:
      CURRENT_VALIDATOR,

    candidates:
      CANDIDATES,

    chainId,

    latestBlock:
      block.toString(),

    results,

    targetValidators:
      targetValidatorResults.map(
        x => x.validator
      ),

    independentTargetValidators:
      independentTargetValidators.map(
        x => x.validator
      ),

    v35_001: {
      status,
      nextAction,
    },

    safety: {
      candidateIsNotProof:
        true,
      targetValidationIsNotAutomaticTrust:
        true,
      noAlternativeValidatorIsNotFraud:
        true,
      automaticAllow:
        false,
      automaticBlock:
        false,
    },

  };

  fs.writeFileSync(
    "agent-independent-target-validator-v49.json",
    JSON.stringify(
      output,
      null,
      2
    )
  );

  console.log("");
  console.log(
    "Output: agent-independent-target-validator-v49.json"
  );
  console.log("");

  console.log("==========================================");
  console.log(
    "    V49 VALIDATOR TARAMASI TAMAMLANDI"
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