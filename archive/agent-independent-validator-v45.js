const fs = require("fs");

const TARGET_AGENT = "845265";

const CURRENT_VALIDATOR =
  "0xe18f822b5071553d62cf119ce57da6c1636f2524";

const V39_FILE =
  "agent-independent-validator-v39.json";

const V40_FILE =
  "agent-validator-behavior-v40.json";

const V41_FILE =
  "agent-provider-validator-correlation-v41.json";

const V37_FILE =
  "agent-validation-evidence-v37.json";

const OUTPUT_FILE =
  "agent-independent-validator-v45.json";


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
      `ERROR loading ${file}: ${error.message}`
    );

    return null;
  }
}


function lower(value) {

  return String(
    value ?? ""
  ).toLowerCase();

}


function unique(values) {

  return [
    ...new Set(
      values
        .filter(Boolean)
        .map(String)
        .map(lower)
    )
  ];

}


function address(value) {

  if (!value) {
    return null;
  }

  return String(value).toLowerCase();

}


console.log("");
console.log("==========================================");
console.log("   INDEPENDENT VALIDATOR EVIDENCE v45");
console.log("==========================================");
console.log("");

console.log(
  "Target Agent:",
  TARGET_AGENT
);

console.log(
  "Current Validator:",
  CURRENT_VALIDATOR
);

console.log("");


// ======================================================
// LOAD
// ======================================================

const v37 =
  loadJSON(V37_FILE);

const v39 =
  loadJSON(V39_FILE);

const v40 =
  loadJSON(V40_FILE);

const v41 =
  loadJSON(V41_FILE);


console.log("==========================================");
console.log("        DATA AVAILABILITY");
console.log("==========================================");
console.log("");

console.log(
  "V37:",
  v37 ? "OK" : "MISSING"
);

console.log(
  "V39:",
  v39 ? "OK" : "MISSING"
);

console.log(
  "V40:",
  v40 ? "OK" : "MISSING"
);

console.log(
  "V41:",
  v41 ? "OK" : "MISSING"
);

console.log("");


// ======================================================
// V37 TARGET VALIDATOR
// ======================================================

const v37Validators =
  v37?.validatorIdentities ??
  v37?.validators ??
  [];

let targetValidator =
  CURRENT_VALIDATOR;

if (
  Array.isArray(v37Validators)
) {

  const found =
    v37Validators.find(
      x =>
        address(
          x?.validator ??
          x?.address ??
          x
        ) ===
        CURRENT_VALIDATOR
    );

  if (found) {

    targetValidator =
      address(
        found?.validator ??
        found?.address ??
        found
      );

  }

}


// ======================================================
// V39 CANDIDATES
// ======================================================

let candidates = [];

if (
  Array.isArray(
    v39?.validatorCandidates
  )
) {

  candidates =
    v39.validatorCandidates;

} else if (
  Array.isArray(
    v39?.candidates
  )
) {

  candidates =
    v39.candidates;

} else if (
  Array.isArray(
    v39?.validatorSummary
  )
) {

  candidates =
    v39.validatorSummary;

}


// ======================================================
// FALLBACK — RECREATE FROM V39 DATA
// ======================================================

if (
  candidates.length === 0 &&
  v39
) {

  const possibleArrays = [

    v39?.validatorCandidates,

    v39?.validators,

    v39?.alternativeValidators,

    v39?.candidateValidators

  ];

  for (
    const arr of possibleArrays
  ) {

    if (
      Array.isArray(arr)
    ) {

      candidates =
        arr;

      break;

    }

  }

}


// ======================================================
// V40 VALIDATORS
// ======================================================

let v40Validators = [];

if (
  Array.isArray(
    v40?.alternativeValidators
  )
) {

  v40Validators =
    v40.alternativeValidators;

} else if (
  Array.isArray(
    v40?.validators
  )
) {

  v40Validators =
    v40.validators;

}


// ======================================================
// EXTRACT VALIDATOR ADDRESS
// ======================================================

function getValidator(item) {

  if (
    typeof item === "string"
  ) {

    return address(item);

  }

  if (
    !item ||
    typeof item !== "object"
  ) {

    return null;

  }

  return address(

    item.validator ??
    item.address ??
    item.validatorAddress ??
    item.id

  );

}


// ======================================================
// BUILD CANDIDATE MAP
// ======================================================

const candidateMap =
  new Map();


function addCandidate(
  item,
  source
) {

  const validator =
    getValidator(item);

  if (!validator) {
    return;
  }

  if (
    validator ===
    CURRENT_VALIDATOR
  ) {

    return;

  }

  const existing =
    candidateMap.get(
      validator
    ) ??
    {

      validator,

      sources: [],

      validationCount: 0,

      uniqueAgents: 0,

      tags: [],

      classification: null

    };


  if (
    !existing.sources.includes(
      source
    )
  ) {

    existing.sources.push(
      source
    );

  }


  const count =
    Number(
      item.validationCount ??
      item.validations ??
      item.count ??
      0
    );

  if (
    Number.isFinite(count)
  ) {

    existing.validationCount =
      Math.max(
        existing.validationCount,
        count
      );

  }


  const agents =
    Number(
      item.uniqueAgents ??
      item.validatedAgents ??
      item.agents ??
      0
    );

  if (
    Number.isFinite(agents)
  ) {

    existing.uniqueAgents =
      Math.max(
        existing.uniqueAgents,
        agents
      );

  }


  const tags =
    Array.isArray(
      item.tags
    )
      ? item.tags
      : [];


  existing.tags =
    unique([
      ...existing.tags,
      ...tags
    ]);


  existing.classification =
    item.classification ??
    existing.classification;


  candidateMap.set(
    validator,
    existing
  );

}


for (
  const item of candidates
) {

  addCandidate(
    item,
    "V39"
  );

}


for (
  const item of v40Validators
) {

  addCandidate(
    item,
    "V40"
  );

}


// ======================================================
// V41 PROVIDER OVERLAP
// ======================================================

const v41Providers =
  v41?.reputationProviders ??
  v41?.providers ??
  [];

const v41Overlap =
  v41?.overlapAddresses ??
  v41?.overlaps ??
  [];


const providerAddresses =
  unique([
    ...v41Providers.map(
      getValidator
    ),
    ...v41Overlap.map(
      getValidator
    )
  ]);


console.log("==========================================");
console.log("       PROVIDER / VALIDATOR CHECK");
console.log("==========================================");
console.log("");

console.log(
  "Known provider addresses:",
  providerAddresses.length
);

console.log("");


// ======================================================
// TARGET VALIDATION CHECK
// ======================================================

let targetValidationCount =
  0;

let targetValidatorFound =
  false;

let targetValidationRecords =
  [];


const v37Records =
  v37?.validationRecords ??
  v37?.records ??
  v37?.validations ??
  [];


if (
  Array.isArray(
    v37Records
  )
) {

  for (
    const record of v37Records
  ) {

    const agent =
      String(
        record.agentId ??
        record.agent ??
        record.targetAgent ??
        ""
      );

    const validator =
      getValidator(record);


    if (
      agent === TARGET_AGENT &&
      validator
    ) {

      targetValidationRecords.push(
        record
      );

      if (
        validator ===
        CURRENT_VALIDATOR
      ) {

        targetValidationCount++;

        targetValidatorFound =
          true;

      }

    }

  }

}


// ======================================================
// ALTERNATIVE TARGET VALIDATORS
// ======================================================

const alternativeTargetValidators =
  unique(
    targetValidationRecords
      .map(
        getValidator
      )
      .filter(
        x =>
          x !==
          CURRENT_VALIDATOR
      )
  );


// ======================================================
// INDEPENDENCE TESTS
// ======================================================

const evaluatedCandidates =
  [];


for (
  const candidate
  of candidateMap.values()
) {

  const providerOverlap =
    providerAddresses.includes(
      candidate.validator
    );


  const hasTargetValidation =
    alternativeTargetValidators.includes(
      candidate.validator
    );


  let independenceScore = 0;

  const reasons = [];


// -----------------------------------------
// Candidate exists
// -----------------------------------------

  independenceScore += 10;


// -----------------------------------------
// Broad validation history
// -----------------------------------------

  if (
    candidate.uniqueAgents >= 10
  ) {

    independenceScore += 20;

    reasons.push(
      "BROAD_VALIDATOR"
    );

  } else if (
    candidate.uniqueAgents >= 5
  ) {

    independenceScore += 10;

    reasons.push(
      "ACTIVE_VALIDATOR"
    );

  }


// -----------------------------------------
// Multiple validation records
// -----------------------------------------

  if (
    candidate.validationCount >= 20
  ) {

    independenceScore += 15;

    reasons.push(
      "SUBSTANTIAL_VALIDATION_HISTORY"
    );

  } else if (
    candidate.validationCount >= 5
  ) {

    independenceScore += 8;

    reasons.push(
      "VALIDATION_HISTORY_PRESENT"
    );

  }


// -----------------------------------------
// Multiple discovery sources
// -----------------------------------------

  if (
    candidate.sources.length >= 2
  ) {

    independenceScore += 10;

    reasons.push(
      "MULTI_SOURCE_DISCOVERY"
    );

  }


// -----------------------------------------
// Provider overlap
// -----------------------------------------

  if (
    providerOverlap
  ) {

    independenceScore -= 35;

    reasons.push(
      "PROVIDER_VALIDATOR_OVERLAP"
    );

  } else {

    independenceScore += 15;

    reasons.push(
      "NO_KNOWN_PROVIDER_OVERLAP"
    );

  }


// -----------------------------------------
// Target-specific validation
// -----------------------------------------

  if (
    hasTargetValidation
  ) {

    independenceScore += 30;

    reasons.push(
      "TARGET_VALIDATION_FOUND"
    );

  }


// -----------------------------------------
// Cap
// -----------------------------------------

  independenceScore =
    Math.max(
      0,
      Math.min(
        100,
        independenceScore
      )
    );


  let status;

  if (
    hasTargetValidation &&
    !providerOverlap &&
    independenceScore >= 60
  ) {

    status =
      "INDEPENDENT_TARGET_VALIDATOR";

  } else if (
    !providerOverlap &&
    independenceScore >= 50
  ) {

    status =
      "INDEPENDENT_CANDIDATE";

  } else if (
    providerOverlap
  ) {

    status =
      "ROLE_OVERLAP";

  } else {

    status =
      "WEAK_CANDIDATE";

  }


  evaluatedCandidates.push({

    validator:
      candidate.validator,

    validationCount:
      candidate.validationCount,

    uniqueAgents:
      candidate.uniqueAgents,

    tags:
      candidate.tags,

    classification:
      candidate.classification,

    sources:
      candidate.sources,

    providerOverlap,

    targetValidation:
      hasTargetValidation,

    independenceScore,

    status,

    reasons

  });

}


// ======================================================
// SORT
// ======================================================

evaluatedCandidates.sort(
  (
    a,
    b
  ) =>
    b.independenceScore -
    a.independenceScore
);


// ======================================================
// RESULTS
// ======================================================

const independentCandidates =
  evaluatedCandidates.filter(
    x =>
      !x.providerOverlap &&
      x.independenceScore >= 50
  );


const independentTargetValidators =
  evaluatedCandidates.filter(
    x =>
      x.targetValidation &&
      !x.providerOverlap &&
      x.independenceScore >= 60
  );


// ======================================================
// V35-001 DECISION
// ======================================================

let v35Status;

let resolution;

let nextAction;


if (
  independentTargetValidators.length >= 1
) {

  v35Status =
    "RESOLVED";

  resolution =
    "At least one alternative validator has independently attributable evidence for the target and no known provider overlap.";

  nextAction =
    "RECALCULATE_INDEPENDENCE";

} else if (
  independentCandidates.length >= 2
) {

  v35Status =
    "CANDIDATES_AVAILABLE";

  resolution =
    "Independent validator candidates exist, but none has yet validated the target agent.";

  nextAction =
    "SEEK_TARGET_VALIDATION";

} else {

  v35Status =
    "OPEN";

  resolution =
    "No sufficiently independent validator evidence for the target has been established.";

  nextAction =
    "COLLECT_VALIDATOR_EVIDENCE";

}


// ======================================================
// FINAL REPORT
// ======================================================

console.log("");
console.log("==========================================");
console.log("          V45 FINAL RESULT");
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

console.log("");

console.log(
  "Target validation records:",
  targetValidationCount
);

console.log(
  "Target validator found:",
  targetValidatorFound
);

console.log(
  "Alternative target validators:",
  alternativeTargetValidators.length
);

console.log(
  "Validator candidates:",
  evaluatedCandidates.length
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
console.log("       TOP VALIDATOR CANDIDATES");
console.log("==========================================");
console.log("");

for (
  const candidate
  of evaluatedCandidates.slice(
    0,
    10
  )
) {

  console.log(
    candidate.validator
  );

  console.log(
    "  Validations:",
    candidate.validationCount
  );

  console.log(
    "  Unique agents:",
    candidate.uniqueAgents
  );

  console.log(
    "  Provider overlap:",
    candidate.providerOverlap
  );

  console.log(
    "  Target validation:",
    candidate.targetValidation
  );

  console.log(
    "  Independence:",
    candidate.independenceScore
  );

  console.log(
    "  Status:",
    candidate.status
  );

  console.log("");

}


// ======================================================
// SAFETY
// ======================================================

const safety = {

  candidateIsNotProof:
    true,

  validatorIdentityIsNotTrustProof:
    true,

  sharedValidatorIsNotFraud:
    true,

  providerOverlapIsNotFraud:
    true,

  noIndependentValidatorIsNotFraud:
    true,

  automaticAllow:
    false,

  automaticBlock:
    false

};


// ======================================================
// OUTPUT
// ======================================================

const output = {

  schemaVersion:
    "4.5.0",

  engine:
    "INDEPENDENT_VALIDATOR_EVIDENCE",

  generatedAt:
    new Date().toISOString(),

  targetAgent:
    TARGET_AGENT,

  currentValidator:
    CURRENT_VALIDATOR,

  targetValidation: {

    records:
      targetValidationRecords,

    count:
      targetValidationCount,

    validatorFound:
      targetValidatorFound,

    alternativeValidators:
      alternativeTargetValidators

  },

  candidates:
    evaluatedCandidates,

  independentCandidates:
    independentCandidates,

  independentTargetValidators:
    independentTargetValidators,

  v35_001: {

    task:
      "VALIDATOR_DIVERSITY",

    status:
      v35Status,

    resolution,

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


// ======================================================
// END
// ======================================================

console.log("==========================================");
console.log("          V35-001 STATUS");
console.log("==========================================");
console.log("");

console.log(
  "Status:",
  v35Status
);

console.log(
  "Resolution:",
  resolution
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
  "Candidate = independent proof:",
  false
);

console.log(
  "Validator = trust proof:",
  false
);

console.log(
  "Overlap = fraud:",
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
  "Output:",
  OUTPUT_FILE
);

console.log("");

console.log("==========================================");
console.log(
  "     INDEPENDENT VALIDATOR EVIDENCE TAMAMLANDI"
);
console.log("==========================================");
console.log("");