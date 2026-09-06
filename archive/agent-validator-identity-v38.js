const fs = require("fs");

const AGENT_ID = 845265;

const VALIDATOR =
  "0xe18f822b5071553d62cf119ce57da6c1636f2524";

const VALIDATION_REGISTRY =
  process.env.VALIDATION_REGISTRY ||
  "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";

const RPC_URL =
  process.env.ARC_RPC_URL ||
  "https://rpc.testnet.arc.network";

const OUTPUT_FILE =
  "agent-validator-identity-v38.json";

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

const ERC721_ABI = [
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "tokenId",
        type: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "address"
      }
    ]
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "tokenId",
        type: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "string"
      }
    ]
  }
];

const IDENTITY_REGISTRY =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e";


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


async function main() {

  console.log("");
  console.log("==========================================");
  console.log("   VALIDATOR IDENTITY ANALYZER v38");
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
    "Validator:",
    VALIDATOR
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
            http: [
              RPC_URL
            ]
          }
        }
      },

      transport:
        http(RPC_URL)

    });


  const validator =
    getAddress(VALIDATOR);


  // ==========================================
  // 1 — VALIDATOR AS AGENT?
  // ==========================================

  console.log("==========================================");
  console.log("        TEST 1 — VALIDATOR AGENT");
  console.log("==========================================");
  console.log("");


  let validatorAgentIds = [];

  const knownAgents = [];

  const discoveryFiles = [
    "agent-id-discovery-v16.json",
    "agent-discovery-v17.json",
    "agent-metadata-intelligence-v19.json"
  ];


  for (
    const file
    of discoveryFiles
  ) {

    const data =
      loadJSON(file);

    if (!data) continue;


    const agents =
      Array.isArray(data)
        ? data
        : (
            data.agents ||
            data.results ||
            []
          );


    for (
      const item
      of agents
    ) {

      const owner =
        normalize(
          item.owner ||
          item.ownerAddress ||
          item.wallet ||
          item.agentWallet
        );


      if (
        owner ===
        normalize(validator)
      ) {

        const id =
          item.agentId ||
          item.id ||
          item.tokenId;

        if (
          id !== undefined
        ) {

          validatorAgentIds.push(
            String(id)
          );

        }

      }


      if (
        item.agentId !== undefined
      ) {

        knownAgents.push(
          String(item.agentId)
        );

      }

    }

  }


  validatorAgentIds =
    unique(
      validatorAgentIds
    );


  console.log(
    "Known agent IDs owned by validator:",
    validatorAgentIds.length
  );


  if (
    validatorAgentIds.length
  ) {

    for (
      const id
      of validatorAgentIds
    ) {

      console.log(
        "Agent:",
        id
      );

    }

  } else {

    console.log(
      "No validator-owned agent found in local discovery files."
    );

  }


  console.log("");


  // ==========================================
  // 2 — VALIDATOR'S OWN AGENT URI
  // ==========================================

  console.log("==========================================");
  console.log("      TEST 2 — VALIDATOR AGENT URI");
  console.log("==========================================");
  console.log("");


  const validatorAgentDetails = [];


  for (
    const id
    of validatorAgentIds
  ) {

    try {

      const uri =
        await client.readContract({
          address:
            IDENTITY_REGISTRY,
          abi:
            ERC721_ABI,
          functionName:
            "tokenURI",
          args: [
            BigInt(id)
          ]
        });


      validatorAgentDetails.push({

        agentId:
          id,

        tokenURI:
          uri

      });


      console.log(
        "Agent:",
        id
      );

      console.log(
        "URI:",
        uri
      );

    } catch {

      validatorAgentDetails.push({

        agentId:
          id,

        tokenURI:
          null

      });

    }

  }


  if (
    validatorAgentIds.length === 0
  ) {

    console.log(
      "No validator agent available for URI inspection."
    );

  }


  console.log("");


  // ==========================================
  // 3 — TARGET VALIDATION HISTORY
  // ==========================================

  console.log("==========================================");
  console.log("     TEST 3 — TARGET VALIDATION HISTORY");
  console.log("==========================================");
  console.log("");


  let requestHashes = [];

  try {

    requestHashes =
      await client.readContract({

        address:
          VALIDATION_REGISTRY,

        abi:
          VALIDATION_ABI,

        functionName:
          "getAgentValidations",

        args: [
          BigInt(AGENT_ID)
        ]

      });

  } catch (error) {

    console.log(
      "❌ Validation history okunamadı."
    );

    console.log(
      error.shortMessage ||
      error.message
    );

  }


  const targetValidations = [];


  for (
    const hash
    of requestHashes
  ) {

    try {

      const result =
        await client.readContract({

          address:
            VALIDATION_REGISTRY,

          abi:
            VALIDATION_ABI,

          functionName:
            "getValidationStatus",

          args: [
            hash
          ]

        });


      targetValidations.push({

        requestHash:
          hash,

        validator:
          normalize(result[0]),

        agentId:
          result[1].toString(),

        response:
          Number(result[2]),

        responseHash:
          result[3],

        tag:
          result[4],

        lastUpdate:
          result[5].toString()

      });

    } catch {}

  }


  console.log(
    "Target validation records:",
    targetValidations.length
  );


  for (
    const record
    of targetValidations
  ) {

    console.log(
      "Validator:",
      record.validator
    );

    console.log(
      "Response:",
      record.response
    );

    console.log(
      "Tag:",
      record.tag || "N/A"
    );

    console.log("");

  }


  // ==========================================
  // 4 — PROVIDER OVERLAP
  // ==========================================

  console.log("==========================================");
  console.log("       TEST 4 — PROVIDER OVERLAP");
  console.log("==========================================");
  console.log("");


  const v28 =
    loadJSON(
      "agent-evidence-independence-v28-1.json"
    );


  const overlap =
    Number(
      v28
        ?.verifiedEvidence
        ?.overlappingActors || 0
    );


  console.log(
    "Known provider/validator overlap:",
    overlap
  );


  // ==========================================
  // 5 — SHARED VALIDATOR USAGE
  // ==========================================

  console.log("");
  console.log("==========================================");
  console.log("      TEST 5 — VALIDATOR USAGE");
  console.log("==========================================");
  console.log("");


  const allValidationFiles = [
    "agent-validation-evidence-v37.json",
    "agent-validator-identity-v38.json"
  ];


  const discoveredValidationRecords = [];


  for (
    const file
    of allValidationFiles
  ) {

    const data =
      loadJSON(file);

    if (!data) continue;


    if (
      Array.isArray(
        data.validations
      )
    ) {

      discoveredValidationRecords.push(
        ...data.validations
      );

    }

  }


  const validatorUsage =
    discoveredValidationRecords
      .filter(
        x =>
          normalize(
            x.validatorAddress ||
            x.validator
          ) ===
          normalize(validator)
      );


  const validatedAgents =
    unique(
      validatorUsage.map(
        x =>
          x.agentId
      )
    );


  console.log(
    "Known validation records by validator:",
    validatorUsage.length
  );

  console.log(
    "Known agents validated:",
    validatedAgents.length
  );


  // ==========================================
  // 6 — INDEPENDENCE ASSESSMENT
  // ==========================================

  let independence =
    "NOT_ESTABLISHED";


  if (
    overlap === 0 &&
    validatorAgentIds.length === 0
  ) {

    independence =
      "POTENTIALLY_INDEPENDENT";

  } else if (
    overlap > 0
  ) {

    independence =
      "ROLE_OVERLAP_REQUIRES_REVIEW";

  } else {

    independence =
      "RELATIONSHIP_REQUIRES_REVIEW";

  }


  // ==========================================
  // 7 — RELATIONSHIP CLASSIFICATION
  // ==========================================

  let relationship =
    "UNKNOWN";


  if (
    validatorAgentIds.length > 0
  ) {

    relationship =
      "VALIDATOR_OWNS_AGENT";

  } else if (
    overlap > 0
  ) {

    relationship =
      "PROVIDER_VALIDATOR_OVERLAP";

  } else {

    relationship =
      "NO_DIRECT_RELATIONSHIP_FOUND";

  }


  // ==========================================
  // 8 — V35-001 STATUS
  // ==========================================

  let v35Status =
    "OPEN";


  if (
    independence ===
    "POTENTIALLY_INDEPENDENT"
  ) {

    v35Status =
      "CANDIDATE_FOR_RESOLUTION";

  }


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "3.8",

    engine:
      "VALIDATOR_IDENTITY_ANALYZER",

    generatedAt:
      new Date().toISOString(),

    agent:
      AGENT_ID,

    validator: {

      address:
        validator,

      ownedAgentIds:
        validatorAgentIds,

      ownedAgentDetails:
        validatorAgentDetails

    },

    targetValidation: {

      records:
        targetValidations

    },

    usage: {

      knownValidationRecords:
        validatorUsage.length,

      validatedAgents:
        validatedAgents

    },

    relationships: {

      providerValidatorOverlap:
        overlap,

      relationship

    },

    independence: {

      classification:
        independence,

      v35Task:
        "V35-001",

      v35Status

    },

    safety: {

      validatorIdentityIsNotTrustProof:
        true,

      validatorOwnershipIsNotFraudProof:
        true,

      roleOverlapIsNotFraudProof:
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
  console.log("          V38 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agent:",
    AGENT_ID
  );

  console.log(
    "Validator:",
    validator
  );

  console.log(
    "Validator-owned agents:",
    validatorAgentIds.length
  );

  console.log(
    "Target validation records:",
    targetValidations.length
  );

  console.log(
    "Known agents validated:",
    validatedAgents.length
  );

  console.log(
    "Provider/validator overlap:",
    overlap
  );

  console.log("");

  console.log("==========================================");
  console.log("       RELATIONSHIP CLASSIFICATION");
  console.log("==========================================");
  console.log("");

  console.log(
    "Relationship:",
    relationship
  );

  console.log(
    "Independence:",
    independence
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

  console.log("");

  console.log("==========================================");
  console.log("             SAFETY CHECKS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Validator identity = trust proof:",
    false
  );

  console.log(
    "Validator ownership = fraud proof:",
    false
  );

  console.log(
    "Role overlap = fraud proof:",
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
    "      VALIDATOR IDENTITY ANALYZER TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");

}


main().catch(
  error => {

    console.error("");
    console.error(
      "❌ V38 kritik hata:"
    );

    console.error(
      error.message ||
      error
    );

    console.error("");

    process.exit(1);

  }
);