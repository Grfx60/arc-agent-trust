const fs = require("fs");


// ============================================
// SETTINGS
// ============================================

const evidenceFile =
  "agent-845265-evidence.json";


// ============================================
// LOAD EVIDENCE
// ============================================

if (!fs.existsSync(evidenceFile)) {

  console.error(
    "❌ Evidence dosyası bulunamadı:"
  );

  console.error(
    evidenceFile
  );

  process.exit(1);
}


const evidence =
  JSON.parse(
    fs.readFileSync(
      evidenceFile,
      "utf8"
    )
  );


// ============================================
// BASIC DATA
// ============================================

const identity =
  evidence.identity || {};

const reputationData =
  evidence.reputation || {};

const validationData =
  evidence.validation || {};

const reputationClients =
  reputationData.clients || [];

const validationRecords =
  validationData.records || [];


// ============================================
// REPUTATION FEEDBACK'LERİNİ DÜZLEŞTİR
// ============================================

const allFeedbacks = [];

for (
  const clientData
  of reputationClients
) {

  const feedbacks =
    clientData.feedbacks || [];

  for (
    const feedback
    of feedbacks
  ) {

    allFeedbacks.push(
      feedback
    );

  }

}


// ============================================
// IDENTITY ANALYSIS
// ============================================

const identityPresent =
  Boolean(
    evidence.agentId &&
    identity.owner
  );


const metadataPresent =
  Boolean(
    identity.metadataURI &&
    identity.metadataURI.length > 0
  );


// ============================================
// REPUTATION ANALYSIS
// ============================================

const activeFeedbacks =
  allFeedbacks.filter(
    (feedback) =>
      feedback.revoked === false
  );


const revokedFeedbacks =
  allFeedbacks.filter(
    (feedback) =>
      feedback.revoked === true
  );


const reputationActors =
  activeFeedbacks
    .map(
      (feedback) =>
        feedback.client.toLowerCase()
    );


const uniqueReputationActors =
  [
    ...new Set(
      reputationActors
    ),
  ];


// ============================================
// FEEDBACK VALUES
// ============================================

const feedbackValues =
  activeFeedbacks
    .map(
      (feedback) =>
        feedback.value
    )
    .filter(
      (value) =>
        typeof value === "number" &&
        !Number.isNaN(value)
    );


let averageFeedback =
  null;

let highestFeedback =
  null;

let lowestFeedback =
  null;


if (
  feedbackValues.length > 0
) {

  const total =
    feedbackValues.reduce(
      (
        sum,
        value
      ) =>
        sum + value,
      0
    );

  averageFeedback =
    total /
    feedbackValues.length;

  highestFeedback =
    Math.max(
      ...feedbackValues
    );

  lowestFeedback =
    Math.min(
      ...feedbackValues
    );

}


// ============================================
// FEEDBACK TAG ANALYSIS
// ============================================

const feedbackTags = [];

for (
  const feedback
  of activeFeedbacks
) {

  if (
    feedback.tag1 &&
    feedback.tag1.length > 0
  ) {

    feedbackTags.push(
      feedback.tag1
    );

  }

  if (
    feedback.tag2 &&
    feedback.tag2.length > 0
  ) {

    feedbackTags.push(
      feedback.tag2
    );

  }

}


const uniqueFeedbackTags =
  [
    ...new Set(
      feedbackTags
    ),
  ];


// ============================================
// VALIDATION ANALYSIS
// ============================================

const validationActors =
  validationRecords
    .map(
      (validation) =>
        validation.validator.toLowerCase()
    );


const uniqueValidationActors =
  [
    ...new Set(
      validationActors
    ),
  ];


// ============================================
// VALIDATION RESPONSES
// ============================================

const validationResponses =
  validationRecords
    .map(
      (validation) =>
        validation.response
    )
    .filter(
      (response) =>
        typeof response === "number"
    );


const uniqueValidationResponses =
  [
    ...new Set(
      validationResponses
    ),
  ];


let validationConsistency =
  "UNKNOWN";


if (
  validationResponses.length === 0
) {

  validationConsistency =
    "NO_DATA";

} else if (
  uniqueValidationResponses.length === 1
) {

  validationConsistency =
    "CONSISTENT";

} else {

  validationConsistency =
    "CHANGED";

}


// ============================================
// LATEST VALIDATION
// ============================================

let latestValidation =
  null;


if (
  validationRecords.length > 0
) {

  latestValidation =
    validationRecords.reduce(
      (
        latest,
        current
      ) => {

        if (!latest) {
          return current;
        }

        return BigInt(
          current.lastUpdate
        ) >
        BigInt(
          latest.lastUpdate
        )
          ? current
          : latest;

      },
      null
    );

}


// ============================================
// OLDEST VALIDATION
// ============================================

let oldestValidation =
  null;


if (
  validationRecords.length > 0
) {

  oldestValidation =
    validationRecords.reduce(
      (
        oldest,
        current
      ) => {

        if (!oldest) {
          return current;
        }

        return BigInt(
          current.lastUpdate
        ) <
        BigInt(
          oldest.lastUpdate
        )
          ? current
          : oldest;

      },
      null
    );

}


// ============================================
// VALIDATION RANGE
// ============================================

let validationRange =
  null;


if (
  validationResponses.length > 1
) {

  validationRange =
    Math.max(
      ...validationResponses
    ) -
    Math.min(
      ...validationResponses
    );

}


// ============================================
// ACTOR OVERLAP
// ============================================

const overlappingActors =
  uniqueReputationActors.filter(
    (address) =>
      uniqueValidationActors.includes(
        address
      )
  );


// ============================================
// ACTOR DIVERSITY
// ============================================

const totalUniqueEvidenceActors =
  [
    ...new Set(
      [
        ...uniqueReputationActors,
        ...uniqueValidationActors,
      ]
    ),
  ];


// ============================================
// EVIDENCE INDEPENDENCE
// ============================================

let evidenceIndependence =
  "UNKNOWN";


if (
  overlappingActors.length > 0
) {

  evidenceIndependence =
    "LOW";

} else if (
  uniqueValidationActors.length >= 2 &&
  uniqueReputationActors.length >= 2
) {

  evidenceIndependence =
    "HIGH";

} else if (
  uniqueValidationActors.length === 1 ||
  uniqueReputationActors.length === 1
) {

  evidenceIndependence =
    "LIMITED";

}


// ============================================
// INVESTIGATION SIGNALS
// ============================================

const investigationSignals = [];


// Validation changed

if (
  validationConsistency === "CHANGED"
) {

  investigationSignals.push(
    "Validation results changed over time."
  );

}


// Actor overlap

if (
  overlappingActors.length > 0
) {

  investigationSignals.push(
    "A reputation provider is also a validator."
  );

}


// No validation

if (
  validationRecords.length === 0
) {

  investigationSignals.push(
    "No validation records found."
  );

}


// No reputation

if (
  activeFeedbacks.length === 0
) {

  investigationSignals.push(
    "No active reputation feedback found."
  );

}


// Revoked feedback

if (
  revokedFeedbacks.length > 0
) {

  investigationSignals.push(
    "Revoked reputation feedback exists."
  );

}


// Limited validator diversity

if (
  uniqueValidationActors.length === 1 &&
  validationRecords.length > 1
) {

  investigationSignals.push(
    "Multiple validations come from one validator."
  );

}


// Low validation result

if (
  latestValidation &&
  latestValidation.response < 50
) {

  investigationSignals.push(
    "Latest validation response is below 50/100."
  );

}


// ============================================
// EVIDENCE QUALITY
// ============================================

let evidenceQuality =
  "UNKNOWN";


// Strong

if (
  identityPresent &&
  metadataPresent &&
  activeFeedbacks.length >= 2 &&
  validationRecords.length >= 2 &&
  uniqueReputationActors.length >= 2 &&
  uniqueValidationActors.length >= 2 &&
  overlappingActors.length === 0
) {

  evidenceQuality =
    "STRONG";

}


// Medium

else if (
  identityPresent &&
  (
    activeFeedbacks.length > 0 ||
    validationRecords.length > 0
  )
) {

  evidenceQuality =
    "MEDIUM";

}


// Weak

else if (
  identityPresent
) {

  evidenceQuality =
    "WEAK";

}


// ============================================
// QUALITY LIMITERS
// ============================================

const qualityLimiters = [];


if (
 uniqueValidationActors.length === 1 &&
  validationRecords.length > 0
) {

  qualityLimiters.push(
    "Only one unique validator."
  );

}


if (
  overlappingActors.length > 0
) {

  qualityLimiters.push(
    "Evidence source overlap detected."
  );

}


if (
  validationConsistency === "CHANGED"
) {

  qualityLimiters.push(
    "Validation history contains different responses."
  );

}


if (
 revokedFeedbacks.length > 0
) {

  qualityLimiters.push(
    "Revoked feedback exists."
  );

}


if (
  metadataPresent
) {

  qualityLimiters.push(
    "Metadata exists, but its contents are not independently verified by this analyzer."
  );

}


// ============================================
// PRINT REPORT
// ============================================

console.log("");

console.log(
  "╔════════════════════════════════════════════╗"
);

console.log(
  "║         AGENT EVIDENCE ANALYZER v2        ║"
);

console.log(
  "╠════════════════════════════════════════════╣"
);

console.log(
  `║ Agent ID: ${evidence.agentId}`
);

console.log("");


// --------------------------------------------
// IDENTITY
// --------------------------------------------

console.log(
  "║ IDENTITY"
);

console.log(
  `║   On-chain identity:     ${
    identityPresent
      ? "PRESENT"
      : "MISSING"
  }`
);

console.log(
  `║   Owner:                 ${
    identity.owner ||
    "UNKNOWN"
  }`
);

console.log(
  `║   Metadata URI:          ${
    metadataPresent
      ? "PRESENT"
      : "MISSING"
  }`
);

console.log("");


// --------------------------------------------
// REPUTATION
// --------------------------------------------

console.log(
  "║ REPUTATION"
);

console.log(
  `║   Clients available:     ${
    reputationData.totalClients ??
    0
  }`
);

console.log(
  `║   Clients scanned:       ${
    reputationClients.length
  }`
);

console.log(
  `║   Total feedback:        ${
    allFeedbacks.length
  }`
);

console.log(
  `║   Active feedback:       ${
    activeFeedbacks.length
  }`
);

console.log(
  `║   Revoked feedback:      ${
    revokedFeedbacks.length
  }`
);

console.log(
  `║   Unique actors:         ${
    uniqueReputationActors.length
  }`
);


if (
  averageFeedback !== null
) {

  console.log(
    `║   Average value:         ${
      averageFeedback.toFixed(2)
    }`
  );

  console.log(
    `║   Lowest value:          ${
      lowestFeedback
    }`
  );

  console.log(
    `║   Highest value:         ${
      highestFeedback
    }`
  );

}


console.log(
  `║   Unique tags:           ${
    uniqueFeedbackTags.length
  }`
);

console.log("");


// --------------------------------------------
// VALIDATION
// --------------------------------------------

console.log(
  "║ VALIDATION"
);

console.log(
  `║   Requests available:    ${
    validationData.totalRequests ??
    0
  }`
);

console.log(
  `║   Records collected:     ${
    validationRecords.length
  }`
);

console.log(
  `║   Unique validators:     ${
    uniqueValidationActors.length
  }`
);

console.log(
  `║   Consistency:           ${
    validationConsistency
  }`
);


if (
  oldestValidation
) {

  console.log(
    `║   Oldest response:       ${
      oldestValidation.response
    }/100`
  );

}


if (
  latestValidation
) {

  console.log(
    `║   Latest response:       ${
      latestValidation.response
    }/100`
  );

  console.log(
    `║   Latest tag:            ${
      latestValidation.tag ||
      "(boş)"
    }`
  );

}


if (
  validationRange !== null
) {

  console.log(
    `║   Response range:        ${
      validationRange
    }`
  );

}


console.log("");


// --------------------------------------------
// INDEPENDENCE
// --------------------------------------------

console.log(
  "║ EVIDENCE INDEPENDENCE"
);

console.log(
  `║   Reputation actors:     ${
    uniqueReputationActors.length
  }`
);

console.log(
  `║   Validators:            ${
    uniqueValidationActors.length
  }`
);

console.log(
  `║   Shared actors:         ${
    overlappingActors.length
  }`
);

console.log(
  `║   Unique evidence actors: ${
    totalUniqueEvidenceActors.length
  }`
);

console.log(
  `║   Independence:          ${
    evidenceIndependence
  }`
);

console.log("");


// --------------------------------------------
// QUALITY
// --------------------------------------------

console.log(
  "║ EVIDENCE QUALITY"
);

console.log(
  `║   Classification:        ${
    evidenceQuality
  }`
);

console.log("");


// --------------------------------------------
// INVESTIGATION
// --------------------------------------------

console.log(
  "║ INVESTIGATION SIGNALS"
);

if (
  investigationSignals.length === 0
) {

  console.log(
    "║   None detected."
  );

} else {

  for (
    const signal
    of investigationSignals
  ) {

    console.log(
      `║   ⚠️ ${signal}`
    );

  }

}


console.log("");


// --------------------------------------------
// LIMITERS
// --------------------------------------------

console.log(
  "║ QUALITY LIMITERS"
);

if (
  qualityLimiters.length === 0
) {

  console.log(
    "║   None detected."
  );

} else {

  for (
    const limiter
    of qualityLimiters
  ) {

    console.log(
      `║   • ${limiter}`
    );

  }

}


console.log(
  "╚════════════════════════════════════════════╝"
);

console.log("");


// ============================================
// HUMAN SUMMARY
// ============================================

console.log(
  "🧠 ANALİZ ÖZETİ"
);

console.log(
  "--------------------------------------------"
);

console.log(
  `Agent: ${evidence.agentId}`
);

console.log(
  `Identity: ${
    identityPresent
      ? "PRESENT"
      : "MISSING"
  }`
);

console.log(
  `Active reputation: ${
    activeFeedbacks.length
  }`
);

console.log(
  `Validation records: ${
    validationRecords.length
  }`
);

console.log(
  `Evidence independence: ${
    evidenceIndependence
  }`
);

console.log(
  `Evidence quality: ${
    evidenceQuality
  }`
);

console.log(
  `Investigation signals: ${
    investigationSignals.length
  }`
);

console.log("");

console.log(
  "⚠️ NOT: Bu sonuç bir Trust Score değildir."
);

console.log(
  "Bu aşamada yalnızca kanıt yapısı analiz edilmektedir."
);

console.log("");