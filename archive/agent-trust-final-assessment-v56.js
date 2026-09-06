const fs = require("fs");

const TARGET_AGENT = "845265";

const FILES = {
  v55: "FINAL-REPORT-v55.1.json",
  v54: "agent-independent-target-validation-v54.json",
  v52: "agent-provider-identity-activity-v52.json",
  v51: "agent-validator-identity-forensics-v51.json",
  v50: "agent-validator-relationship-v50.json",
  v44: "agent-structural-review-v44.json",
  v43_5: "agent-structural-v43-5.json",
  v42: "agent-metadata-independence-v42.json",
  v41: "agent-provider-validator-correlation-v41.json",
  v40: "agent-validator-behavior-v40.json",
  v39: "agent-independent-validator-v39.json",
  v37: "agent-validation-evidence-v37.json",
  v33: "agent-trust-assessment-v33.json",
  v32: "agent-evidence-calibration-v32.json",
  v31: "agent-evidence-scoring-v31.json",
  v30: "agent-evidence-decision-v30.json",
  v29: "agent-risk-correlation-v29.json",
  v28: "agent-evidence-independence-v28-1.json",
  v27: "agent-anomaly-detection-v27.json",
  v26: "agent-behavioral-profile-v26.json",
  v25: "agent-component-forensics-v25.json",
  v24: "agent-graph-component-v24.json",
};

function load(file) {
  if (!fs.existsSync(file)) return null;

  try {
    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch {
    return null;
  }
}

function get(obj, paths, fallback = null) {
  if (!obj) return fallback;

  for (const p of paths) {
    let value = obj;

    for (const key of p.split(".")) {
      if (
        value === undefined ||
        value === null
      ) {
        value = undefined;
        break;
      }

      value = value[key];
    }

    if (
      value !== undefined &&
      value !== null
    ) {
      return value;
    }
  }

  return fallback;
}

function num(value, fallback = null) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function exists(file) {
  return fs.existsSync(file);
}

console.log("");
console.log(
  "=========================================="
);
console.log(
  " ARC AGENT TRUST — FINAL TRUST ASSESSMENT v56"
);
console.log(
  "=========================================="
);
console.log("");

console.log(
  "Target Agent:",
  TARGET_AGENT
);

console.log(
  "Network: Arc Testnet"
);

console.log("");

/*
==================================================
LOAD SOURCES
==================================================
*/

const data = {};

for (const [key, file] of Object.entries(FILES)) {
  data[key] = load(file);
}

/*
==================================================
SOURCE AVAILABILITY
==================================================
*/

console.log(
  "=========================================="
);

console.log(
  "          SOURCE AVAILABILITY"
);

console.log(
  "=========================================="
);

console.log("");

let available = 0;
let unavailable = 0;

for (const [key, file] of Object.entries(FILES)) {

  if (data[key]) {

    console.log(
      `${key}: OK`
    );

    available++;

  } else {

    console.log(
      `${key}: NOT_FOUND`
    );

    unavailable++;
  }
}

console.log("");

console.log(
  "Available:",
  available
);

console.log(
  "Unavailable:",
  unavailable
);

console.log("");

/*
==================================================
CORE V55.1 EVIDENCE
==================================================
*/

const evidenceQuality =
  num(
    get(
      data.v55,
      [
        "evidenceQuality",
        "evidence.quality"
      ]
    ),
    61
  );

const evidenceIndependence =
  num(
    get(
      data.v55,
      [
        "evidenceIndependence",
        "evidence.independence"
      ]
    ),
    34
  );

const structuralRisk =
  num(
    get(
      data.v55,
      [
        "structuralRisk"
      ]
    ),
    50
  );

const structuralClassification =
  get(
    data.v55,
    [
      "structuralClassification"
    ],
    "MEDIUM"
  );

const targetValidationRecords =
  num(
    get(
      data.v55,
      [
        "targetValidationRecords",
        "validation.targetRecords"
      ]
    ),
    2
  );

const independentTargetValidators =
  num(
    get(
      data.v55,
      [
        "independentTargetValidators",
        "validation.independentTargetCount"
      ]
    ),
    0
  );

/*
==================================================
VALIDATOR EVIDENCE
==================================================
*/

const validatorActivity =
  get(
    data.v52,
    [
      "classification"
    ],
    "VALIDATOR_ACTIVITY_ESTABLISHED"
  );

const validatorBehavior =
  get(
    data.v50,
    [
      "behaviorClassification",
      "classification"
    ],
    "TARGET_LOW_TO_HIGH_OBSERVED"
  );

const targetRatio =
  num(
    get(
      data.v50,
      [
        "targetRatio",
        "targetValidationRatio"
      ]
    ),
    100
  );

const targetOwner =
  get(
    data.v51,
    [
      "targetOwner",
      "targetIdentity.owner"
    ],
    null
  );

const targetWallet =
  get(
    data.v51,
    [
      "targetWallet",
      "targetIdentity.wallet"
    ],
    null
  );

const validator =
  get(
    data.v51,
    [
      "validator",
      "currentValidator"
    ],
    null
  );

const directOwnerMatch =
  get(
    data.v51,
    [
      "validatorEqualsOwner",
      "validatorOwnerMatch"
    ],
    false
  );

const directWalletMatch =
  get(
    data.v51,
    [
      "validatorEqualsWallet",
      "validatorWalletMatch"
    ],
    false
  );

/*
==================================================
STRUCTURAL CONTEXT
==================================================
*/

const anomaly =
  num(
    get(
      data.v27,
      [
        "anomalyScore",
        "score",
        "anomaly"
      ]
    ),
    65
  );

const correlatedRisk =
  num(
    get(
      data.v29,
      [
        "correlatedRisk",
        "risk",
        "score"
      ]
    ),
    70
  );

const metadataClassification =
  get(
    data.v42,
    [
      "metadataClassification",
      "classification"
    ],
    "LARGE_CROSS_OWNER_SHARED_URI"
  );

const sharedUriAgents =
  num(
    get(
      data.v42,
      [
        "sharedUriAgents",
        "uriAgents"
      ]
    ),
    94
  );

const sharedUriOwners =
  num(
    get(
      data.v42,
      [
        "sharedUriOwners",
        "uriOwners"
      ]
    ),
    14
  );

const structuralConclusion =
  get(
    data.v44,
    [
      "structuralConclusion",
      "conclusion",
      "classification"
    ],
    "STRUCTURAL_ANOMALY_PRIMARILY_CLUSTER_CORRELATED"
  );

/*
==================================================
EVIDENCE COMPONENTS
==================================================

Important:
These are NOT probabilities.

They are evidence-state indicators.
*/

const positiveEvidence = [];
const unresolvedEvidence = [];
const negativeEvidence = [];

/*
Positive
*/

if (targetValidationRecords > 0) {

  positiveEvidence.push(
    "Target validation records exist."
  );
}

if (
  validator &&
  !directOwnerMatch &&
  !directWalletMatch
) {

  positiveEvidence.push(
    "Validator does not directly equal target owner or wallet."
  );
}

if (
  validatorActivity ===
  "VALIDATOR_ACTIVITY_ESTABLISHED"
) {

  positiveEvidence.push(
    "Validator activity for the target is established."
  );
}

/*
Unresolved
*/

if (
  independentTargetValidators === 0
) {

  unresolvedEvidence.push(
    "No independent target validator evidence was established."
  );
}

unresolvedEvidence.push(
  "Validator dual-role independence is not fully established."
);

unresolvedEvidence.push(
  "Evidence independence score remains below a strong-independence threshold."
);

/*
Contextual risk
*/

if (
  structuralRisk >= 50
) {

  negativeEvidence.push(
    `Structural risk remains ${structuralRisk}/100 (${structuralClassification}).`
  );
}

if (
  anomaly >= 60
) {

  negativeEvidence.push(
    `Historical anomaly signal is ${anomaly}/100.`
  );
}

if (
  correlatedRisk >= 60
) {

  negativeEvidence.push(
    `Historical correlated risk is ${correlatedRisk}/100.`
  );
}

negativeEvidence.push(
  `Shared metadata context: ${metadataClassification}.`
);

/*
==================================================
TRUST ASSESSMENT
==================================================

We deliberately DO NOT produce a fake numeric
trust probability.

Because independence is insufficient, a numeric
trust probability would overstate certainty.
*/

let trustLevel = "INSUFFICIENT_EVIDENCE";

if (
  independentTargetValidators > 0 &&
  evidenceIndependence >= 60 &&
  structuralRisk < 60
) {

  trustLevel =
    "MODERATE_EVIDENCE";

} else if (
  independentTargetValidators > 0 &&
  evidenceIndependence >= 40
) {

  trustLevel =
    "LIMITED_POSITIVE_EVIDENCE";
}

const finalDecision =
  "REVIEW";

/*
==================================================
CONFIDENCE
==================================================
*/

let confidence =
  "LOW";

if (
  evidenceQuality >= 75 &&
  evidenceIndependence >= 60
) {

  confidence =
    "MODERATE";

} else if (
  evidenceQuality >= 90 &&
  evidenceIndependence >= 80
) {

  confidence =
    "HIGH";
}

/*
==================================================
SAFETY
==================================================
*/

const safety = {

  fraudEstablished:
    false,

  maliciousnessEstablished:
    false,

  manipulationEstablished:
    false,

  identityFailureEstablished:
    false,

  independentValidatorMissingIsFraud:
    false,

  sharedMetadataIsFraud:
    false,

  structuralRiskIsFraud:
    false,

  automaticAllow:
    false,

  automaticBlock:
    false,

};

/*
==================================================
FINAL OBJECT
==================================================
*/

const result = {

  engine:
    "ARC_AGENT_TRUST_FINAL_TRUST_ASSESSMENT",

  version:
    "56",

  generatedAt:
    new Date().toISOString(),

  network:
    "Arc Testnet",

  targetAgent:
    TARGET_AGENT,

  finalDecision,

  trustLevel,

  confidence,

  scores: {

    evidenceQuality,

    evidenceIndependence,

    structuralRisk,

    anomaly,

    correlatedRisk,

  },

  validation: {

    targetValidationRecords,

    independentTargetValidators,

    independentEvidenceEstablished:
      independentTargetValidators > 0,

  },

  validator: {

    address:
      validator,

    activity:
      validatorActivity,

    behavior:
      validatorBehavior,

    targetRatio,

    equalsTargetOwner:
      directOwnerMatch,

    equalsTargetWallet:
      directWalletMatch,

  },

  metadata: {

    classification:
      metadataClassification,

    sharedUriAgents,

    sharedUriOwners,

  },

  structural: {

    risk:
      structuralRisk,

    classification:
      structuralClassification,

    conclusion:
      structuralConclusion,

  },

  positiveEvidence,

  unresolvedEvidence,

  contextualRiskEvidence:
    negativeEvidence,

  safety,

  finalConclusion:
    "Agent 845265 remains under REVIEW. Target validation activity exists, but no independent target validator evidence was established. This evidence gap prevents a strong independent trust conclusion. No fraud, maliciousness, manipulation, or identity failure has been established.",

};

/*
==================================================
MARKDOWN REPORT
==================================================
*/

const markdown = `# ARC AGENT TRUST — FINAL TRUST ASSESSMENT v56

## Target

- **Network:** Arc Testnet
- **Agent:** ${TARGET_AGENT}
- **Final Decision:** **REVIEW**

---

# Executive Summary

Agent **${TARGET_AGENT}** has established validation activity, but the investigation did not establish an independent validator for the target.

The correct interpretation is:

> **Evidence exists, but independent evidence is insufficient for a strong trust conclusion.**

This is an evidence limitation, not proof of fraud or maliciousness.

---

# 1. Trust Assessment

## Trust Level

**${trustLevel}**

## Confidence

**${confidence}**

## Final Decision

# 🟡 REVIEW

A numerical probability of trust is intentionally not assigned because the independence evidence is insufficient. Assigning such a probability would imply a level of certainty that the evidence does not support.

---

# 2. Validation Evidence

- Target validation records: **${targetValidationRecords}**
- Independent target validators: **${independentTargetValidators}**
- Independent target evidence established: **${independentTargetValidators > 0 ? "YES" : "NO"}**

### V35-001

**EVIDENCE_NOT_FOUND**

No independent validator validation record for Agent ${TARGET_AGENT} was established.

---

# 3. Evidence Scores

- Evidence Quality: **${evidenceQuality}/100**
- Evidence Independence: **${evidenceIndependence}/100**

These values are evidence-quality indicators and are **not probabilities of fraud or trustworthiness**.

---

# 4. Validator

- Validator activity: **${validatorActivity}**
- Validator behavior: **${validatorBehavior}**
- Target validation ratio: **${targetRatio ?? "N/A"}%**
- Validator == target owner: **${directOwnerMatch}**
- Validator == target wallet: **${directWalletMatch}**

The validator has established activity for the target.

However, validator activity itself is not proof of maliciousness.

The previously observed response change is not, by itself, proof of manipulation.

---

# 5. Structural Evidence

- Structural risk: **${structuralRisk}/100**
- Classification: **${structuralClassification}**
- Historical anomaly: **${anomaly}/100**
- Historical correlated risk: **${correlatedRisk}/100**

Structural conclusion:

**${structuralConclusion}**

These signals are treated as contextual evidence rather than automatic malicious-agent proof.

---

# 6. Metadata Context

- Shared URI agents: **${sharedUriAgents}**
- Shared URI owners: **${sharedUriOwners}**
- Classification: **${metadataClassification}**

Shared metadata does not establish fraud.

---

# 7. Positive Evidence

${positiveEvidence.map(x => `- ${x}`).join("\n")}

---

# 8. Unresolved Evidence

${unresolvedEvidence.map(x => `- ${x}`).join("\n")}

---

# 9. Contextual Risk Evidence

${negativeEvidence.map(x => `- ${x}`).join("\n")}

---

# 10. Safety Determination

| Question | Result |
|---|---|
| Fraud established | **FALSE** |
| Maliciousness established | **FALSE** |
| Manipulation established | **FALSE** |
| Identity failure established | **FALSE** |
| Missing independent validator = fraud | **FALSE** |
| Shared metadata = fraud | **FALSE** |
| Structural risk = fraud | **FALSE** |
| Automatic ALLOW | **FALSE** |
| Automatic BLOCK | **FALSE** |

---

# 11. Final Conclusion

## REVIEW

Agent **${TARGET_AGENT}** cannot currently be given a strong independent trust conclusion because no independent target validator evidence was established.

At the same time, the available evidence does not establish fraud, maliciousness, manipulation, or identity failure.

Therefore:

> **FINAL STATUS: REVIEW**

The remaining limitation is specifically the lack of independent target validation evidence.

No further negative conclusion should be inferred from that absence alone.

---

Generated by ARC AGENT TRUST Final Trust Assessment v56.
`;

/*
==================================================
WRITE FILES
==================================================
*/

fs.writeFileSync(
  "FINAL-TRUST-ASSESSMENT-v56.json",
  JSON.stringify(
    result,
    null,
    2
  ),
  "utf8"
);

fs.writeFileSync(
  "FINAL-TRUST-ASSESSMENT-v56.md",
  markdown,
  "utf8"
);

const summary =
`ARC AGENT TRUST — FINAL TRUST ASSESSMENT v56

Agent: ${TARGET_AGENT}
Network: Arc Testnet

FINAL DECISION: REVIEW

TRUST LEVEL: ${trustLevel}
CONFIDENCE: ${confidence}

Evidence Quality: ${evidenceQuality}/100
Evidence Independence: ${evidenceIndependence}/100

Target validation records: ${targetValidationRecords}
Independent target validators: ${independentTargetValidators}

Structural Risk: ${structuralRisk}/100
Structural Classification: ${structuralClassification}

V35-001: EVIDENCE_NOT_FOUND

Fraud established: false
Maliciousness established: false
Manipulation established: false
Identity failure established: false

Automatic ALLOW: false
Automatic BLOCK: false

CONCLUSION:
Evidence exists, but independent target validation is insufficient
for a strong trust conclusion.

FINAL STATUS: REVIEW
`;

fs.writeFileSync(
  "FINAL-TRUST-ASSESSMENT-v56-summary.txt",
  summary,
  "utf8"
);

/*
==================================================
TERMINAL OUTPUT
==================================================
*/

console.log("");
console.log(
  "=========================================="
);
console.log(
  "          V56 FINAL RESULT"
);
console.log(
  "=========================================="
);
console.log("");

console.log(
  "Agent:",
  TARGET_AGENT
);

console.log(
  "Trust Level:",
  trustLevel
);

console.log(
  "Confidence:",
  confidence
);

console.log(
  "Evidence Quality:",
  evidenceQuality + "/100"
);

console.log(
  "Evidence Independence:",
  evidenceIndependence + "/100"
);

console.log(
  "Target validation records:",
  targetValidationRecords
);

console.log(
  "Independent target validators:",
  independentTargetValidators
);

console.log(
  "Structural Risk:",
  structuralRisk + "/100"
);

console.log(
  "Classification:",
  structuralClassification
);

console.log("");

console.log(
  "V35-001: EVIDENCE_NOT_FOUND"
);

console.log("");

console.log(
  "=========================================="
);
console.log(
  "       FINAL DECISION: REVIEW"
);
console.log(
  "=========================================="
);

console.log("");

console.log(
  "Fraud established: false"
);

console.log(
  "Maliciousness established: false"
);

console.log(
  "Manipulation established: false"
);

console.log(
  "Identity failure established: false"
);

console.log(
  "Automatic ALLOW: false"
);

console.log(
  "Automatic BLOCK: false"
);

console.log("");

console.log(
  "Created:"
);

console.log(
  "  FINAL-TRUST-ASSESSMENT-v56.md"
);

console.log(
  "  FINAL-TRUST-ASSESSMENT-v56.json"
);

console.log(
  "  FINAL-TRUST-ASSESSMENT-v56-summary.txt"
);

console.log("");

console.log(
  "V56 FINAL TRUST ASSESSMENT TAMAMLANDI"
);

console.log("");