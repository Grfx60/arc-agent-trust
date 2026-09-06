const fs = require("fs");

const V27_FILE = "agent-anomaly-detection-v27.json";
const V28_FILE = "agent-evidence-independence-v28-1.json";
const V20_FILE = "agent-metadata-quality-v20.json";
const V21_FILE = "agent-shared-cluster-v21.json";
const V22_FILE = "agent-identity-correlation-v22.json";
const V23_FILE = "agent-relationship-graph-v23.json";
const V24_FILE = "agent-graph-component-v24.json";
const V25_FILE = "agent-component-forensics-v25.json";
const V26_FILE = "agent-behavioral-profile-v26.json";

const OUTPUT_FILE = "agent-risk-correlation-v29.json";

const AGENT_ID = 845265;

function loadJSON(file) {
  if (!fs.existsSync(file)) {
    console.log(`⚠️ ${file} bulunamadı.`);
    return null;
  }

  try {
    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch (error) {
    console.log(
      `❌ ${file} okunamadı: ${error.message}`
    );
    return null;
  }
}

function num(...values) {
  for (const value of values) {
    const n = Number(value);

    if (Number.isFinite(n)) {
      return n;
    }
  }

  return 0;
}

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function main() {

  console.log("");
  console.log("==========================================");
  console.log("        RISK CORRELATION ENGINE v29");
  console.log("==========================================");
  console.log("");

  const v27 = loadJSON(V27_FILE);
  const v28 = loadJSON(V28_FILE);
  const v20 = loadJSON(V20_FILE);
  const v21 = loadJSON(V21_FILE);
  const v22 = loadJSON(V22_FILE);
  const v23 = loadJSON(V23_FILE);
  const v24 = loadJSON(V24_FILE);
  const v25 = loadJSON(V25_FILE);
  const v26 = loadJSON(V26_FILE);

  console.log("DATA AVAILABILITY");
  console.log("------------------------------------------");

  console.log("V27:", v27 ? "OK" : "MISSING");
  console.log("V28.1:", v28 ? "OK" : "MISSING");
  console.log("V20:", v20 ? "OK" : "MISSING");
  console.log("V21:", v21 ? "OK" : "MISSING");
  console.log("V22:", v22 ? "OK" : "MISSING");
  console.log("V23:", v23 ? "OK" : "MISSING");
  console.log("V24:", v24 ? "OK" : "MISSING");
  console.log("V25:", v25 ? "OK" : "MISSING");
  console.log("V26:", v26 ? "OK" : "MISSING");

  console.log("");

  // ==========================================
  // V27 — ANOMALY
  // ==========================================

  const anomaly =
    v27?.anomaly || {};

  const anomalyScore =
    num(anomaly.score);

  const anomalyClassification =
    anomaly.classification ||
    "UNKNOWN";

  const anomalySignals =
    Array.isArray(anomaly.signals)
      ? anomaly.signals
      : [];


  // ==========================================
  // V28.1 — INDEPENDENCE
  // ==========================================

  const independence =
    v28?.independence || {};

  const independenceScore =
    num(independence.score);

  const independenceClassification =
    independence.classification ||
    "UNKNOWN";

  const components =
    v28?.components || {};

  const validatorIndependence =
    num(
      components.validatorIndependence
    );

  const metadataIndependence =
    num(
      components.metadataIndependence
    );

  const reviewerSeparation =
    num(
      components.reviewerSeparation
    );

  const reputationIndependence =
    num(
      components.reputationIndependence
    );

  const providerValidatorOverlap =
    num(
      v28?.verifiedEvidence?.overlappingActors
    );


  // ==========================================
  // IDENTITY / METADATA STRUCTURE
  // ==========================================

  let uniqueOwners = 0;
  let uniqueURIs = 0;
  let sharedOwners = 0;
  let sharedURIs = 0;

  if (v20) {

    uniqueOwners =
      num(
        v20.uniqueOwners,
        v20.summary?.uniqueOwners
      );

    uniqueURIs =
      num(
        v20.uniqueURIs,
        v20.summary?.uniqueURIs
      );

  }


  if (v21) {

    sharedURIs =
      num(
        v21.sharedURIClusters,
        v21.totalSharedURIClusters
      );

  }


  // ==========================================
  // V22 — IDENTITY CORRELATION
  // ==========================================

  let identityRelationships = 0;
  let sharedOwnerRelationships = 0;
  let sharedURIRelationships = 0;

  if (v22) {

    identityRelationships =
      num(
        v22.identityRelationships
      );

    sharedOwnerRelationships =
      num(
        v22.sharedOwnerRelationships
      );

    sharedURIRelationships =
      num(
        v22.sharedURIRelationships
      );

  }


  // ==========================================
  // V23 — GRAPH
  // ==========================================

  let graphNodes = 0;
  let graphEdges = 0;
  let directNeighbors = 0;
  let twoHopAgents = 0;

  if (v23) {

    graphNodes =
      num(
        v23.graphNodes,
        v23.nodes,
        v23.nodeCount
      );

    graphEdges =
      num(
        v23.graphEdges,
        v23.edges,
        v23.edgeCount
      );

    const known =
      v23.knownAgent || {};

    directNeighbors =
      num(
        known.directNeighbors
      );

    twoHopAgents =
      num(
        known.twoHopAgents
      );

  }


  // ==========================================
  // V24 — COMPONENT
  // ==========================================

  let componentAgents = 0;
  let componentOwners = 0;
  let componentURIs = 0;
  let componentDensity = 0;
  let bridgeStatus = "UNKNOWN";

  if (v24) {

    const known =
      v24.knownAgent || {};

    componentAgents =
      num(
        known.agents,
        known.componentAgents
      );

    componentOwners =
      num(
        known.owners,
        known.componentOwners
      );

    componentURIs =
      num(
        known.uris,
        known.componentURIs
      );

    componentDensity =
      num(
        known.density
      );

    bridgeStatus =
      known.bridgeStatus ||
      "UNKNOWN";

  }


  // ==========================================
  // V25 — FORENSICS
  // ==========================================

  let crossOwnerURIs = 0;
  let forensicClassification =
    "UNKNOWN";

  if (v25) {

    crossOwnerURIs =
      num(
        v25.crossOwnerSharedURIs,
        v25.crossOwnerURIs
      );

    forensicClassification =
      v25.classification ||
      v25.knownAgent?.classification ||
      "UNKNOWN";

  }


  // ==========================================
  // V26 — BEHAVIOR
  // ==========================================

  const behavior =
    v26?.knownAgent ||
    {};

  const behavioralProfile =
    behavior.behavior ||
    "UNKNOWN";

  const ownerDeviation =
    num(
      behavior.ownerDeviation
    );

  const uriDeviation =
    num(
      behavior.uriDeviation
    );


  // ==========================================
  // CORRELATION SIGNALS
  // ==========================================

  const correlations = [];


  // ------------------------------------------
  // C1 — HIGH ANOMALY + LOW INDEPENDENCE
  // ------------------------------------------

  if (
    anomalyScore >= 65 &&
    independenceScore < 50
  ) {

    correlations.push({

      code:
        "HIGH_ANOMALY_LOW_INDEPENDENCE",

      severity:
        "HIGH",

      weight:
        25,

      explanation:
        "Structural anomaly and low evidence independence occur together."

    });

  }


  // ------------------------------------------
  // C2 — SHARED URI + CROSS OWNER
  // ------------------------------------------

  if (
    metadataIndependence <= 35 &&
    crossOwnerURIs >= 1
  ) {

    correlations.push({

      code:
        "CROSS_OWNER_METADATA_CORRELATION",

      severity:
        "HIGH",

      weight:
        20,

      explanation:
        "Metadata reuse spans multiple owners."

    });

  }


  // ------------------------------------------
  // C3 — PROVIDER VALIDATOR OVERLAP
  // ------------------------------------------

  if (
    providerValidatorOverlap > 0
  ) {

    correlations.push({

      code:
        "REVIEWER_ROLE_OVERLAP",

      severity:
        "HIGH",

      weight:
        20,

      explanation:
        "At least one actor appears in both reputation and validation roles."

    });

  }


  // ------------------------------------------
  // C4 — LOW VALIDATOR DIVERSITY
  // ------------------------------------------

  if (
    validatorIndependence <= 30
  ) {

    correlations.push({

      code:
        "LOW_VALIDATOR_DIVERSITY",

      severity:
        "HIGH",

      weight:
        15,

      explanation:
        "Validation evidence relies on a single validator."

    });

  }


  // ------------------------------------------
  // C5 — LARGE URI CLUSTER
  // ------------------------------------------

  if (
    uriDeviation >= 2 &&
    metadataIndependence <= 35
  ) {

    correlations.push({

      code:
        "LARGE_URI_CLUSTER_CORRELATION",

      severity:
        "MEDIUM",

      weight:
        10,

      explanation:
        "URI reuse is substantially above local baseline."

    });

  }


  // ------------------------------------------
  // C6 — HIGH GRAPH CONNECTIVITY
  // ------------------------------------------

  if (
    directNeighbors >= 50 &&
    componentDensity >= 0.8
  ) {

    correlations.push({

      code:
        "HIGH_GRAPH_CONNECTIVITY",

      severity:
        "MEDIUM",

      weight:
        10,

      explanation:
        "Known agent is embedded in a highly connected component."

    });

  }


  // ------------------------------------------
  // C7 — BRIDGE
  // ------------------------------------------

  if (
    bridgeStatus === "HIGH"
  ) {

    correlations.push({

      code:
        "HIGH_BRIDGE_POSITION",

      severity:
        "MEDIUM",

      weight:
        10,

      explanation:
        "Agent occupies a structurally important graph position."

    });

  }


  // ==========================================
  // CORRELATED RISK
  // ==========================================

  let rawRisk = 0;

  for (
    const correlation
    of correlations
  ) {

    rawRisk +=
      correlation.weight;

  }


  rawRisk =
    clamp(
      rawRisk,
      0,
      100
    );


  // ==========================================
  // RISK CLASSIFICATION
  // ==========================================

  let riskClassification;

  if (
    rawRisk >= 65
  ) {

    riskClassification =
      "HIGH";

  } else if (
    rawRisk >= 35
  ) {

    riskClassification =
      "MEDIUM";

  } else {

    riskClassification =
      "LOW";

  }


  // ==========================================
  // CONFIDENCE
  // ==========================================

  let evidenceConfidence =
    "LOW";

  const availableInputs =
    [
      v27,
      v28,
      v20,
      v21,
      v22,
      v23,
      v24,
      v25,
      v26
    ]
    .filter(Boolean)
    .length;

  if (
    availableInputs >= 8
  ) {

    evidenceConfidence =
      "HIGH";

  } else if (
    availableInputs >= 5
  ) {

    evidenceConfidence =
      "MEDIUM";

  }


  // ==========================================
  // INTERPRETATION
  // ==========================================

  const interpretation = {

    correlatedRiskDetected:
      rawRisk >= 35,

    highCorrelatedRisk:
      rawRisk >= 65,

    evidenceConfidence,

    independentEvidenceWeak:
      independenceScore < 50,

    structuralAnomalyPresent:
      anomalyScore >= 40,

    manualReviewRecommended:
      rawRisk >= 35,

    notTrustScore:
      true,

    notProbabilityOfTruth:
      true,

    notMaliciousProof:
      true

  };


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "2.9",

    engine:
      "RISK_CORRELATION",

    generatedAt:
      new Date().toISOString(),

    agent:
      AGENT_ID,

    inputs: {

      anomalyScore,

      anomalyClassification,

      independenceScore,

      independenceClassification,

      validatorIndependence,

      metadataIndependence,

      reviewerSeparation,

      reputationIndependence,

      providerValidatorOverlap,

      uriDeviation,

      ownerDeviation,

      behavioralProfile,

      forensicClassification,

      componentAgents,

      componentOwners,

      componentURIs,

      componentDensity,

      bridgeStatus,

      directNeighbors,

      twoHopAgents

    },

    correlations,

    risk: {

      score:
        rawRisk,

      classification:
        riskClassification

    },

    interpretation

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
  console.log("          V29 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agent:",
    AGENT_ID
  );

  console.log(
    "Anomaly:",
    anomalyScore,
    "/100",
    anomalyClassification
  );

  console.log(
    "Independence:",
    independenceScore,
    "/100",
    independenceClassification
  );

  console.log(
    "URI deviation:",
    uriDeviation
  );

  console.log(
    "Owner deviation:",
    ownerDeviation
  );

  console.log(
    "Provider/validator overlap:",
    providerValidatorOverlap
  );

  console.log("");

  console.log(
    "Correlated Risk:",
    rawRisk,
    "/100"
  );

  console.log(
    "Risk Classification:",
    riskClassification
  );

  console.log(
    "Evidence Confidence:",
    evidenceConfidence
  );

  console.log("");

  console.log("==========================================");
  console.log("       CORRELATED RISK SIGNALS");
  console.log("==========================================");
  console.log("");

  if (
    correlations.length === 0
  ) {

    console.log(
      "✓ No correlated risk signals detected."
    );

  } else {

    for (
      const correlation
      of correlations
    ) {

      console.log(
        `⚠ [${correlation.weight}] ${correlation.code}`
      );

      console.log(
        `   Severity: ${correlation.severity}`
      );

      console.log(
        `   ${correlation.explanation}`
      );

      console.log("");

    }

  }


  console.log("==========================================");
  console.log("          INTERPRETATION");
  console.log("==========================================");
  console.log("");

  console.log(
    "Correlated risk detected:",
    interpretation.correlatedRiskDetected
  );

  console.log(
    "High correlated risk:",
    interpretation.highCorrelatedRisk
  );

  console.log(
    "Manual review recommended:",
    interpretation.manualReviewRecommended
  );

  console.log("");

  console.log(
    "📁 Output:",
    OUTPUT_FILE
  );

  console.log("");

  console.log("==========================================");
  console.log(
    "       RISK CORRELATION TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");

}


try {

  main();

} catch (error) {

  console.error("");
  console.error("❌ V29 kritik hata:");
  console.error(
    error.message ||
    error
  );
  console.error("");

  process.exit(1);
}