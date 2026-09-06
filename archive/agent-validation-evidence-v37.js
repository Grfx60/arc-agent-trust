const fs = require("fs");

const AGENT_ID = 845265;

const IDENTITY_REGISTRY =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const OUTPUT_FILE =
  "agent-validation-evidence-v37.json";

// Validation Registry can be supplied through:
// PowerShell:
// $env:VALIDATION_REGISTRY="0x..."
// node .\agent-validation-evidence-v37.js

const VALIDATION_REGISTRY =
  process.env.VALIDATION_REGISTRY || "";

const RPC_URL =
  process.env.ARC_RPC_URL || "";

const ABI = [
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

function normalizeAddress(value) {
  if (!value) return "";

  return String(value)
    .trim()
    .toLowerCase();
}

function unique(values) {
  return [...new Set(
    values
      .filter(Boolean)
      .map(normalizeAddress)
  )];
}

async function main() {

  console.log("");
  console.log("==========================================");
  console.log("      VALIDATION EVIDENCE ENGINE v37");
  console.log("==========================================");
  console.log("");

  console.log(
    "Network: Arc Testnet"
  );

  console.log(
    "Identity Registry:",
    IDENTITY_REGISTRY
  );

  console.log(
    "Agent:",
    AGENT_ID
  );

  console.log("");

  // ==========================================
  // VALIDATION REGISTRY CHECK
  // ==========================================

  if (!VALIDATION_REGISTRY) {

    console.log("==========================================");
    console.log("       VALIDATION REGISTRY");
    console.log("==========================================");
    console.log("");

    console.log(
      "❌ VALIDATION_REGISTRY bulunamadı."
    );

    console.log("");
    console.log(
      "Önce Validation Registry adresini"
    );

    console.log(
      "PowerShell environment variable olarak gir:"
    );

    console.log("");

    console.log(
      '$env:VALIDATION_REGISTRY="0x..."'
    );

    console.log("");

    console.log(
      "Sonra scripti tekrar çalıştır."
    );

    console.log("");

    const output = {
      schemaVersion: "3.7",
      engine: "VALIDATION_EVIDENCE",
      agent: AGENT_ID,
      status: "BLOCKED_CONFIGURATION",
      reason:
        "VALIDATION_REGISTRY address is not configured",
      identityRegistry:
        IDENTITY_REGISTRY,
      validationRegistry:
        null,
      safety: {
        noValidatorAssumed: true,
        noAutomaticAllow: true,
        noAutomaticBlock: true
      }
    };

    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(output, null, 2),
      "utf8"
    );

    console.log(
      "📁 Output:",
      OUTPUT_FILE
    );

    return;
  }

  // ==========================================
  // RPC CHECK
  // ==========================================

  if (!RPC_URL) {

    console.log("❌ ARC_RPC_URL bulunamadı.");

    console.log("");
    console.log(
      'PowerShell: $env:ARC_RPC_URL="https://..."'
    );

    console.log("");

    return;
  }

  // ==========================================
  // LOAD VIEM
  // ==========================================

  let viem;

  try {
    viem = require("viem");
  } catch {

    console.log(
      "❌ viem paketi bulunamadı."
    );

    console.log("");
    console.log(
      "Şunu çalıştır:"
    );

    console.log(
      "npm install viem"
    );

    console.log("");

    return;
  }

  const {
    createPublicClient,
    http,
    getAddress
  } = viem;

  // ==========================================
  // CLIENT
  // ==========================================

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

  let registry;

  try {
    registry =
      getAddress(
        VALIDATION_REGISTRY
      );
  } catch {

    console.log(
      "❌ Validation Registry adresi geçersiz."
    );

    return;
  }

  console.log("==========================================");
  console.log("       VALIDATION REGISTRY");
  console.log("==========================================");
  console.log("");

  console.log(
    "Validation Registry:",
    registry
  );

  console.log("");

  // ==========================================
  // GET AGENT VALIDATIONS
  // ==========================================

  let requestHashes = [];

  try {

    requestHashes =
      await client.readContract({
        address: registry,
        abi: ABI,
        functionName:
          "getAgentValidations",
        args: [
          BigInt(AGENT_ID)
        ]
      });

  } catch (error) {

    console.log(
      "❌ getAgentValidations başarısız."
    );

    console.log(
      error.shortMessage ||
      error.message ||
      String(error)
    );

    return;
  }

  console.log(
    "Validation requests:",
    requestHashes.length
  );

  console.log("");

  // ==========================================
  // READ VALIDATION STATUS
  // ==========================================

  const validations = [];

  for (
    let i = 0;
    i < requestHashes.length;
    i++
  ) {

    const requestHash =
      requestHashes[i];

    try {

      const result =
        await client.readContract({
          address: registry,
          abi: ABI,
          functionName:
            "getValidationStatus",
          args: [
            requestHash
          ]
        });

      const validator =
        normalizeAddress(
          result[0]
        );

      const agentId =
        result[1].toString();

      const response =
        Number(result[2]);

      const responseHash =
        result[3];

      const tag =
        result[4];

      const lastUpdate =
        result[5].toString();

      validations.push({

        requestHash,

        validatorAddress:
          validator,

        agentId,

        response,

        responseHash,

        tag,

        lastUpdate,

        status:
          response > 0
            ? "RESPONDED"
            : "FAILED_OR_ZERO"

      });

      console.log(
        "🟢 Validation:",
        i + 1,
        "/",
        requestHashes.length
      );

      console.log(
        "Validator:",
        validator
      );

      console.log(
        "Response:",
        response
      );

      console.log(
        "Tag:",
        tag || "N/A"
      );

      console.log("");

    } catch (error) {

      console.log(
        "🔴 Validation read error:",
        requestHash
      );

      console.log(
        error.shortMessage ||
        error.message ||
        String(error)
      );

      validations.push({

        requestHash,

        status:
          "READ_ERROR",

        error:
          error.shortMessage ||
          error.message ||
          String(error)

      });

      console.log("");

    }

  }

  // ==========================================
  // UNIQUE VALIDATORS
  // ==========================================

  const validators =
    unique(
      validations
        .map(
          x =>
            x.validatorAddress
        )
    );

  // ==========================================
  // RESPONDED VALIDATORS
  // ==========================================

  const respondingValidators =
    unique(
      validations
        .filter(
          x =>
            x.status ===
            "RESPONDED"
        )
        .map(
          x =>
            x.validatorAddress
        )
    );

  // ==========================================
  // PROVIDER OVERLAP
  // ==========================================

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

  // ==========================================
  // INDEPENDENCE ESTIMATE
  // ==========================================

  let independenceStatus =
    "NOT_ESTABLISHED";

  if (
    respondingValidators.length >= 2 &&
    overlap === 0
  ) {

    independenceStatus =
      "POTENTIALLY_RESOLVED";

  } else if (
    respondingValidators.length >= 2
  ) {

    independenceStatus =
      "PARTIAL";

  }

  // ==========================================
  // V35-001
  // ==========================================

  let v35Status =
    "OPEN";

  if (
    respondingValidators.length >= 2 &&
    overlap === 0
  ) {

    v35Status =
      "CANDIDATE_RESOLVED";

  }

  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "3.7",

    engine:
      "VALIDATION_EVIDENCE",

    generatedAt:
      new Date().toISOString(),

    network:
      "Arc Testnet",

    identityRegistry:
      IDENTITY_REGISTRY,

    validationRegistry:
      registry,

    agent:
      AGENT_ID,

    discovery: {

      requestCount:
        requestHashes.length,

      validationRecords:
        validations.length,

      uniqueValidators:
        validators.length,

      respondingValidators:
        respondingValidators.length

    },

    validators,

    respondingValidators,

    validations,

    independence: {

      status:
        independenceStatus,

      providerValidatorOverlap:
        overlap

    },

    v35: {

      task:
        "V35-001",

      status:
        v35Status

    },

    safety: {

      validatorPresenceIsNotIndependence:
        true,

      validatorIdentityRequiresVerification:
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
  console.log("          V37 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agent:",
    AGENT_ID
  );

  console.log(
    "Validation requests:",
    requestHashes.length
  );

  console.log(
    "Validation records:",
    validations.length
  );

  console.log(
    "Unique validators:",
    validators.length
  );

  console.log(
    "Responding validators:",
    respondingValidators.length
  );

  console.log("");

  console.log("==========================================");
  console.log("       VALIDATOR IDENTITIES");
  console.log("==========================================");
  console.log("");

  for (
    const validator
    of validators
  ) {

    console.log(
      validator
    );

  }

  if (
    validators.length === 0
  ) {

    console.log(
      "No validator address discovered."
    );

  }

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
    "Independence:",
    independenceStatus
  );

  console.log(
    "Provider/validator overlap:",
    overlap
  );

  console.log("");

  console.log("==========================================");
  console.log("             SAFETY CHECKS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Validator presence = independence:",
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
    "      VALIDATION EVIDENCE TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");

}

main().catch(
  error => {

    console.error("");
    console.error(
      "❌ V37 kritik hata:"
    );

    console.error(
      error.message ||
      error
    );

    console.error("");

    process.exit(1);

  }
);