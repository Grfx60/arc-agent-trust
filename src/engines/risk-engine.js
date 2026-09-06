const fs = require("fs");


// ============================================
// SETTINGS
// ============================================

const AGENT_ID = "845265";

const EVIDENCE_FILE =
  `agent-${AGENT_ID}-evidence.json`;


// ============================================
// SIGNAL WEIGHTS
// ============================================

const WEIGHTS = {

  IDENTITY_MISSING: 40,

  REPUTATION_MISSING: 20,

  VALIDATION_MISSING: 25,

  ACTOR_OVERLAP: 30,

  LOW_EVIDENCE_INDEPENDENCE: 30,

  REVOKED_FEEDBACK: 15,

  VALIDATION_CHANGED: 10,

  VALIDATION_SINGLE_PROVIDER: 10,

  REVIEWER_COVERAGE_UNKNOWN: 10,

  SEMANTICS_UNKNOWN: 15,

};


// ============================================
// HEADER
// ============================================

console.log("");

console.log(
  "========================================"
);

console.log(
  "       AGENT RISK ENGINE v5"
);

console.log(
  "========================================"
);

console.log("");

console.log(
  "Agent:",
  AGENT_ID
);

console.log("");


// ============================================
// LOAD EVIDENCE
// ============================================

if (
  !fs.existsSync(
    EVIDENCE_FILE
  )
) {

  console.error(
    "❌ Evidence dosyası bulunamadı:"
  );

  console.error(
    EVIDENCE_FILE
  );

  process.exit(1);
}


let evidence;


try {

  const raw =
    fs.readFileSync(
      EVIDENCE_FILE,
      "utf8"
    );

  evidence =
    JSON.parse(raw);

} catch (
  error
) {

  console.error(
    "❌ Evidence JSON okunamadı."
  );

  console.error(
    error.message
  );

  process.exit(1);
}


// ============================================
// SIGNAL STORAGE
// ============================================

const positiveSignals = [];

const riskSignals = [];

const uncertaintySignals = [];


// ============================================
// IDENTITY
// ============================================

const identity =
  evidence.identity || {};


const identityPresent =
  Boolean(
    identity.owner ||
    identity.metadataURI
  );


if (
  identityPresent
) {

  positiveSignals.push({
    code:
      "IDENTITY_PRESENT",

    message:
      "On-chain identity is present."
  });

} else {

  riskSignals.push({
    code:
      "IDENTITY_MISSING",

    weight:
      WEIGHTS.IDENTITY_MISSING,

    message:
      "On-chain identity is missing."
  });

}


// ============================================
// REPUTATION
// ============================================

const reputation =
  evidence.reputation || {};


const reputationClients =
  Array.isArray(
    reputation.clients
  )
    ? reputation.clients
    : [];


const reputationFeedbacks =
  reputationClients.flatMap(
    client =>
      Array.isArray(
        client.feedbacks
      )
        ? client.feedbacks
        : []
  );


const activeFeedbacks =
  reputationFeedbacks.filter(
    feedback =>
      feedback.revoked !== true
  );


const revokedFeedbacks =
  reputationFeedbacks.filter(
    feedback =>
      feedback.revoked === true
  );


if (
  activeFeedbacks.length >
  0
) {

  positiveSignals.push({
    code:
      "REPUTATION_PRESENT",

    message:
      "Active reputation evidence exists."
  });

} else {

  riskSignals.push({
    code:
      "REPUTATION_MISSING",

    weight:
      WEIGHTS.REPUTATION_MISSING,

    message:
      "No active reputation evidence exists."
  });

}


// ============================================
// REVOKED FEEDBACK
// ============================================

if (
  revokedFeedbacks.length >
  0
) {

  riskSignals.push({
    code:
      "REVOKED_FEEDBACK",

    weight:
      WEIGHTS.REVOKED_FEEDBACK,

    message:
      `${revokedFeedbacks.length} revoked feedback record(s) found.`
  });

}


// ============================================
// REPUTATION SEMANTICS
// ============================================

const reputationTags =
  [
    ...new Set(
      reputationFeedbacks
        .map(
          feedback =>
            feedback.tag1
        )
        .filter(
          Boolean
        )
    ),
  ];


let reputationSemantic =
  "UNKNOWN";


if (
  reputationTags.includes(
    "mode-a-daily-decision"
  )
) {

  reputationSemantic =
    "CONFIDENCE_ACTIVITY";
}


if (
  reputationSemantic !==
  "UNKNOWN"
) {

  positiveSignals.push({
    code:
      "SEMANTICS_UNDERSTOOD",

    message:
      "Reputation semantics are understood."
  });

} else {

  uncertaintySignals.push({
    code:
      "SEMANTICS_UNKNOWN",

    weight:
      WEIGHTS.SEMANTICS_UNKNOWN,

    message:
      "Reputation semantics are unknown."
  });

}


// ============================================
// VALIDATION
// ============================================

const validation =
  evidence.validation || {};


const validationRecords =
  Array.isArray(
    validation.records
  )
    ? validation.records
    : [];


if (
  validationRecords.length >
  0
) {

  positiveSignals.push({
    code:
      "VALIDATION_PRESENT",

    message:
      "Validation evidence exists."
  });

} else {

  riskSignals.push({
    code:
      "VALIDATION_MISSING",

    weight:
      WEIGHTS.VALIDATION_MISSING,

    message:
      "Validation evidence is missing."
  });

}


// ============================================
// VALIDATOR SET
// ============================================

const validators =
  new Set();


for (
  const record
  of validationRecords
) {

  if (
    record.validator
  ) {

    validators.add(
      record.validator.toLowerCase()
    );

  }

}


// ============================================
// REPUTATION ACTORS
// ============================================

const reputationActors =
  new Set();


for (
  const feedback
  of reputationFeedbacks
) {

  if (
    feedback.client
  ) {

    reputationActors.add(
      feedback.client.toLowerCase()
    );

  }

}


// ============================================
// ACTOR OVERLAP
// ============================================

const overlappingActors =
  [
    ...reputationActors,
  ].filter(
    actor =>
      validators.has(actor)
  );


const actorOverlap =
  overlappingActors.length >
  0;


if (
  actorOverlap
) {

  riskSignals.push({
    code:
      "ACTOR_OVERLAP",

    weight:
      WEIGHTS.ACTOR_OVERLAP,

    message:
      "The same actor appears as reputation provider and validator."
  });

} else {

  positiveSignals.push({
    code:
      "NO_ACTOR_OVERLAP",

    message:
      "No reputation provider/validator overlap detected."
  });

}


// ============================================
// EVIDENCE INDEPENDENCE
// ============================================

let evidenceIndependence =
  "UNKNOWN";


if (
  actorOverlap
) {

  evidenceIndependence =
    "LOW";

} else if (
  reputationActors.size >= 2 &&
  validators.size >= 2
) {

  evidenceIndependence =
    "HIGH";

} else if (
  reputationActors.size > 0 &&
  validators.size > 0
) {

  evidenceIndependence =
    "MEDIUM";

}


if (
  evidenceIndependence ===
  "LOW"
) {

  riskSignals.push({
    code:
      "LOW_EVIDENCE_INDEPENDENCE",

    weight:
      WEIGHTS.LOW_EVIDENCE_INDEPENDENCE,

    message:
      "Evidence independence is LOW."
  });

}


// ============================================
// VALIDATION STRUCTURE
// ============================================

if (
  validators.size ===
  1
) {

  uncertaintySignals.push({
    code:
      "VALIDATION_SINGLE_PROVIDER",

    weight:
      WEIGHTS.VALIDATION_SINGLE_PROVIDER,

    message:
      "Only one unique validator is present."
  });

}


// ============================================
// VALIDATION CHANGE
// ============================================

const validationResponses =
  validationRecords
    .map(
      record =>
        Number(
          record.response
        )
    )
    .filter(
      value =>
        Number.isFinite(value)
    );


const uniqueResponses =
  new Set(
    validationResponses
  );


if (
  uniqueResponses.size >
  1
) {

  uncertaintySignals.push({
    code:
      "VALIDATION_CHANGED",

    weight:
      WEIGHTS.VALIDATION_CHANGED,

    message:
      "Validation responses changed over time."
  });

}


// ============================================
// REVIEWER COVERAGE
// ============================================
//
// Historical discovery henüz
// tamamlanmadı.
//
// UNKNOWN = uncertainty.
//
// ============================================

const reviewerCoverage =
  "UNKNOWN";


if (
  reviewerCoverage ===
  "UNKNOWN"
) {

  uncertaintySignals.push({
    code:
      "REVIEWER_COVERAGE_UNKNOWN",

    weight:
      WEIGHTS.REVIEWER_COVERAGE_UNKNOWN,

    message:
      "Historical reviewer coverage is unknown."
  });

}


// ============================================
// RISK CALCULATION
// ============================================

const rawRisk =
  riskSignals.reduce(
    (
      total,
      signal
    ) =>
      total +
      signal.weight,
    0
  );


const rawUncertainty =
  uncertaintySignals.reduce(
    (
      total,
      signal
    ) =>
      total +
      signal.weight,
    0
  );


// ============================================
// RISK SCORE
// ============================================
//
// Risk score is NOT Trust Score.
//
// 0 = no observed risk
// 100 = maximum modeled risk
//
// ============================================

const riskScore =
  Math.min(
    100,
    rawRisk
  );


// ============================================
// UNCERTAINTY SCORE
// ============================================

const uncertaintyScore =
  Math.min(
    100,
    rawUncertainty
  );


// ============================================
// EVIDENCE CONFIDENCE
// ============================================
//
// Başlangıç modeli:
//
// Identity       +20
// Reputation     +20
// Validation     +20
// Semantics      +15
// Independence  +15
// History        +10
//
// Maksimum = 100
//
// ============================================

let confidenceScore =
  0;


if (
  identityPresent
) {

  confidenceScore +=
    20;

}


if (
  activeFeedbacks.length >
  0
) {

  confidenceScore +=
    20;

}


if (
  validationRecords.length >
  0
) {

  confidenceScore +=
    20;

}


if (
  reputationSemantic !==
  "UNKNOWN"
) {

  confidenceScore +=
    15;

}


if (
  evidenceIndependence ===
  "HIGH"
) {

  confidenceScore +=
    15;

} else if (
  evidenceIndependence ===
  "MEDIUM"
) {

  confidenceScore +=
    10;

} else if (
  evidenceIndependence ===
  "LOW"
) {

  confidenceScore +=
    5;

}


if (
  reviewerCoverage !==
  "UNKNOWN"
) {

  confidenceScore +=
    10;

}


confidenceScore =
  Math.min(
    100,
    confidenceScore
  );


// ============================================
// DECISION
// ============================================

let decision =
  "REVIEW";

const decisionReasons = [];


// --------------------------------------------
// BLOCK
// --------------------------------------------

const criticalRisk =
  riskSignals.some(
    signal =>
      signal.code ===
      "IDENTITY_MISSING"
  );


if (
  criticalRisk
) {

  decision =
    "BLOCK";

  decisionReasons.push(
    "Critical identity evidence is missing."
  );

}


// --------------------------------------------
// REVIEW
// --------------------------------------------

if (
  decision !==
  "BLOCK"
) {

  if (
    riskScore >=
    40
  ) {

    decision =
      "REVIEW";

    decisionReasons.push(
      "Observed risk exceeds the initial review threshold."
    );

  }


  if (
    uncertaintyScore >=
    20
  ) {

    decision =
      "REVIEW";

    decisionReasons.push(
      "Material uncertainty remains."
    );

  }


  if (
    confidenceScore <
    60
  ) {

    decision =
      "REVIEW";

    decisionReasons.push(
      "Evidence confidence is below the initial allow threshold."
    );

  }

}


// --------------------------------------------
// ALLOW
// --------------------------------------------

if (
  identityPresent &&
  activeFeedbacks.length > 0 &&
  validationRecords.length > 0 &&
  riskScore < 20 &&
  uncertaintyScore < 10 &&
  confidenceScore >= 80
) {

  decision =
    "ALLOW";

  decisionReasons.length =
    0;

  decisionReasons.push(
    "Observed risk is low."
  );

  decisionReasons.push(
    "Evidence confidence is high."
  );

}


// ============================================
// FALLBACK REASON
// ============================================

if (
  decisionReasons.length ===
  0
) {

  decisionReasons.push(
    "Additional evidence is required before allowing the agent to proceed."
  );

}


// ============================================
// REPORT
// ============================================

console.log(
  "========================================"
);

console.log(
  "        SIGNAL CLASSIFICATION"
);

console.log(
  "========================================"
);

console.log("");


// ============================================
// POSITIVE
// ============================================

console.log(
  "🟢 POSITIVE"
);

console.log(
  "----------------------------------------"
);

for (
  const signal
  of positiveSignals
) {

  console.log(
    "✓",
    signal.code
  );

  console.log(
    " ",
    signal.message
  );

}

if (
  positiveSignals.length ===
  0
) {

  console.log(
    "None"
  );

}

console.log("");


// ============================================
// RISK
// ============================================

console.log(
  "🔴 RISK"
);

console.log(
  "----------------------------------------"
);

for (
  const signal
  of riskSignals
) {

  console.log(
    `⚠ [${signal.weight}] ${signal.code}`
  );

  console.log(
    " ",
    signal.message
  );

}

if (
  riskSignals.length ===
  0
) {

  console.log(
    "None"
  );

}

console.log("");


// ============================================
// UNCERTAINTY
// ============================================

console.log(
  "🟡 UNCERTAINTY"
);

console.log(
  "----------------------------------------"
);

for (
  const signal
  of uncertaintySignals
) {

  console.log(
    `? [${signal.weight}] ${signal.code}`
  );

  console.log(
    " ",
    signal.message
  );

}

if (
  uncertaintySignals.length ===
  0
) {

  console.log(
    "None"
  );

}

console.log("");


// ============================================
// SCORES
// ============================================

console.log(
  "========================================"
);

console.log(
  "           RISK ASSESSMENT"
);

console.log(
  "========================================"
);

console.log("");

console.log(
  "Observed Risk:",
  `${riskScore}/100`
);

console.log(
  "Uncertainty:",
  `${uncertaintyScore}/100`
);

console.log(
  "Evidence Confidence:",
  `${confidenceScore}/100`
);

console.log("");


// ============================================
// DECISION
// ============================================

console.log(
  "========================================"
);

console.log(
  "          AGENT DECISION"
);

console.log(
  "========================================"
);

console.log("");

if (
  decision ===
  "ALLOW"
) {

  console.log(
    "🟢 ALLOW"
  );

} else if (
  decision ===
  "REVIEW"
) {

  console.log(
    "🟡 REVIEW"
  );

} else {

  console.log(
    "🔴 BLOCK"
  );

}

console.log("");


// ============================================
// DECISION REASONS
// ============================================

console.log(
  "DECISION REASONS"
);

console.log(
  "----------------------------------------"
);

for (
  const reason
  of decisionReasons
) {

  console.log(
    "→",
    reason
  );

}

console.log("");


// ============================================
// FINAL SUMMARY
// ============================================

console.log(
  "========================================"
);

console.log(
  "          FINAL ASSESSMENT"
);

console.log(
  "========================================"
);

console.log("");

console.log(
  "Agent:",
  AGENT_ID
);

console.log(
  "Observed Risk:",
  `${riskScore}/100`
);

console.log(
  "Uncertainty:",
  `${uncertaintyScore}/100`
);

console.log(
  "Evidence Confidence:",
  `${confidenceScore}/100`
);

console.log(
  "Evidence Independence:",
  evidenceIndependence
);

console.log(
  "Decision:",
  decision
);

console.log("");


// ============================================
// IMPORTANT
// ============================================

console.log(
  "========================================"
);

console.log(
  "          IMPORTANT"
);

console.log(
  "========================================"
);

console.log("");

console.log(
  "Observed Risk is NOT a Trust Score."
);

console.log(
  "Evidence Confidence is NOT probability of truth."
);

console.log(
  "Uncertainty represents missing or incomplete information."
);

console.log("");

console.log(
  "========================================"
);

console.log("");