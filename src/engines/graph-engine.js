const fs = require("fs");


// ============================================
// ARGUMENTS
// ============================================

const AGENT_ID = process.argv[2];

if (!AGENT_ID) {
  console.error("");
  console.error("❌ Agent ID belirtilmedi.");
  console.error("");
  console.error("Kullanım:");
  console.error(
    "node graph-aware-risk-engine.js <AGENT_ID>"
  );
  console.error("");
  console.error("Örnek:");
  console.error(
    "node graph-aware-risk-engine.js 845265"
  );
  console.error("");
  process.exit(1);
}


// ============================================
// FILES
// ============================================

const EVIDENCE_FILE =
  `agent-${AGENT_ID}-evidence.json`;

const GRAPH_FILE =
  `agent-${AGENT_ID}-graph-v2.json`;


// ============================================
// WEIGHTS
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

  GRAPH_HIGH_RISK: 10,

};


// ============================================
// HEADER
// ============================================

console.log("");

console.log(
  "=========================================="
);

console.log(
  "      GRAPH-AWARE RISK ENGINE v7"
);

console.log(
  "=========================================="
);

console.log("");

console.log(
  "Agent:",
  AGENT_ID
);

console.log(
  "Evidence:",
  EVIDENCE_FILE
);

console.log(
  "Graph:",
  GRAPH_FILE
);

console.log("");


// ============================================
// LOAD JSON
// ============================================

function loadJson(
  filename,
  label
) {

  if (
    !fs.existsSync(filename)
  ) {

    console.error(
      `❌ ${label} dosyası bulunamadı:`
    );

    console.error(
      filename
    );

    console.error("");

    process.exit(1);
  }


  try {

    return JSON.parse(
      fs.readFileSync(
        filename,
        "utf8"
      )
    );

  } catch (error) {

    console.error(
      `❌ ${label} JSON okunamadı.`
    );

    console.error(
      error.message
    );

    process.exit(1);
  }

}


const evidence =
  loadJson(
    EVIDENCE_FILE,
    "Evidence"
  );


const graph =
  loadJson(
    GRAPH_FILE,
    "Graph"
  );


// ============================================
// BASIC VALIDATION
// ============================================

if (
  String(evidence.agentId) !==
  String(AGENT_ID)
) {

  console.error(
    "❌ Evidence Agent ID uyuşmuyor."
  );

  process.exit(1);
}


if (
  String(graph.agentId) !==
  String(AGENT_ID)
) {

  console.error(
    "❌ Graph Agent ID uyuşmuyor."
  );

  process.exit(1);
}


// ============================================
// SIGNAL STORAGE
// ============================================

const positiveSignals = [];

const riskSignals = [];

const uncertaintySignals = [];

const graphSignals = [];


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
// SEMANTICS
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
// GRAPH DATA
// ============================================

const graphNodes =
  Array.isArray(
    graph.nodes
  )
    ? graph.nodes
    : [];


const graphRelationships =
  Array.isArray(
    graph.relationships
  )
    ? graph.relationships
    : [];


const actorAnalysis =
  graph.actorAnalysis || {};


const graphAssessment =
  graph.assessment || {};


const graphRisk =
  graphAssessment.graphRisk ||
  "UNKNOWN";


const graphReputationProviders =
  Array.isArray(
    actorAnalysis.reputationProviders
  )
    ? actorAnalysis.reputationProviders
    : [];


const graphValidators =
  Array.isArray(
    actorAnalysis.validators
  )
    ? actorAnalysis.validators
    : [];


const graphOverlaps =
  Array.isArray(
    actorAnalysis.overlappingActors
  )
    ? actorAnalysis.overlappingActors
    : [];


// ============================================
// GRAPH SIGNALS
// ============================================

graphSignals.push({

  code:
    "GRAPH_LOADED",

  message:
    `Evidence graph loaded with ${graphNodes.length} nodes and ${graphRelationships.length} relationships.`

});


if (
  graphReputationProviders.length >
  0
) {

  graphSignals.push({

    code:
      "GRAPH_REPUTATION_PROVIDERS",

    message:
      `${graphReputationProviders.length} reputation provider(s) found.`

  });

}


if (
  graphValidators.length >
  0
) {

  graphSignals.push({

    code:
      "GRAPH_VALIDATORS",

    message:
      `${graphValidators.length} validator(s) found.`

  });

}


if (
  graphOverlaps.length >
  0
) {

  graphSignals.push({

    code:
      "GRAPH_ACTOR_OVERLAP",

    message:
      `${graphOverlaps.length} overlapping actor(s) detected.`

  });

}


// ============================================
// GRAPH RISK
// ============================================

if (
  graphRisk ===
  "HIGH"
) {

  riskSignals.push({

    code:
      "GRAPH_HIGH_RISK",

    weight:
      WEIGHTS.GRAPH_HIGH_RISK,

    message:
      "Evidence graph reports HIGH structural risk."

  });

} else if (
  graphRisk ===
  "UNKNOWN"
) {

  uncertaintySignals.push({

    code:
      "GRAPH_RISK_UNKNOWN",

    weight:
      10,

    message:
      "Evidence graph could not establish structural risk."

  });

}


// ============================================
// ACTOR OVERLAP
// ============================================
//
// Evidence JSON üzerinden de kontrol ediyoruz.
// Graph ile aynı sinyali tekrar risk puanına
// eklemiyoruz.
//
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


const overlappingActors =
  [
    ...reputationActors
  ].filter(
    actor =>
      validators.has(
        actor
      )
  );


if (
  overlappingActors.length >
  0
) {

  riskSignals.push({

    code:
      "ACTOR_OVERLAP",

    weight:
      WEIGHTS.ACTOR_OVERLAP,

    message:
      "The same actor appears as reputation provider and validator."

  });

}


// ============================================
// EVIDENCE INDEPENDENCE
// ============================================

let evidenceIndependence =
  "UNKNOWN";


if (
  overlappingActors.length >
  0
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
// VALIDATOR COUNT
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
        Number.isFinite(
          value
        )
    );


const uniqueValidationResponses =
  new Set(
    validationResponses
  );


if (
  uniqueValidationResponses.size >
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


const riskScore =
  Math.min(
    100,
    rawRisk
  );


const uncertaintyScore =
  Math.min(
    100,
    rawUncertainty
  );


// ============================================
// CONFIDENCE
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


// Graph structure provides an additional
// evidence-quality signal, but not a truth
// probability.

if (
  graphNodes.length >= 3 &&
  graphRelationships.length >= 2
) {

  confidenceScore +=
    5;

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


// ============================================
// BLOCK
// ============================================

if (
  riskSignals.some(
    signal =>
      signal.code ===
      "IDENTITY_MISSING"
  )
) {

  decision =
    "BLOCK";

  decisionReasons.push(
    "Critical identity evidence is missing."
  );

}


// ============================================
// REVIEW
// ============================================

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


// ============================================
// ALLOW
// ============================================

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
// FALLBACK
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
// GRAPH REPORT
// ============================================

console.log(
  "=========================================="
);

console.log(
  "          GRAPH INTELLIGENCE"
);

console.log(
  "=========================================="
);

console.log("");

console.log(
  "Graph nodes:",
  graphNodes.length
);

console.log(
  "Graph relationships:",
  graphRelationships.length
);

console.log(
  "Reputation providers:",
  graphReputationProviders.length
);

console.log(
  "Validators:",
  graphValidators.length
);

console.log(
  "Overlapping actors:",
  graphOverlaps.length
);

console.log(
  "Graph risk:",
  graphRisk
);

console.log("");


// ============================================
// GRAPH SIGNALS
// ============================================

for (
  const signal
  of graphSignals
) {

  console.log(
    "🔗",
    signal.code
  );

  console.log(
    " ",
    signal.message
  );

}

console.log("");


// ============================================
// SIGNAL CLASSIFICATION
// ============================================

console.log(
  "=========================================="
);

console.log(
  "        SIGNAL CLASSIFICATION"
);

console.log(
  "=========================================="
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


if (
  positiveSignals.length ===
  0
) {

  console.log(
    "None"
  );

} else {

  for (
    const signal
    of positiveSignals
  ) {

    console.log(
      `✓ ${signal.code}`
    );

    console.log(
      `  ${signal.message}`
    );

  }

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


if (
  riskSignals.length ===
  0
) {

  console.log(
    "None"
  );

} else {

  for (
    const signal
    of riskSignals
  ) {

    console.log(
      `⚠ [${signal.weight}] ${signal.code}`
    );

    console.log(
      `  ${signal.message}`
    );

  }

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


if (
  uncertaintySignals.length ===
  0
) {

  console.log(
    "None"
  );

} else {

  for (
    const signal
    of uncertaintySignals
  ) {

    console.log(
      `? [${signal.weight}] ${signal.code}`
    );

    console.log(
      `  ${signal.message}`
    );

  }

}

console.log("");


// ============================================
// RISK ASSESSMENT
// ============================================

console.log(
  "=========================================="
);

console.log(
  "           RISK ASSESSMENT"
);

console.log(
  "=========================================="
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

console.log(
  "Graph Risk:",
  graphRisk
);

console.log("");


// ============================================
// DECISION
// ============================================

console.log(
  "=========================================="
);

console.log(
  "          AGENT DECISION"
);

console.log(
  "=========================================="
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
// REASONS
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
// FINAL
// ============================================

console.log(
  "=========================================="
);

console.log(
  "          FINAL ASSESSMENT"
);

console.log(
  "=========================================="
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
  "Graph Risk:",
  graphRisk
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
  "=========================================="
);

console.log(
  "          IMPORTANT"
);

console.log(
  "=========================================="
);

console.log("");

console.log(
  "Observed Risk is NOT a Trust Score."
);

console.log(
  "Evidence Confidence is NOT probability of truth."
);

console.log(
  "Graph Risk describes structural evidence risk."
);

console.log(
  "Uncertainty represents missing or incomplete information."
);

console.log("");

console.log(
  "=========================================="
);

console.log("");