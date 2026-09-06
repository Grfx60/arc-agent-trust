const fs = require("fs");

const TARGET_AGENT = 845265;

const IDENTITY_REGISTRY =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const VALIDATION_REGISTRY =
  process.env.VALIDATION_REGISTRY ||
  "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";

const REPUTATION_REGISTRY =
  process.env.REPUTATION_REGISTRY || "";

const RPC_URL =
  process.env.ARC_RPC_URL ||
  "https://rpc.testnet.arc.network";

const TARGET_VALIDATOR =
  "0xe18f822b5071553d62cf119ce57da6c1636f2524";

const V39_FILE =
  "agent-independent-validator-v39.json";

const V40_FILE =
  "agent-validator-behavior-v40.json";

const OUTPUT_FILE =
  "agent-provider-validator-correlation-v41.json";


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


const REPUTATION_ABI = [
  {
    name: "getClients",
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
        name: "clients",
        type: "address[]"
      }
    ]
  },
  {
    name: "getSummary",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "agentId",
        type: "uint256"
      },
      {
        name: "clientAddresses",
        type: "address[]"
      },
      {
        name: "tag1",
        type: "string"
      },
      {
        name: "tag2",
        type: "string"
      }
    ],
    outputs: [
      {
        name: "count",
        type: "uint64"
      },
      {
        name: "summaryValue",
        type: "int128"
      },
      {
        name: "summaryValueDecimals",
        type: "uint8"
      }
    ]
  }
];


function loadJSON(file) {

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


function normalize(value) {

  if (!value) {
    return "";
  }

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


async function main() {

  console.log("");
  console.log("==========================================");
  console.log(" PROVIDER / VALIDATOR CORRELATION v41");
  console.log("==========================================");
  console.log("");

  console.log(
    "Network: Arc Testnet"
  );

  console.log(
    "Target Agent:",
    TARGET_AGENT
  );

  console.log(
    "Target Validator:",
    TARGET_VALIDATOR
  );

  console.log("");


  // ==========================================
  // REPUTATION REGISTRY CHECK
  // ==========================================

  if (!REPUTATION_REGISTRY) {

    console.log("==========================================");
    console.log("      REPUTATION REGISTRY REQUIRED");
    console.log("==========================================");
    console.log("");

    console.log(
      "❌ REPUTATION_REGISTRY bulunamadı."
    );

    console.log("");

    console.log(
      "Önce gerçek Arc Testnet Reputation Registry"
    );

    console.log(
      "adresini environment variable olarak gir:"
    );

    console.log("");

    console.log(
      '$env:REPUTATION_REGISTRY="0x..."'
    );

    console.log("");

    console.log(
      "Sonra V41'i tekrar çalıştır."
    );

    console.log("");

    const output = {

      schemaVersion:
        "4.1",

      engine:
        "PROVIDER_VALIDATOR_CORRELATION",

      agent:
        TARGET_AGENT,

      status:
        "BLOCKED_CONFIGURATION",

      reason:
        "REPUTATION_REGISTRY address not configured",

      safety: {

        noOverlapAssumed:
          true,

        noAutomaticAllow:
          true,

        noAutomaticBlock:
          true

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

    console.log(
      "📁 Output:",
      OUTPUT_FILE
    );

    return;
  }


  let viem;

  try {

    viem =
      require("viem");

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

        name:
          "Arc Testnet",

        nativeCurrency: {

          name:
            "USDC",

          symbol:
            "USDC",

          decimals:
            6

        },

        rpcUrls: {

          default: {

            http: [
              RPC_URL
            ]

          }

        }

      },

      transport:
        http(RPC_URL)

    });


  const reputationRegistry =
    getAddress(
      REPUTATION_REGISTRY
    );

  const validationRegistry =
    getAddress(
      VALIDATION_REGISTRY
    );


  // ==========================================
  // STEP 1 — REPUTATION CLIENTS
  // ==========================================

  console.log("==========================================");
  console.log("     STEP 1 — REPUTATION PROVIDERS");
  console.log("==========================================");
  console.log("");

  let reputationClients = [];

  try {

    reputationClients =
      await client.readContract({

        address:
          reputationRegistry,

        abi:
          REPUTATION_ABI,

        functionName:
          "getClients",

        args: [
          BigInt(TARGET_AGENT)
        ]

      });

  } catch (error) {

    console.log(
      "❌ Reputation clients okunamadı."
    );

    console.log(
      error.shortMessage ||
      error.message ||
      String(error)
    );

    return;
  }


  reputationClients =
    unique(
      reputationClients
    );


  console.log(
    "Reputation providers:",
    reputationClients.length
  );

  for (
    const provider
    of reputationClients
  ) {

    console.log(
      provider
    );

  }

  console.log("");


  // ==========================================
  // STEP 2 — TARGET VALIDATORS
  // ==========================================

  console.log("==========================================");
  console.log("       STEP 2 — VALIDATORS");
  console.log("==========================================");
  console.log("");

  let requestHashes = [];

  try {

    requestHashes =
      await client.readContract({

        address:
          validationRegistry,

        abi:
          VALIDATION_ABI,

        functionName:
          "getAgentValidations",

        args: [
          BigInt(TARGET_AGENT)
        ]

      });

  } catch (error) {

    console.log(
      "❌ Validation kayıtları okunamadı."
    );

    console.log(
      error.shortMessage ||
      error.message ||
      String(error)
    );

    return;
  }


  const validationRecords = [];


  for (
    const hash
    of requestHashes
  ) {

    try {

      const result =
        await client.readContract({

          address:
            validationRegistry,

          abi:
            VALIDATION_ABI,

          functionName:
            "getValidationStatus",

          args: [
            hash
          ]

        });


      validationRecords.push({

        requestHash:
          hash,

        validator:
          normalize(
            result[0]
          ),

        agentId:
          result[1].toString(),

        response:
          Number(
            result[2]
          ),

        responseHash:
          result[3],

        tag:
          result[4],

        lastUpdate:
          result[5].toString()

      });

    } catch {}

  }


  const validators =
    unique(
      validationRecords.map(
        record =>
          record.validator
      )
    );


  console.log(
    "Validation records:",
    validationRecords.length
  );

  console.log(
    "Unique validators:",
    validators.length
  );

  for (
    const validator
    of validators
  ) {

    console.log(
      validator
    );

  }

  console.log("");


  // ==========================================
  // STEP 3 — DIRECT OVERLAP
  // ==========================================

  console.log("==========================================");
  console.log("        STEP 3 — DIRECT OVERLAP");
  console.log("==========================================");
  console.log("");


  const overlap =
    reputationClients.filter(
      address =>
        validators.includes(
          address
        )
    );


  console.log(
    "Direct provider/validator overlap:",
    overlap.length
  );


  if (
    overlap.length
  ) {

    for (
      const address
      of overlap
    ) {

      console.log(
        "OVERLAP:",
        address
      );

    }

  } else {

    console.log(
      "No direct overlap found."
    );

  }

  console.log("");


  // ==========================================
  // STEP 4 — TARGET VALIDATOR CHECK
  // ==========================================

  const targetValidatorNormalized =
    normalize(
      TARGET_VALIDATOR
    );


  const targetIsProvider =
    reputationClients.includes(
      targetValidatorNormalized
    );

  const targetIsValidator =
    validators.includes(
      targetValidatorNormalized
    );


  console.log("==========================================");
  console.log("      STEP 4 — TARGET VALIDATOR");
  console.log("==========================================");
  console.log("");


  console.log(
    "Target validator:",
    targetValidatorNormalized
  );

  console.log(
    "Is validator:",
    targetIsValidator
  );

  console.log(
    "Is reputation provider:",
    targetIsProvider
  );

  console.log("");


  // ==========================================
  // STEP 5 — REPUTATION SUMMARY
  // ==========================================

  console.log("==========================================");
  console.log("       STEP 5 — PROVIDER SIGNAL");
  console.log("==========================================");
  console.log("");


  let reputationSummary = null;


  if (
    targetIsProvider
  ) {

    try {

      const summary =
        await client.readContract({

          address:
            reputationRegistry,

          abi:
            REPUTATION_ABI,

          functionName:
            "getSummary",

          args: [

            BigInt(
              TARGET_AGENT
            ),

            [
              getAddress(
                targetValidatorNormalized
              )
            ],

            "",

            ""

          ]

        });


      reputationSummary = {

        count:
          Number(
            summary[0]
          ),

        summaryValue:
          summary[1].toString(),

        summaryValueDecimals:
          Number(
            summary[2]
          )

      };


      console.log(
        "Feedback count:",
        reputationSummary.count
      );

      console.log(
        "Summary value:",
        reputationSummary.summaryValue
      );

      console.log(
        "Decimals:",
        reputationSummary.summaryValueDecimals
      );

    } catch (error) {

      console.log(
        "Reputation summary okunamadı."
      );

      console.log(
        error.shortMessage ||
        error.message ||
        String(error)
      );

    }

  } else {

    console.log(
      "Target validator reputation provider değil."
    );

  }

  console.log("");


  // ==========================================
  // STEP 6 — V28.1 COMPARISON
  // ==========================================

  const v28 =
    loadJSON(
      "agent-evidence-independence-v28-1.json"
    );


  const oldOverlap =
    Number(
      v28
        ?.verifiedEvidence
        ?.overlappingActors ||
      0
    );


  // ==========================================
  // FINAL CLASSIFICATION
  // ==========================================

  let correlation =
    "NO_DIRECT_OVERLAP";


  if (
    overlap.length > 0
  ) {

    correlation =
      "DIRECT_PROVIDER_VALIDATOR_OVERLAP";

  }


  let v35Task =
    "OPEN";


  if (
    overlap.length === 0
  ) {

    v35Task =
      "POTENTIALLY_RESOLVED";

  }


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "4.1",

    engine:
      "PROVIDER_VALIDATOR_CORRELATION",

    generatedAt:
      new Date().toISOString(),

    network:
      "Arc Testnet",

    agent:
      TARGET_AGENT,

    registries: {

      identity:
        IDENTITY_REGISTRY,

      validation:
        validationRegistry,

      reputation:
        reputationRegistry

    },

    reputation: {

      providers:
        reputationClients,

      count:
        reputationClients.length

    },

    validation: {

      records:
        validationRecords,

      validators:
        validators,

      count:
        validators.length

    },

    correlation: {

      directOverlap:
        overlap,

      overlapCount:
        overlap.length,

      classification:
        correlation

    },

    targetValidator: {

      address:
        targetValidatorNormalized,

      isValidator:
        targetIsValidator,

      isReputationProvider:
        targetIsProvider,

      reputationSummary

    },

    comparison: {

      previousV28_1Overlap:
        oldOverlap,

      currentDirectOverlap:
        overlap.length

    },

    v35_002: {

      task:
        "ROLE_SEPARATION",

      status:
        v35Task

    },

    safety: {

      providerValidatorOverlapIsNotFraud:
        true,

      sameActorDoesNotProveMaliciousness:
        true,

      absenceOfOverlapDoesNotProveIndependence:
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
  console.log("          V41 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agent:",
    TARGET_AGENT
  );

  console.log(
    "Reputation providers:",
    reputationClients.length
  );

  console.log(
    "Validation validators:",
    validators.length
  );

  console.log(
    "Direct overlap:",
    overlap.length
  );

  console.log(
    "Old V28.1 overlap:",
    oldOverlap
  );

  console.log("");

  console.log("==========================================");
  console.log("       TARGET VALIDATOR");
  console.log("==========================================");
  console.log("");

  console.log(
    "Validator:",
    targetValidatorNormalized
  );

  console.log(
    "Is validator:",
    targetIsValidator
  );

  console.log(
    "Is reputation provider:",
    targetIsProvider
  );

  if (
    reputationSummary
  ) {

    console.log(
      "Feedback count:",
      reputationSummary.count
    );

    console.log(
      "Summary:",
      reputationSummary.summaryValue
    );

  }

  console.log("");

  console.log("==========================================");
  console.log("          CORRELATION");
  console.log("==========================================");
  console.log("");

  console.log(
    "Classification:",
    correlation
  );

  console.log(
    "Overlap addresses:",
    overlap.length
  );

  for (
    const address
    of overlap
  ) {

    console.log(
      address
    );

  }

  console.log("");

  console.log("==========================================");
  console.log("          V35-002 STATUS");
  console.log("==========================================");
  console.log("");

  console.log(
    "ROLE_SEPARATION:",
    v35Task
  );

  console.log("");

  console.log("==========================================");
  console.log("             SAFETY CHECKS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Overlap = fraud:",
    false
  );

  console.log(
    "Same actor = malicious:",
    false
  );

  console.log(
    "No overlap = full independence:",
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
    "    PROVIDER / VALIDATOR CORRELATION TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");

}


main().catch(
  error => {

    console.error("");
    console.error(
      "❌ V41 kritik hata:"
    );

    console.error(
      error.message ||
      error
    );

    console.error("");

    process.exit(1);

  }
);