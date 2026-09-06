const fs = require("fs");

const TARGET_AGENT = 845265;

const CURRENT_VALIDATOR =
  "0xe18f822b5071553d62cf119ce57da6c1636f2524";

const VALIDATION_REGISTRY =
  "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";

const RPC_URL =
  process.env.ARC_RPC_URL;

const V46_FILE =
  "agent-validator-registry-v46.json";

const V37_FILE =
  "agent-validation-evidence-v37.json";

const V41_FILE =
  "agent-provider-validator-correlation-v41.json";

const OUTPUT_FILE =
  "agent-validation-registry-v47.json";


function load(file) {

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


function address(value) {

  if (!value) {
    return null;
  }

  return String(value).toLowerCase();

}


function getValidator(item) {

  if (typeof item === "string") {
    return address(item);
  }

  if (!item || typeof item !== "object") {
    return null;
  }

  return address(
    item.validator ??
    item.address ??
    item.validatorAddress ??
    item.id
  );

}


function unique(values) {

  return [
    ...new Set(
      values
        .filter(Boolean)
        .map(address)
    )
  ];

}


async function rpc(method, params) {

  const response =
    await fetch(
      RPC_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method,
          params
        })
      }
    );


  if (!response.ok) {

    throw new Error(
      `RPC HTTP ${response.status}`
    );

  }


  const json =
    await response.json();


  if (json.error) {

    throw new Error(
      json.error.message ||
      "RPC error"
    );

  }


  return json.result;

}


function words(hex) {

  if (
    !hex ||
    hex === "0x"
  ) {
    return [];
  }

  const data =
    hex.slice(2);

  const result = [];

  for (
    let i = 0;
    i < data.length;
    i += 64
  ) {

    result.push(
      "0x" +
      data.slice(
        i,
        i + 64
      )
    );

  }

  return result;

}


function wordAddress(word) {

  if (
    !word ||
    word.length < 42
  ) {
    return null;
  }

  return address(
    "0x" +
    word.slice(-40)
  );

}


function wordNumber(word) {

  if (!word) {
    return null;
  }

  try {
    return BigInt(word).toString();
  } catch {
    return null;
  }

}


async function main() {

  console.log("");
  console.log("==========================================");
  console.log(" VALIDATION REGISTRY FORENSICS v47");
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
    "Registry:",
    VALIDATION_REGISTRY
  );

  console.log("");


  // ====================================================
  // ENVIRONMENT
  // ====================================================

  if (!RPC_URL) {

    console.log(
      "ARC_RPC_URL bulunamadı."
    );

    process.exit(1);

  }


  // ====================================================
  // FILES
  // ====================================================

  const v46 =
    load(V46_FILE);

  const v37 =
    load(V37_FILE);

  const v41 =
    load(V41_FILE);


  console.log("==========================================");
  console.log("        DATA AVAILABILITY");
  console.log("==========================================");
  console.log("");

  console.log(
    "V46:",
    v46 ? "OK" : "MISSING"
  );

  console.log(
    "V37:",
    v37 ? "OK" : "MISSING"
  );

  console.log(
    "V41:",
    v41 ? "OK" : "MISSING"
  );

  console.log("");


  // ====================================================
  // CANDIDATES
  // ====================================================

  let candidates = [];

  if (
    Array.isArray(
      v46?.candidates
    )
  ) {

    candidates =
      v46.candidates.map(
        getValidator
      );

  }


  candidates =
    unique(
      candidates
    )
    .filter(
      x =>
        x !==
        CURRENT_VALIDATOR
    );


  console.log("==========================================");
  console.log("        VALIDATOR CANDIDATES");
  console.log("==========================================");
  console.log("");

  console.log(
    "Candidates:",
    candidates.length
  );

  candidates.forEach(
    x =>
      console.log(x)
  );

  console.log("");


  // ====================================================
  // PROVIDERS
  // ====================================================

  let providers = [];

  const providerArrays = [

    v41?.reputationProviders,

    v41?.providers,

    v41?.providerAddresses,

    v41?.overlapAddresses

  ];


  for (
    const arr of providerArrays
  ) {

    if (
      Array.isArray(arr)
    ) {

      providers.push(
        ...arr.map(
          getValidator
        )
      );

    }

  }


  if (
    v41?.targetValidator
  ) {

    const target =
      getValidator(
        v41.targetValidator
      );

    if (target) {
      providers.push(target);
    }

  }


  providers =
    unique(
      providers
    );


  console.log("==========================================");
  console.log("        PROVIDER CHECK");
  console.log("==========================================");
  console.log("");

  console.log(
    "Providers:",
    providers.length
  );

  providers.forEach(
    x =>
      console.log(x)
  );

  console.log("");


  // ====================================================
  // RPC
  // ====================================================

  console.log("==========================================");
  console.log("          RPC CONNECTIVITY");
  console.log("==========================================");
  console.log("");


  let chainId;
  let latestBlock;


  try {

    chainId =
      await rpc(
        "eth_chainId",
        []
      );


    latestBlock =
      await rpc(
        "eth_blockNumber",
        []
      );


    console.log(
      "Chain ID:",
      chainId
    );

    console.log(
      "Latest block:",
      BigInt(
        latestBlock
      ).toString()
    );

  } catch (error) {

    console.log(
      "RPC ERROR:",
      error.message
    );

    process.exit(1);

  }


  console.log("");


  // ====================================================
  // REGISTRY CODE
  // ====================================================

  console.log("==========================================");
  console.log("        REGISTRY CONTRACT");
  console.log("==========================================");
  console.log("");


  let code = "0x";


  try {

    code =
      await rpc(
        "eth_getCode",
        [
          VALIDATION_REGISTRY,
          "latest"
        ]
      );


    console.log(
      "Deployed:",
      code !== "0x"
    );

    console.log(
      "Code bytes:",
      code !== "0x"
        ? (code.length - 2) / 2
        : 0
    );

  } catch (error) {

    console.log(
      "Code error:",
      error.message
    );

  }


  console.log("");


  // ====================================================
  // TARGET VALIDATION HISTORY
  // ====================================================

  const records =
    v37?.validationRecords ??
    v37?.records ??
    v37?.validations ??
    [];


  const targetRecords =
    Array.isArray(records)
      ? records.filter(
          record => {

            const agent =
              String(
                record.agentId ??
                record.agent ??
                record.targetAgent ??
                ""
              );

            return (
              agent ===
              String(
                TARGET_AGENT
              )
            );

          }
        )
      : [];


  const targetValidators =
    unique(
      targetRecords.map(
        getValidator
      )
    );


  console.log("==========================================");
  console.log("       TARGET VALIDATION HISTORY");
  console.log("==========================================");
  console.log("");

  console.log(
    "Records:",
    targetRecords.length
  );

  console.log(
    "Unique validators:",
    targetValidators.length
  );

  targetValidators.forEach(
    x =>
      console.log(x)
  );

  console.log("");


  // ====================================================
  // STORAGE
  // ====================================================

  console.log("==========================================");
  console.log("          STORAGE PROBE");
  console.log("==========================================");
  console.log("");


  const storage = [];


  for (
    let slot = 0;
    slot < 32;
    slot++
  ) {

    const slotHex =
      "0x" +
      slot
        .toString(16)
        .padStart(
          64,
          "0"
        );


    try {

      const value =
        await rpc(
          "eth_getStorageAt",
          [
            VALIDATION_REGISTRY,
            slotHex,
            "latest"
          ]
        );


      const item = {

        slot,

        value,

        address:
          wordAddress(
            value
          ),

        number:
          wordNumber(
            value
          )

      };


      storage.push(
        item
      );


      console.log(
        `slot ${slot}: ${value}`
      );


      if (
        item.address &&
        item.address !==
          "0x0000000000000000000000000000000000000000"
      ) {

        console.log(
          "  address candidate:",
          item.address
        );

      }

    } catch (error) {

      storage.push({

        slot,

        error:
          error.message

      });

    }

  }


  console.log("");


  // ====================================================
  // TARGET AGENT ENCODING
  // ====================================================

  console.log("==========================================");
  console.log("       TARGET AGENT PROBE");
  console.log("==========================================");
  console.log("");


  const encodedAgent =
    "0x" +
    BigInt(
      TARGET_AGENT
    )
      .toString(16)
      .padStart(
        64,
        "0"
      );


  console.log(
    "Encoded agent:",
    encodedAgent
  );


  // ====================================================
  // STORAGE MATCHES
  // ====================================================

  const storageMatches =
    storage.filter(
      item =>
        item.value &&
        item.value
          .toLowerCase()
          .includes(
            encodedAgent
              .slice(2)
              .toLowerCase()
          )
    );


  console.log(
    "Storage matches:",
    storageMatches.length
  );


  // ====================================================
  // CANDIDATE ANALYSIS
  // ====================================================

  const analysis =
    candidates.map(
      validator => {

        const providerOverlap =
          providers.includes(
            validator
          );

        const targetValidation =
          targetValidators.includes(
            validator
          );


        return {

          validator,

          providerOverlap,

          targetValidation,

          independentFromKnownProvider:
            !providerOverlap

        };

      }
    );


  // ====================================================
  // INDEPENDENT TARGET VALIDATORS
  // ====================================================

  const independentTargetValidators =
    analysis.filter(
      item =>
        item.targetValidation &&
        item.independentFromKnownProvider
    );


  const independentCandidates =
    analysis.filter(
      item =>
        item.independentFromKnownProvider
    );


  // ====================================================
  // STATUS
  // ====================================================

  let status;
  let nextAction;


  if (
    independentTargetValidators.length >= 1
  ) {

    status =
      "RESOLVED";

    nextAction =
      "RECALCULATE_INDEPENDENCE";

  } else if (
    independentCandidates.length >= 2
  ) {

    status =
      "CANDIDATES_CONFIRMED";

    nextAction =
      "SEEK_TARGET_VALIDATION";

  } else {

    status =
      "OPEN";

    nextAction =
      "COLLECT_VALIDATOR_EVIDENCE";

  }


  // ====================================================
  // FINAL RESULT
  // ====================================================

  console.log("");
  console.log("==========================================");
  console.log("          V47 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agent:",
    TARGET_AGENT
  );

  console.log(
    "Registry:",
    VALIDATION_REGISTRY
  );

  console.log(
    "Candidates:",
    candidates.length
  );

  console.log(
    "Independent candidates:",
    independentCandidates.length
  );

  console.log(
    "Known target validators:",
    targetValidators.length
  );

  console.log(
    "Independent target validators:",
    independentTargetValidators.length
  );

  console.log(
    "Storage matches:",
    storageMatches.length
  );

  console.log("");

  console.log(
    "V35-001:",
    status
  );

  console.log(
    "Next action:",
    nextAction
  );

  console.log("");


  // ====================================================
  // SAFETY
  // ====================================================

  const safety = {

    storageMatchIsNotProof:
      true,

    candidateIsNotProof:
      true,

    validatorPresenceIsNotTrustProof:
      true,

    sharedValidatorIsNotFraud:
      true,

    automaticAllow:
      false,

    automaticBlock:
      false

  };


  // ====================================================
  // OUTPUT
  // ====================================================

  const output = {

    schemaVersion:
      "4.7.1",

    engine:
      "VALIDATION_REGISTRY_FORENSICS",

    generatedAt:
      new Date().toISOString(),

    network:
      "Arc Testnet",

    targetAgent:
      TARGET_AGENT,

    registry:
      VALIDATION_REGISTRY,

    rpc: {

      chainId,

      latestBlock:
        BigInt(
          latestBlock
        ).toString(),

      deployed:
        code !== "0x"

    },

    candidates,

    providers,

    targetRecords,

    targetValidators,

    storage,

    storageMatches,

    analysis,

    independentCandidates,

    independentTargetValidators,

    v35_001: {

      status,

      nextAction

    },

    safety

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
    "Output:",
    OUTPUT_FILE
  );

  console.log("");

  console.log("==========================================");
  console.log(
    "    VALIDATION REGISTRY FORENSICS TAMAMLANDI"
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