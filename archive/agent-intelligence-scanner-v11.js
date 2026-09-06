const fs = require("fs");


// ============================================
// ARGUMENT
// ============================================

const AGENT_ID = process.argv[2];

if (!AGENT_ID) {
  console.error("");
  console.error("❌ Agent ID belirtilmedi.");
  console.error("");
  console.error(
    "Kullanım:"
  );
  console.error(
    "node agent-intelligence-scanner-v11.js <AGENT_ID>"
  );
  console.error("");
  console.error(
    "Örnek:"
  );
  console.error(
    "node agent-intelligence-scanner-v11.js 845265"
  );
  console.error("");
  process.exit(1);
}


// ============================================
// FILES
// ============================================

const FILES = {

  evidence:
    `agent-${AGENT_ID}-evidence.json`,

  graph:
    `agent-${AGENT_ID}-graph-v2.json`,

  dynamics:
    `agent-${AGENT_ID}-dynamics-v9.json`,

  intelligence:
    `agent-${AGENT_ID}-intelligence-v10.json`

};


// ============================================
// HEADER
// ============================================

console.log("");

console.log(
  "=========================================="
);

console.log(
  "       AGENT INTELLIGENCE SCANNER v11"
);

console.log(
  "=========================================="
);

console.log("");

console.log(
  "Agent:",
  AGENT_ID
);

console.log("");


// ============================================
// LOADER
// ============================================

function loadJson(
  filename,
  label
) {

  if (
    !fs.existsSync(filename)
  ) {

    console.log(
      `⚠ ${label} bulunamadı: ${filename}`
    );

    return null;

  }


  try {

    return JSON.parse(
      fs.readFileSync(
        filename,
        "utf8"
      )
    );

  } catch (
    error
  ) {

    console.log(
      `⚠ ${label} okunamadı.`
    );

    console.log(
      error.message
    );

    return null;

  }

}


// ============================================
// LOAD
// ============================================

const evidence =
  loadJson(
    FILES.evidence,
    "Evidence"
  );

const graph =
  loadJson(
    FILES.graph,
    "Graph"
  );

const dynamics =
  loadJson(
    FILES.dynamics,
    "Dynamics"
  );

const intelligence =
  loadJson(
    FILES.intelligence,
    "Intelligence"
  );


// ============================================
// AVAILABILITY
// ============================================

console.log(
  "=========================================="
);

console.log(
  "           DATA AVAILABILITY"
);

console.log(
  "=========================================="
);

console.log("");

console.log(
  "Evidence:",
  evidence
    ? "OK"
    : "MISSING"
);

console.log(
  "Graph:",
  graph
    ? "OK"
    : "MISSING"
);

console.log(
  "Dynamics:",
  dynamics
    ? "OK"
    : "MISSING"
);

console.log(
  "Intelligence:",
  intelligence
    ? "OK"
    : "MISSING"
);

console.log("");


// ============================================
// STOP IF INTELLIGENCE MISSING
// ============================================

if (
  !intelligence
) {

  console.error(
    "❌ Intelligence dosyası bulunamadı."
  );

  console.error("");

  console.error(
    "Önce V10 çalıştırılmalı:"
  );

  console.error(
    `node evidence-intelligence-v10.js ${AGENT_ID}`
  );

  console.error("");

  process.exit(1);

}


// ============================================
// EXTRACT
// ============================================

const identity =
  intelligence.identity || {};

const reputation =
  intelligence.reputation || {};

const validation =
  intelligence.validation || {};

const intelligenceGraph =
  intelligence.graph || {};

const intelligenceDynamics =
  intelligence.dynamics || {};

const assessment =
  intelligence.assessment || {};

const decision =
  intelligence.decision || {};


// ============================================
// SUMMARY
// ============================================

console.log(
  "=========================================="
);

console.log(
  "          AGENT INTELLIGENCE"
);

console.log(
  "=========================================="
);

console.log("");

console.log(
  "Agent:",
  AGENT_ID
);

console.log("");


// ============================================
// IDENTITY
// ============================================

console.log(
  "IDENTITY"
);

console.log(
  "----------------------------------------"
);

console.log(
  identity.present
    ? "✓ PRESENT"
    : "✗ MISSING"
);

console.log("");


// ============================================
// REPUTATION
// ============================================

console.log(
  "REPUTATION"
);

console.log(
  "----------------------------------------"
);

console.log(
  reputation.present
    ? "✓ PRESENT"
    : "✗ MISSING"
);

console.log(
  "Providers:",
  reputation.providers
);

console.log(
  "Records:",
  reputation.records
);

console.log(
  "Active:",
  reputation.active
);

console.log(
  "Revoked:",
  reputation.revoked
);

console.log(
  "Semantic:",
  reputation.semantic
);

console.log("");


// ============================================
// VALIDATION
// ============================================

console.log(
  "VALIDATION"
);

console.log(
  "----------------------------------------"
);

console.log(
  validation.present
    ? "✓ PRESENT"
    : "✗ MISSING"
);

console.log(
  "Records:",
  validation.records
);

console.log(
  "Validators:",
  validation.validators
);

console.log(
  "Changed:",
  validation.changed
);

console.log("");


// ============================================
// GRAPH
// ============================================

console.log(
  "GRAPH"
);

console.log(
  "----------------------------------------"
);

console.log(
  "Nodes:",
  intelligenceGraph.nodes
);

console.log(
  "Relationships:",
  intelligenceGraph.relationships
);

console.log(
  "Overlapping actors:",
  intelligenceGraph.overlappingActors
);

console.log(
  "Graph risk:",
  intelligenceGraph.risk
);

console.log(
  "Graph consistency:",
  intelligenceGraph.consistency
);

console.log("");


// ============================================
// DYNAMICS
// ============================================

console.log(
  "DYNAMICS"
);

console.log(
  "----------------------------------------"
);

console.log(
  "Temporal coverage:",
  intelligenceDynamics.temporalCoverage
);

console.log(
  "Temporal assessment:",
  intelligenceDynamics.temporalAssessment
);

console.log(
  "Reputation consistency:",
  intelligenceDynamics.reputationConsistency
);

console.log(
  "Validation consistency:",
  intelligenceDynamics.validationConsistency
);

console.log(
  "Reputation changes:",
  intelligenceDynamics.reputationChanges
);

console.log(
  "Validation changes:",
  intelligenceDynamics.validationChanges
);

console.log("");


// ============================================
// ASSESSMENT
// ============================================

console.log(
  "=========================================="
);

console.log(
  "             ASSESSMENT"
);

console.log(
  "=========================================="
);

console.log("");

console.log(
  "Evidence coverage:",
  `${assessment.evidenceCoverage}/100`
);

console.log(
  "Evidence independence:",
  assessment.evidenceIndependence
);

console.log(
  "Evidence quality:",
  assessment.evidenceQuality
);

console.log(
  "Graph risk:",
  assessment.graphRisk
);

console.log(
  "Graph consistency:",
  assessment.graphConsistency
);

console.log(
  "Temporal assessment:",
  assessment.temporalAssessment
);

console.log(
  "Temporal coverage:",
  assessment.temporalCoverage
);

console.log("");


// ============================================
// DECISION
// ============================================

console.log(
  "=========================================="
);

console.log(
  "              DECISION"
);

console.log(
  "=========================================="
);

console.log("");

if (
  decision.result ===
  "ALLOW"
) {

  console.log(
    "🟢 ALLOW"
  );

} else if (
  decision.result ===
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

console.log(
  "Reasons:"
);

if (
  Array.isArray(
    decision.reasons
  )
) {

  for (
    const reason
    of decision.reasons
  ) {

    console.log(
      "→",
      reason
    );

  }

}

console.log("");


// ============================================
// FINAL
// ============================================

console.log(
  "=========================================="
);

console.log(
  "           FINAL SUMMARY"
);

console.log(
  "=========================================="
);

console.log("");

console.log(
  `Agent ${AGENT_ID}`
);

console.log(
  `Evidence Coverage: ${assessment.evidenceCoverage}/100`
);

console.log(
  `Evidence Independence: ${assessment.evidenceIndependence}`
);

console.log(
  `Evidence Quality: ${assessment.evidenceQuality}`
);

console.log(
  `Graph Risk: ${assessment.graphRisk}`
);

console.log(
  `Temporal Assessment: ${assessment.temporalAssessment}`
);

console.log(
  `Decision: ${decision.result}`
);

console.log("");

console.log(
  "=========================================="
);

console.log(
  "      AGENT SCAN TAMAMLANDI"
);

console.log(
  "=========================================="
);

console.log("");