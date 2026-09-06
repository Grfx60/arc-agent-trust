const fs = require("fs");

const TARGET_AGENT = 845265;

const CURRENT_VALIDATOR =
  "0xe18f822b5071553d62cf119ce57da6c1636f2524";

const VALIDATION_REGISTRY =
  "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";

const RPC_URL =
  process.env.ARC_RPC_URL;

const V39_FILE =
  "agent-independent-validator-v39.json";

const V41_FILE =
  "agent-provider-validator-correlation-v41.json";

const V45_FILE =
  "agent-independent-validator-v45.json";

const OUTPUT_FILE =
  "agent-validator-registry-v46.json";


if (!RPC_URL) {
  console.log("");
  console.log("ARC_RPC_URL bulunamadı.");
  console.log("");
  console.log('$env:ARC_RPC_URL="ARC_RPC_ADRESIN"');
  console.log("");
  process.exit(1);
}


function loadJSON(file) {
  if (!fs.existsSync(file)) {
    return null;
  }

  try {
    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch (error) {
    console.log(
      `ERROR: ${file}: ${error.message}`
    );
    return null;
  }
}


function addr(value) {
  if (!value) return null;

  return String(value).toLowerCase();
}


function getValidator(item) {

  if (typeof item === "string") {
    return addr(item);
  }

  if (!item || typeof item !== "object") {
    return null;
  }

  return addr(
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
        .map(addr)
    )
  ];

}


async function rpc(
  method,
  params
) {

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
      json.error.message ??
      "RPC error"
    );
  }


  return json.result;
}


function hexToBigInt(hex) {

  if (
    !hex ||
    hex === "0x"
  ) {
    return 0n;
  }

  return BigInt(hex);
}


// ======================================================
// MAIN
// ======================================================

async function main() {

  console.log("");
  console.log("==========================================");
  console.log("   DIRECT VALIDATOR REGISTRY FORENSICS v46");
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
    "Validation Registry:",
    VALIDATION_REGISTRY
  );

  console.log("");


  // ====================================================
  // LOAD
  // ====================================================

  const v39 =
    loadJSON(V39_FILE);

  const v41 =
    loadJSON(V41_FILE);

  const v45 =
    loadJSON(V45_FILE);


  console.log("==========================================");
  console.log("        LOCAL DATA AVAILABILITY");
  console.log("==========================================");
  console.log("");

  console.log(
    "V39:",
    v39 ? "OK" : "MISSING"
  );

  console.log(
    "V41:",
    v41 ? "OK" : "MISSING"
  );

  console.log(
    "V45:",
    v45 ? "OK" : "MISSING"
  );

  console.log("");


  // ====================================================
  // CANDIDATES
  // ====================================================

  let rawCandidates = [];


  const arrays = [

    v39?.validatorCandidates,

    v39?.candidates,

    v39?.alternativeValidators,

    v39?.candidateValidators,

    v39?.validators

  ];


  for (
    const arr of arrays
  ) {

    if (
      Array.isArray(arr) &&
      arr.length > 0
    ) {

      rawCandidates =
        arr;

      break;

    }

  }


  const candidates =
    unique(
      rawCandidates
        .map(
          getValidator
        )
        .filter(
          x =>
            x &&
            x !==
            CURRENT_VALIDATOR
        )
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
    candidate =>
      console.log(
        candidate
      )
  );

  console.log("");


  // ====================================================
  // V41 PROVIDERS
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


  providers =
    unique(
      providers
    );


  // V41 sometimes stores provider
  // addresses inside overlap records.

  if (
    providers.length === 0 &&
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


  console.log("==========================================");
  console.log("        PROVIDER CROSS-CHECK");
  console.log("==========================================");
  console.log("");

  console.log(
    "Provider addresses:",
    providers.length
  );

  providers.forEach(
    provider =>
      console.log(
        provider
      )
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
      hexToBigInt(
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
  console.log("        REGISTRY CONTRACT CHECK");
  console.log("==========================================");
  console.log("");


  let registryCode =
    null;


  try {

    registryCode =
      await rpc(
        "eth_getCode",
        [
          VALIDATION_REGISTRY,
          "latest"
        ]
      );


    const deployed =
      registryCode &&
      registryCode !== "0x";


    console.log(
      "Registry deployed:",
      deployed
    );

    console.log(
      "Code bytes:",
      deployed
        ? (registryCode.length - 2) / 2
        : 0
    );

  } catch (error) {

    console.log(
      "Registry code check failed:",
      error.message
    );

  }


  console.log("");


  // ====================================================
  // EVENT SCAN
  // ====================================================

  console.log("==========================================");
  console.log("        REGISTRY EVENT SCAN");
  console.log("==========================================");
  console.log("");


  const latest =
    hexToBigInt(
      latestBlock
    );

  const scanSize =
    5000n;

  const from =
    latest > scanSize
      ? latest - scanSize
      : 0n;


  let logs = [];


  try {

    logs =
      await rpc(
        "eth_getLogs",
        [
          {
            address:
              VALIDATION_REGISTRY,

            fromBlock:
              "0x" +
              from.toString(16),

            toBlock:
              "0x" +
              latest.toString(16)

          }
        ]
      );


    console.log(
      "Logs found:",
      logs.length
    );

  } catch (error) {

    console.log(
      "Log scan failed:",
      error.message
    );

  }


  console.log("");


  // ====================================================
  // TARGET AGENT SEARCH
  // ====================================================

  const targetHex =
    TARGET_AGENT
      .toString(16)
      .padStart(
        64,
        "0"
      )
      .toLowerCase();


  const targetLogs =
    logs.filter(
      log => {

        const data =
          String(
            log.data ??
            ""
          )
          .toLowerCase();


        const topics =
          (
            log.topics ??
            []
          )
          .join("")
          .toLowerCase();


        return (
          data.includes(
            targetHex
          ) ||
          topics.includes(
            targetHex
          )
        );

      }
    );


  console.log("==========================================");
  console.log("       TARGET AGENT EVENT SEARCH");
  console.log("==========================================");
  console.log("");

  console.log(
    "Potential target logs:",
    targetLogs.length
  );

  console.log("");


  // ====================================================
  // CANDIDATE EVENT SEARCH
  // ====================================================

  const results = [];


  for (
    const candidate
    of candidates
  ) {

    const needle =
      candidate
        .slice(2)
        .toLowerCase();


    const matches =
      logs.filter(
        log =>
          JSON.stringify(
            log
          )
          .toLowerCase()
          .includes(
            needle
          )
      );


    let targetEvidence =
      false;


    for (
      const log
      of matches
    ) {

      const raw =
        JSON.stringify(
          log
        )
        .toLowerCase();


      if (
        raw.includes(
          targetHex
        )
      ) {

        targetEvidence =
          true;

        break;

      }

    }


    const providerOverlap =
      providers.includes(
        candidate
      );


    results.push({

      validator:
        candidate,

      registryEvents:
        matches.length,

      targetAgentEvidence:
        targetEvidence,

      providerOverlap,

      independentFromKnownProvider:
        !providerOverlap

    });

  }


  // ====================================================
  // V37 TARGET RECORDS
  // ====================================================

  const v37 =
    loadJSON(
      "agent-validation-evidence-v37.json"
    );


  const records =
    v37?.validationRecords ??
    v37?.records ??
    v37?.validations ??
    [];


  const targetValidationRecords =
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


  const actualTargetValidators =
    unique(
      targetValidationRecords
        .map(
          getValidator
        )
    );


  const alternativeTargetValidators =
    actualTargetValidators.filter(
      validator =>
        validator !==
        CURRENT_VALIDATOR
    );


  // ====================================================
  // FINAL CLASSIFICATION
  // ====================================================

  const independentTargetValidators =
    results.filter(
      result =>
        result.targetAgentEvidence &&
        result.independentFromKnownProvider
    );


  const independentCandidates =
    results.filter(
      result =>
        result.independentFromKnownProvider
    );


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
  // FINAL
  // ====================================================

  console.log("");
  console.log("==========================================");
  console.log("          V46 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agent:",
    TARGET_AGENT
  );

  console.log(
    "Current validator:",
    CURRENT_VALIDATOR
  );

  console.log(
    "Registry:",
    VALIDATION_REGISTRY
  );

  console.log("");

  console.log(
    "Target validators:",
    actualTargetValidators.length
  );

  console.log(
    "Alternative target validators:",
    alternativeTargetValidators.length
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
    "Independent target validators:",
    independentTargetValidators.length
  );

  console.log("");

  console.log("==========================================");
  console.log("       VALIDATOR FORENSICS");
  console.log("==========================================");
  console.log("");


  for (
    const result
    of results
  ) {

    console.log(
      result.validator
    );

    console.log(
      "  Registry events:",
      result.registryEvents
    );

    console.log(
      "  Target evidence:",
      result.targetAgentEvidence
    );

    console.log(
      "  Provider overlap:",
      result.providerOverlap
    );

    console.log(
      "  Independent:",
      result.independentFromKnownProvider
    );

    console.log("");

  }


  console.log("==========================================");
  console.log("          V35-001 STATUS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Status:",
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

    registryObservationIsNotFraud:
      true,

    candidateIsNotProof:
      true,

    validatorIsNotTrustProof:
      true,

    providerOverlapIsNotFraud:
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
      "4.6.0",

    engine:
      "DIRECT_VALIDATOR_REGISTRY_FORENSICS",

    generatedAt:
      new Date().toISOString(),

    network:
      "Arc Testnet",

    targetAgent:
      TARGET_AGENT,

    validationRegistry:
      VALIDATION_REGISTRY,

    rpc: {

      chainId,

      latestBlock:
        hexToBigInt(
          latestBlock
        ).toString(),

      registryDeployed:
        registryCode !== null &&
        registryCode !== "0x"

    },

    currentValidator:
      CURRENT_VALIDATOR,

    providers,

    candidates,

    targetValidationRecords,

    actualTargetValidators,

    alternativeTargetValidators,

    targetLogs,

    validators:
      results,

    independentCandidates,

    independentTargetValidators,

    v35_001: {

      task:
        "VALIDATOR_DIVERSITY",

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
    "     DIRECT VALIDATOR FORENSICS TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");

}


main().catch(
  error => {

    console.error("");
    console.error(
      "FATAL ERROR:",
      error
    );
    console.error("");

    process.exit(1);

  }
);