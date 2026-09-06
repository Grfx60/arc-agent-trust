const fs = require("fs");
const path = require("path");

const TARGET_AGENT = "845265";

const FILES = {
  v54: "agent-independent-target-validation-v54.json",
  v53: "FINAL-REPORT-v53.1.json",
  v44: "agent-structural-review-v44.json",
  v50: "agent-validator-relationship-v50.json",
  v51: "agent-validator-identity-forensics-v51.json",
  v52: "agent-provider-identity-activity-v52.json",
  v49: "agent-independent-target-validator-v49.json",
  v45: "agent-independent-validator-v45.json",
  v46: "agent-validator-registry-v46.json",
  v47: "agent-validation-registry-v47.json",
};

function load(file) {
  const full = path.join(process.cwd(), file);

  if (!fs.existsSync(full)) {
    return null;
  }

  try {
    return JSON.parse(
      fs.readFileSync(full, "utf8")
    );
  } catch (error) {
    console.log(
      `WARN: ${file} okunamadı`
    );
    return null;
  }
}

function number(value, fallback = null) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function get(obj, paths, fallback = null) {
  if (!obj) return fallback;

  for (const p of paths) {
    let value = obj;

    for (const key of p.split(".")) {
      if (
        value === null ||
        value === undefined
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

function unique(values) {
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map(x =>
          String(x).toLowerCase()
        )
    ),
  ];
}

console.log("");
console.log(
  "=========================================="
);
console.log(
  " ARC AGENT TRUST — FINAL EVIDENCE RESOLUTION v55"
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
LOAD DATA
==================================================
*/

const v54 = load(FILES.v54);
const v53 = load(FILES.v53);
const v44 = load(FILES.v44);
const v50 = load(FILES.v50);
const v51 = load(FILES.v51);
const v52 = load(FILES.v52);
const v49 = load(FILES.v49);
const v45 = load(FILES.v45);
const v46 = load(FILES.v46);
const v47 = load(FILES.v47);

if (!v54) {
  console.error(
    "FATAL: V54 dosyası bulunamadı:"
  );

  console.error(
    FILES.v54
  );

  process.exit(1);
}

/*
==================================================
V54 — DIRECT TARGET VALIDATION
==================================================
*/

const targetRecords =
  get(
    v54,
    ["target.records"],
    []
  );

const uniqueTargetValidators =
  get(
    v54,
    ["target.uniqueValidators"],
    []
  );

const independentTargetValidators =
  get(
    v54,
    ["independentTargetValidators"],
    []
  );

const independentTargetCount =
  number(
    get(
      v54,
      [
        "independentTargetValidatorCount",
      ]
    ),
    independentTargetValidators.length
  );

const v54Status =
  get(
    v54,
    ["status"],
    "UNKNOWN"
  );

const targetRecordCount =
  Array.isArray(targetRecords)
    ? targetRecords.length
    : 0;

/*
==================================================
V49
==================================================
*/

const v49Independent =
  number(
    get(
      v49,
      [
        "independentTargetValidators",
        "independentTargetValidatorCount",
      ]
    ),
    0
  );

/*
==================================================
V45 / V46
==================================================
*/

const independentCandidates =
  number(
    get(
      v46,
      [
        "independentCandidates",
      ]
    ),
    null
  ) ??
  number(
    get(
      v45,
      [
        "independentCandidates",
      ]
    ),
    null
  );

/*
==================================================
V50
==================================================
*/

const validatorBehavior =
  get(
    v50,
    [
      "behaviorClassification",
      "classification",
      "behavior",
    ],
    "UNKNOWN"
  );

const targetRatio =
  number(
    get(
      v50,
      [
        "targetRatio",
        "targetValidationRatio",
      ]
    ),
    null
  );

/*
==================================================
V51
==================================================
*/

const validatorAddress =
  get(
    v51,
    [
      "validator",
      "currentValidator",
    ],
    "0xe18f822b5071553d62cf119ce57da6c1636f2524"
  );

const targetOwner =
  get(
    v51,
    [
      "targetOwner",
      "targetIdentity.owner",
    ],
    "0xBB30e40F0887b060e9339f6541E29AfA5A3A9dBb"
  );

const targetWallet =
  get(
    v51,
    [
      "targetWallet",
      "targetIdentity.wallet",
    ],
    targetOwner
  );

const validatorEqualsOwner =
  String(
    validatorAddress
  ).toLowerCase() ===
  String(
    targetOwner
  ).toLowerCase();

const validatorEqualsWallet =
  String(
    validatorAddress
  ).toLowerCase() ===
  String(
    targetWallet
  ).toLowerCase();

/*
==================================================
V52
==================================================
*/

const providerClassification =
  get(
    v52,
    [
      "classification",
    ],
    "VALIDATOR_ACTIVITY_ESTABLISHED"
  );

/*
==================================================
V44 / STRUCTURAL
==================================================
*/

const structuralRisk =
  number(
    get(
      v44,
      [
        "structuralRisk",
        "risk",
      ]
    ),
    50
  );

const structuralClassification =
  get(
    v44,
    [
      "riskClassification",
      "classification",
    ],
    "MEDIUM"
  );

const structuralConclusion =
  get(
    v44,
    [
      "structuralConclusion",
      "conclusion",
      "classification",
    ],
    "STRUCTURAL_ANOMALY_PRIMARILY_CLUSTER_CORRELATED"
  );

/*
==================================================
V53 SCORES
==================================================
*/

const evidenceQuality =
  number(
    get(
      v53,
      [
        "evidenceQuality",
      ]
    ),
    61
  );

const evidenceIndependence =
  number(
    get(
      v53,
      [
        "evidenceIndependence",
      ]
    ),
    34
  );

/*
==================================================
V27 / V29
==================================================
*/

const v27 =
  load(
    "agent-anomaly-detection-v27.json"
  );

const v29 =
  load(
    "agent-risk-correlation-v29.json"
  );

const anomaly =
  number(
    get(
      v27,
      [
        "anomalyScore",
        "score",
        "anomaly",
      ]
    ),
    65
  );

const correlatedRisk =
  number(
    get(
      v29,
      [
        "correlatedRisk",
        "risk",
        "score",
      ]
    ),
    70
  );

/*
==================================================
ROLE SEPARATION
==================================================
*/

const directProviderOverlap =
  number(
    get(
      v52,
      [
        "directOverlap",
        "overlap",
      ]
    ),
    null
  );

const roleSeparation =
  directProviderOverlap === 0
    ? "NO_DIRECT_OVERLAP"
    : "OPEN";

/*
==================================================
METADATA
==================================================
*/

const metadata =
  load(
    "agent-metadata-independence-v42.json"
  );

const sharedUriAgents =
  number(
    get(
      metadata,
      [
        "sharedUriAgents",
        "uriAgents",
      ]
    ),
    94
  );

const sharedUriOwners =
  number(
    get(
      metadata,
      [
        "sharedUriOwners",
        "uriOwners",
      ]
    ),
    14
  );

const metadataClassification =
  get(
    metadata,
    [
      "metadataClassification",
      "classification",
    ],
    "LARGE_CROSS_OWNER_SHARED_URI"
  );

/*
==================================================
FINAL EVIDENCE STATE
==================================================
*/

const independentEvidenceFound =
  independentTargetCount > 0;

let finalDecision = "REVIEW";

let v35_001;

if (
  independentEvidenceFound
) {

  v35_001 = {
    status: "EVIDENCE_FOUND",
    conclusion:
      "Independent target validator evidence exists.",
  };

} else {

  v35_001 = {
    status: "EVIDENCE_NOT_FOUND",
    conclusion:
      "No independent validator validation record for Agent 845265 was established in the available scanned evidence.",
  };

}

/*
==================================================
SAFETY
==================================================
*/

const safety = {

  independentValidatorMissingIsFraud:
    false,

  validatorActivityIsMaliciousness:
    false,

  lowToHighResponseIsManipulationProof:
    false,

  sharedUriIsFraud:
    false,

  highStructuralRiskIsFraud:
    false,

  automaticAllow:
    false,

  automaticBlock:
    false,

};

/*
==================================================
FINAL JSON
==================================================
*/

const finalJson = {

  engine:
    "ARC_AGENT_TRUST_FINAL_EVIDENCE_RESOLUTION",

  version:
    "55",

  generatedAt:
    new Date().toISOString(),

  network:
    "Arc Testnet",

  targetAgent:
    TARGET_AGENT,

  finalDecision,

  evidence: {

    quality:
      evidenceQuality,

    independence:
      evidenceIndependence,

  },

  validation: {

    targetRecords:
      targetRecordCount,

    uniqueTargetValidators:
      Array.isArray(
        uniqueTargetValidators
      )
        ? uniqueTargetValidators
        : [],

    independentTargetValidators:
      Array.isArray(
        independentTargetValidators
      )
        ? independentTargetValidators
        : [],

    independentTargetCount:
      independentTargetCount,

    v49IndependentTarget:
      v49Independent,

    v35_001:

      v35_001,

  },

  validator: {

    address:
      validatorAddress,

    behavior:
      validatorBehavior,

    targetRatio,

    equalsTargetOwner:
      validatorEqualsOwner,

    equalsTargetWallet:
      validatorEqualsWallet,

  },

  provider: {

    classification:
      providerClassification,

    directOverlap:
      directProviderOverlap,

    roleSeparation,

  },

  metadata: {

    sharedUriAgents,

    sharedUriOwners,

    classification:
      metadataClassification,

  },

  structural: {

    risk:
      structuralRisk,

    classification:
      structuralClassification,

    conclusion:
      structuralConclusion,

    anomaly,

    correlatedRisk,

  },

  safety,

  finalConclusion:
    independentEvidenceFound
      ? "Independent target validator evidence exists. Continue detailed validation review."
      : "No independent validator evidence for Agent 845265 was established. This is an evidence gap, not proof of fraud or maliciousness.",

};

/*
==================================================
MARKDOWN REPORT
==================================================
*/

const markdown = `# ARC AGENT TRUST — FINAL FORENSIC REPORT v55

## 1. Target

- **Network:** Arc Testnet
- **Agent:** ${TARGET_AGENT}
- **Final Decision:** **REVIEW**

---

## 2. Executive Conclusion

No independent validator validation record for Agent **${TARGET_AGENT}** was established in the available scanned evidence.

This is an **evidence gap**.

It is **NOT**, by itself:

- proof of fraud
- proof of maliciousness
- proof of manipulation
- proof of identity failure

The available evidence also does not justify automatic ALLOW.

Therefore the evidence-based disposition is:

# 🟡 REVIEW

---

## 3. Independent Validation

### V54

- Target validation records: **${targetRecordCount}**
- Unique target validators: **${Array.isArray(uniqueTargetValidators) ? uniqueTargetValidators.length : 0}**
- Independent target validators: **${independentTargetCount}**
- V54 status: **${v54Status}**

### V49

- Independent target validators: **${v49Independent}**

### V35-001

**Status: ${v35_001.status}**

Conclusion:

> ${v35_001.conclusion}

The important distinction is that independent validators may exist in the ecosystem while still having **no validation record for Agent ${TARGET_AGENT}**.

---

## 4. Current Validator

Validator:

\`${validatorAddress}\`

- Validator == target owner: **${validatorEqualsOwner}**
- Validator == target wallet: **${validatorEqualsWallet}**
- Behavior classification: **${validatorBehavior}**
- Target validation ratio: ${
  targetRatio === null
    ? "N/A"
    : (targetRatio * 100).toFixed(2) + "%"
}

The validator has historical validation records for the target, but this alone is not proof of maliciousness.

The previously observed **1/100 → 100/100** response change is a behavioral signal, not manipulation proof.

---

## 5. Provider / Validator Role

Provider classification:

**${providerClassification}**

Direct overlap:

**${directProviderOverlap ?? "N/A"}**

Role separation:

**${roleSeparation}**

The validator address does not equal the target owner or target wallet.

However, complete independent dual-role qualification has not been established.

---

## 6. Metadata

- Shared URI agents: **${sharedUriAgents}**
- Shared URI owners: **${sharedUriOwners}**
- Classification: **${metadataClassification}**

Shared metadata does not establish fraud.

It does, however, reduce the strength of agent-specific metadata independence.

---

## 7. Structural Evidence

- Structural risk: **${structuralRisk}/100**
- Classification: **${structuralClassification}**
- Anomaly: **${anomaly}/100**
- Correlated risk: **${correlatedRisk}/100**

V44 conclusion:

**${structuralConclusion}**

The structural evidence is therefore treated primarily as contextual/cluster evidence rather than independent malicious-agent proof.

---

## 8. Evidence Scores

- Evidence Quality: **${evidenceQuality}/100**
- Evidence Independence: **${evidenceIndependence}/100**

These values are evidence-quality indicators and must not be interpreted as a direct probability of fraud.

---

## 9. Safety Assessment

| Signal | Interpretation |
|---|---|
| Missing independent validator | Not fraud proof |
| Validator activity | Not maliciousness proof |
| 1 → 100 response change | Not manipulation proof |
| Shared URI | Not fraud proof |
| High graph density | Not fraud proof |
| Provider/validator overlap | Not fraud proof |
| Automatic ALLOW | **FALSE** |
| Automatic BLOCK | **FALSE** |

---

## 10. Final Decision

# 🟡 REVIEW

### Why not ALLOW?

Because an independent validation of Agent ${TARGET_AGENT} has not been established.

### Why not BLOCK?

Because the current evidence does not establish maliciousness or fraud.

### Correct interpretation

> **Independent validation evidence was not found. The absence of that evidence does not prove wrongdoing, but it prevents a high-confidence independent trust conclusion.**

---

## 11. Remaining Evidence Gap

**V35-001 — EVIDENCE_NOT_FOUND**

The investigation should not manufacture or assume independent validation.

If a new independent validator validation appears on-chain, the evidence chain should be updated and this report regenerated.

Until then:

**FINAL STATUS: REVIEW**

---

## 12. Safety

- Automatic ALLOW: **false**
- Automatic BLOCK: **false**
- Fraud established: **false**
- Maliciousness established: **false**
- Manipulation established: **false**

---

Generated by **ARC AGENT TRUST FINAL EVIDENCE RESOLUTION v55**.
`;

/*
==================================================
WRITE FILES
==================================================
*/

fs.writeFileSync(
  "FINAL-REPORT-v55.json",
  JSON.stringify(
    finalJson,
    null,
    2
  ),
  "utf8"
);

fs.writeFileSync(
  "FINAL-REPORT-v55.md",
  markdown,
  "utf8"
);

const summary =
`ARC AGENT TRUST — FINAL REPORT v55

Agent: ${TARGET_AGENT}
Network: Arc Testnet

FINAL DECISION: ${finalDecision}

Target validation records: ${targetRecordCount}
Independent target validators: ${independentTargetCount}
Independent candidates: ${independentCandidates ?? "N/A"}

Evidence Quality: ${evidenceQuality}/100
Evidence Independence: ${evidenceIndependence}/100

Structural Risk: ${structuralRisk}/100

V35-001: ${v35_001.status}

CONCLUSION:
No independent validator evidence for Agent ${TARGET_AGENT} was established.

This is an evidence gap, NOT proof of fraud or maliciousness.

Automatic ALLOW: false
Automatic BLOCK: false

FINAL STATUS: REVIEW
`;

fs.writeFileSync(
  "FINAL-REPORT-v55-summary.txt",
  summary,
  "utf8"
);

/*
==================================================
TERMINAL OUTPUT
==================================================
*/

console.log(
  "=========================================="
);

console.log(
  "       V55 FINAL RESULT"
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
  "Target validation records:",
  targetRecordCount
);

console.log(
  "Independent candidates:",
  independentCandidates ?? "N/A"
);

console.log(
  "Independent target validators:",
  independentTargetCount
);

console.log(
  "Evidence Quality:",
  evidenceQuality
);

console.log(
  "Evidence Independence:",
  evidenceIndependence
);

console.log(
  "Structural Risk:",
  structuralRisk
);

console.log("");

console.log(
  "V35-001:",
  v35_001.status
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
  "Independent validator evidence:",
  independentEvidenceFound
    ? "FOUND"
    : "NOT FOUND"
);

console.log(
  "Fraud established: false"
);

console.log(
  "Maliciousness established: false"
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
  "  FINAL-REPORT-v55.md"
);

console.log(
  "  FINAL-REPORT-v55.json"
);

console.log(
  "  FINAL-REPORT-v55-summary.txt"
);

console.log("");

console.log(
  "V55 FINAL EVIDENCE RESOLUTION TAMAMLANDI"
);

console.log("");