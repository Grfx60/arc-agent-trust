const fs = require("fs");

const AGENT_ID = 845265;

const INPUT_FILES = [
  "agent-evidence-independence-v28-1.json",
  "agent-risk-correlation-v29.json",
  "agent-evidence-decision-v30.json",
  "agent-evidence-scoring-v31.json",
  "agent-evidence-calibration-v32.json",
  "agent-trust-assessment-v33.json",
  "agent-evidence-review-v34.json",
  "agent-evidence-gap-v35.json",

  // Optional historical evidence files
  "agent-scanner-v10.json",
  "agent-845265-scanner-v11.json",
  "agent-evidence-collector-v10.json",
  "agent-validator-intelligence-v10.json"
];

const OUTPUT_FILE =
  "agent-validator-discovery-v36.json";


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

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .trim()
    .toLowerCase();

}


function addressLike(value) {

  const s = normalize(value);

  return /^0x[a-f0-9]{40}$/.test(s);

}


function addUnique(list, value) {

  const normalized =
    normalize(value);

  if (!normalized) {
    return;
  }

  if (!list.some(
    x => normalize(x) === normalized
  )) {

    list.push(value);

  }

}


function walk(
  value,
  path,
  hits
) {

  if (
    value === null ||
    value === undefined
  ) {
    return;
  }


  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {

    const key =
      path[
        path.length - 1
      ] || "";

    const keyNorm =
      normalize(key);


    const validatorKey =
      keyNorm.includes("validator") ||
      keyNorm.includes("validat");


    if (validatorKey) {

      hits.push({
        path: path.join("."),
        value
      });

    }

    return;
  }


  if (Array.isArray(value)) {

    value.forEach(
      (item, index) => {

        walk(
          item,
          [
            ...path,
            String(index)
          ],
          hits
        );

      }
    );

    return;
  }


  if (
    typeof value === "object"
  ) {

    for (
      const [key, item]
      of Object.entries(value)
    ) {

      walk(
        item,
        [
          ...path,
          key
        ],
        hits
      );

    }

  }

}


function classifyPath(path) {

  const p =
    normalize(path);

  if (
    p.includes("validator")
  ) {

    if (
      p.includes("overlap")
    ) {

      return "PROVIDER_VALIDATOR_OVERLAP";

    }

    if (
      p.includes("independence")
    ) {

      return "VALIDATOR_INDEPENDENCE";

    }

    if (
      p.includes("count")
    ) {

      return "VALIDATOR_COUNT";

    }

    if (
      p.includes("address") ||
      p.includes("wallet") ||
      p.includes("actor")
    ) {

      return "VALIDATOR_IDENTITY";

    }

    return "VALIDATOR_REFERENCE";

  }

  return "OTHER";

}


function main() {

  console.log("");
  console.log("==========================================");
  console.log("      VALIDATOR EVIDENCE DISCOVERY v36");
  console.log("==========================================");
  console.log("");

  console.log(
    "Target Agent:",
    AGENT_ID
  );

  console.log("");


  // ==========================================
  // LOAD FILES
  // ==========================================

  const loaded = [];
  const missing = [];

  const datasets = [];

  for (
    const file
    of INPUT_FILES
  ) {

    const data =
      loadJSON(file);

    if (data) {

      loaded.push(file);

      datasets.push({
        file,
        data
      });

    } else {

      missing.push(file);

    }

  }


  console.log(
    "Loaded files:",
    loaded.length
  );

  console.log(
    "Missing files:",
    missing.length
  );

  console.log("");


  // ==========================================
  // DISCOVER VALIDATOR REFERENCES
  // ==========================================

  const rawHits = [];


  for (
    const dataset
    of datasets
  ) {

    const hits = [];

    walk(
      dataset.data,
      [],
      hits
    );


    for (
      const hit
      of hits
    ) {

      rawHits.push({
        file:
          dataset.file,

        path:
          hit.path,

        value:
          hit.value,

        classification:
          classifyPath(
            hit.path
          )
      });

    }

  }


  // ==========================================
  // EXTRACT IDENTIFIABLE VALIDATORS
  // ==========================================

  const validatorAddresses = [];
  const validatorValues = [];

  for (
    const hit
    of rawHits
  ) {

    if (
      addressLike(hit.value)
    ) {

      addUnique(
        validatorAddresses,
        hit.value
      );

    } else {

      const value =
        normalize(hit.value);

      if (value) {

        addUnique(
          validatorValues,
          value
        );

      }

    }

  }


  // ==========================================
  // KNOWN PROVIDER / VALIDATOR OVERLAP
  // ==========================================

  const knownOverlap =
    Number(
      datasets
        .map(
          d =>
            d.data
              ?.verifiedEvidence
              ?.overlappingActors
        )
        .find(
          x =>
            Number.isFinite(
              Number(x)
            )
        ) || 0
    );


  // ==========================================
  // VALIDATOR COUNTS
  // ==========================================

  const explicitCounts = [];

  for (
    const dataset
    of datasets
  ) {

    const candidates = [

      dataset.data
        ?.components
        ?.validatorIndependence,

      dataset.data
        ?.components
        ?.validators,

      dataset.data
        ?.validation
        ?.validators,

      dataset.data
        ?.validation
        ?.validatorCount,

      dataset.data
        ?.validators,

      dataset.data
        ?.validatorCount,

      dataset.data
        ?.validator_count

    ];


    for (
      const value
      of candidates
    ) {

      const n =
        Number(value);

      if (
        Number.isFinite(n) &&
        n >= 0
      ) {

        explicitCounts.push({
          file:
            dataset.file,

          value:
            n

        });

      }

    }

  }


  const knownValidatorCount =
    explicitCounts.length
      ? Math.max(
          ...explicitCounts.map(
            x => x.value
          )
        )
      : 0;


  // ==========================================
  // V28 INDEPENDENCE
  // ==========================================

  const validatorIndependence =
    Number(
      datasets
        .map(
          d =>
            d.data
              ?.components
              ?.validatorIndependence
        )
        .find(
          x =>
            Number.isFinite(
              Number(x)
            )
        ) || 0
    );


  // ==========================================
  // V35 TASK
  // ==========================================

  const v35 =
    loadJSON(
      "agent-evidence-gap-v35.json"
    );


  const v35Task =
    v35?.tasks?.find(
      task =>
        task.id === "V35-001"
    );


  // ==========================================
  // INDEPENDENCE DETERMINATION
  // ==========================================

  /*
   * Important:
   *
   * A validator reference is NOT automatically
   * an independent validator.
   *
   * We require identifiable evidence.
   */

  const identifiableValidatorCount =
    validatorAddresses.length;


  let independentValidatorStatus;

  if (
    identifiableValidatorCount >= 2
  ) {

    independentValidatorStatus =
      "POTENTIALLY_RESOLVED";

  } else {

    independentValidatorStatus =
      "NOT_ESTABLISHED";

  }


  // ==========================================
  // CANDIDATE ANALYSIS
  // ==========================================

  const candidates =
    validatorAddresses.map(
      address => ({

        validator:
          address,

        identityVerified:
          true,

        independenceVerified:
          false,

        status:
          "CANDIDATE"

      })
    );


  // ==========================================
  // EVIDENCE QUALITY
  // ==========================================

  let evidenceQuality =
    0;

  if (
    identifiableValidatorCount >= 1
  ) {

    evidenceQuality += 30;

  }

  if (
    identifiableValidatorCount >= 2
  ) {

    evidenceQuality += 40;

  }

  if (
    knownValidatorCount >= 2
  ) {

    evidenceQuality += 20;

  }

  if (
    knownOverlap === 0
  ) {

    evidenceQuality += 10;

  }


  evidenceQuality =
    Math.min(
      100,
      evidenceQuality
    );


  // ==========================================
  // RESOLUTION
  // ==========================================

  let resolution;

  if (
    identifiableValidatorCount >= 2 &&
    knownOverlap === 0
  ) {

    resolution =
      "RESOLVED";

  } else if (
    identifiableValidatorCount >= 2
  ) {

    resolution =
      "PARTIAL";

  } else {

    resolution =
      "OPEN";

  }


  // ==========================================
  // NEXT ACTION
  // ==========================================

  let nextAction;

  if (
    resolution === "RESOLVED"
  ) {

    nextAction =
      "VALIDATE_INDEPENDENCE";

  } else if (
    identifiableValidatorCount === 1
  ) {

    nextAction =
      "DISCOVER_SECOND_VALIDATOR";

  } else {

    nextAction =
      "COLLECT_VALIDATOR_EVIDENCE";

  }


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "3.6",

    engine:
      "VALIDATOR_EVIDENCE_DISCOVERY",

    generatedAt:
      new Date().toISOString(),

    agent:
      AGENT_ID,

    dataAvailability: {

      loadedFiles:
        loaded,

      missingFiles:
        missing

    },

    discovery: {

      rawValidatorReferences:
        rawHits.length,

      identifiableValidators:
        identifiableValidatorCount,

      knownValidatorCount,

      validatorIndependence,

      providerValidatorOverlap:
        knownOverlap

    },

    candidates,

    assessment: {

      resolution,

      evidenceQuality,

      independentValidatorStatus

    },

    v35: {

      task:
        v35Task || null,

      status:
        v35Task?.status || "UNKNOWN"

    },

    nextAction,

    safeguards: {

      validatorReferenceIsNotProof:
        true,

      validatorIdentityIsNotProofOfIndependence:
        true,

      providerValidatorOverlapMustBeChecked:
        true,

      automaticAllowBlocked:
        resolution !== "RESOLVED",

      automaticBlockAllowed:
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
  // REPORT
  // ==========================================

  console.log("");
  console.log("==========================================");
  console.log("          V36 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agent:",
    AGENT_ID
  );

  console.log(
    "Raw validator references:",
    rawHits.length
  );

  console.log(
    "Identifiable validators:",
    identifiableValidatorCount
  );

  console.log(
    "Known validator count:",
    knownValidatorCount
  );

  console.log(
    "Validator independence:",
    validatorIndependence,
    "/100"
  );

  console.log(
    "Provider/validator overlap:",
    knownOverlap
  );

  console.log("");

  console.log("==========================================");
  console.log("        VALIDATOR DISCOVERY");
  console.log("==========================================");
  console.log("");

  for (
    const candidate
    of candidates
  ) {

    console.log(
      "Validator:",
      candidate.validator
    );

    console.log(
      "Identity verified:",
      candidate.identityVerified
    );

    console.log(
      "Independence verified:",
      candidate.independenceVerified
    );

    console.log(
      "Status:",
      candidate.status
    );

    console.log("");

  }


  console.log("==========================================");
  console.log("          V35-001 STATUS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Resolution:",
    resolution
  );

  console.log(
    "Evidence quality:",
    evidenceQuality,
    "/100"
  );

  console.log(
    "Independent validator status:",
    independentValidatorStatus
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
    "Validator reference = proof:",
    false
  );

  console.log(
    "Validator identity = independence proof:",
    false
  );

  console.log(
    "Automatic ALLOW blocked:",
    resolution !== "RESOLVED"
  );

  console.log(
    "Automatic BLOCK allowed:",
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
    "     VALIDATOR DISCOVERY TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");

}


try {

  main();

} catch (error) {

  console.error("");
  console.error("❌ V36 kritik hata:");
  console.error(
    error.message || error
  );
  console.error("");

  process.exit(1);

}