const fs = require("fs");

const V10_FILE = "agent-845265-intelligence-v10.json";
const V19_FILE = "agent-metadata-intelligence-v19.json";
const V20_FILE = "agent-metadata-quality-v20.json";
const V21_FILE = "agent-shared-cluster-v21.json";
const V22_FILE = "agent-identity-correlation-v22.json";
const V23_FILE = "agent-relationship-graph-v23.json";
const V24_FILE = "agent-graph-component-v24.json";
const V25_FILE = "agent-component-forensics-v25.json";
const V26_FILE = "agent-behavioral-profile-v26.json";
const V27_FILE = "agent-anomaly-detection-v27.json";
const V28_FILE = "agent-evidence-independence-v28-1.json";
const V29_FILE = "agent-risk-correlation-v29.json";
const V30_FILE = "agent-evidence-decision-v30.json";

const OUTPUT_FILE = "agent-evidence-scoring-v31.json";

const AGENT_ID = 845265;

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

function num(...values) {
  for (const value of values) {
    const n = Number(value);

    if (Number.isFinite(n)) {
      return n;
    }
  }

  return 0;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function average(values) {
  const valid = values.filter(
    value => Number.isFinite(value)
  );

  if (!valid.length) {
    return 0;
  }

  return valid.reduce(
    (sum, value) => sum + value,
    0
  ) / valid.length;
}

function classification(score) {

  if (score >= 75) {
    return "HIGH";
  }

  if (score >= 50) {
    return "MEDIUM";
  }

  return "LOW";
}

function main() {

  console.log("");
  console.log("==========================================");
  console.log("       AGENT EVIDENCE SCORING v31");
  console.log("==========================================");
  console.log("");

  const v10 = loadJSON(V10_FILE);
  const v19 = loadJSON(V19_FILE);
  const v20 = loadJSON(V20_FILE);
  const v21 = loadJSON(V21_FILE);
  const v22 = loadJSON(V22_FILE);
  const v23 = loadJSON(V23_FILE);
  const v24 = loadJSON(V24_FILE);
  const v25 = loadJSON(V25_FILE);
  const v26 = loadJSON(V26_FILE);
  const v27 = loadJSON(V27_FILE);
  const v28 = loadJSON(V28_FILE);
  const v29 = loadJSON(V29_FILE);
  const v30 = loadJSON(V30_FILE);

  console.log("DATA AVAILABILITY");
  console.log("------------------------------------------");

  const sources = {
    V10: v10,
    V19: v19,
    V20: v20,
    V21: v21,
    V22: v22,
    V23: v23,
    V24: v24,
    V25: v25,
    V26: v26,
    V27: v27,
    V28_1: v28,
    V29: v29,
    V30: v30
  };

  for (const [name, data] of Object.entries(sources)) {
    console.log(
      `${name}:`,
      data ? "OK" : "MISSING"
    );
  }

  console.log("");


  // ==========================================
  // V30 BASE DECISION
  // ==========================================

  const baseDecision =
    v30?.decision?.result ||
    "UNKNOWN";

  const decisionConfidence =
    v30?.decision?.confidence ||
    "UNKNOWN";


  // ==========================================
  // IDENTITY
  // ==========================================

  let identityScore = 0;

  if (v30?.assessment?.identity === "PRESENT") {
    identityScore = 100;
  } else if (v10) {
    identityScore = 70;
  }


  // ==========================================
  // REPUTATION QUALITY
  // ==========================================

  const reputationProviders =
    num(
      v10?.reputationProviders,
      v10?.reputation?.providers
    );

  const reputationRecords =
    num(
      v10?.reputationRecords,
      v10?.reputation?.records
    );

  let reputationQuality = 0;

  if (reputationProviders >= 3) {
    reputationQuality = 100;
  } else if (reputationProviders === 2) {
    reputationQuality = 80;
  } else if (reputationProviders === 1) {
    reputationQuality = 50;
  }

  if (reputationRecords >= 3) {
    reputationQuality += 10;
  }

  reputationQuality =
    clamp(reputationQuality);


  // ==========================================
  // VALIDATION QUALITY
  // ==========================================

  const validators =
    num(
      v10?.validators,
      v10?.validation?.validators
    );

  const validationRecords =
    num(
      v10?.validationRecords,
      v10?.validation?.records
    );

  let validationQuality = 0;

  if (validators >= 3) {
    validationQuality = 100;
  } else if (validators === 2) {
    validationQuality = 80;
  } else if (validators === 1) {
    validationQuality = 50;
  }

  if (validationRecords >= 2) {
    validationQuality += 10;
  }

  validationQuality =
    clamp(validationQuality);


  // ==========================================
  // METADATA QUALITY
  // ==========================================

  let metadataQuality = 0;

  const accessible =
    num(
      v19?.accessible,
      v19?.metadata?.accessible
    );

  const validJSON =
    num(
      v19?.validJSON,
      v19?.metadata?.validJSON
    );

  if (accessible > 0) {
    metadataQuality += 50;
  }

  if (validJSON > 0) {
    metadataQuality += 50;
  }

  // V20 global metadata quality
  const validMetadata =
    num(
      v20?.accessibleValidJSON,
      v20?.summary?.accessibleValidJSON
    );

  if (validMetadata > 0) {
    metadataQuality =
      Math.max(
        metadataQuality,
        60
      );
  }

  metadataQuality =
    clamp(metadataQuality);


  // ==========================================
  // GRAPH QUALITY
  // ==========================================

  let graphQuality = 0;

  const graphNodes =
    num(
      v23?.graphNodes,
      v23?.nodes,
      v23?.nodeCount
    );

  const graphEdges =
    num(
      v23?.graphEdges,
      v23?.edges,
      v23?.edgeCount
    );

  if (
    graphNodes > 0 &&
    graphEdges > 0
  ) {
    graphQuality = 80;
  }

  if (
    v24 &&
    v25
  ) {
    graphQuality += 10;
  }

  graphQuality =
    clamp(graphQuality);


  // ==========================================
  // DYNAMICS QUALITY
  // ==========================================

  let dynamicsQuality = 0;

  const dynamics =
    v10?.temporalAssessment ||
    v10?.dynamics ||
    null;

  if (dynamics) {
    dynamicsQuality = 70;
  }

  // Değişimlerin varlığı tek başına kalite
  // veya kötülük anlamına gelmez.

  dynamicsQuality =
    clamp(dynamicsQuality);


  // ==========================================
  // EVIDENCE QUALITY
  // ==========================================

  const evidenceQuality =
    Math.round(
      average([
        identityScore,
        reputationQuality,
        validationQuality,
        metadataQuality,
        graphQuality,
        dynamicsQuality
      ])
    );


  // ==========================================
  // EVIDENCE INDEPENDENCE
  // ==========================================

  const evidenceIndependence =
    clamp(
      num(
        v28?.independence?.score
      )
    );

  const independenceClass =
    v28?.independence?.classification ||
    classification(
      evidenceIndependence
    );


  // ==========================================
  // STRUCTURAL RISK
  // ==========================================

  const anomalyScore =
    num(
      v27?.anomaly?.score
    );

  const correlatedRisk =
    num(
      v29?.risk?.score
    );

  const structuralRisk =
    Math.round(
      (
        anomalyScore * 0.40
      ) +
      (
        correlatedRisk * 0.60
      )
    );


  // ==========================================
  // DYNAMICS RISK
  // ==========================================

  let dynamicsRisk = 0;

  const temporalAssessment =
    v10?.temporalAssessment ||
    v10?.dynamics?.temporalAssessment ||
    "";

  if (
    String(
      temporalAssessment
    ).toUpperCase() === "CHANGED"
  ) {

    dynamicsRisk = 40;

  } else {

    dynamicsRisk = 10;

  }


  // ==========================================
  // COMPOSITE EVIDENCE STRENGTH
  // ==========================================

  const evidenceStrength =
    Math.round(
      (
        evidenceQuality * 0.50
      ) +
      (
        evidenceIndependence * 0.35
      ) +
      (
        (100 - structuralRisk) * 0.15
      )
    );


  // ==========================================
  // RISK-ADJUSTED EVIDENCE
  // ==========================================

  const riskAdjustedEvidence =
    Math.round(
      clamp(
        evidenceStrength -
        (
          structuralRisk * 0.35
        ) -
        (
          dynamicsRisk * 0.10
        )
      )
    );


  // ==========================================
  // FINAL DECISION
  // ==========================================

  let finalDecision =
    baseDecision;

  //
  // V30 kararını koruyoruz.
  // Scoring motoru tek başına BLOCK üretmez.
  //

  if (
    baseDecision === "BLOCK"
  ) {

    finalDecision =
      "BLOCK";

  } else if (
    structuralRisk >= 65 ||
    evidenceIndependence < 50
  ) {

    finalDecision =
      "REVIEW";

  } else if (
    evidenceStrength >= 75 &&
    structuralRisk < 35 &&
    evidenceIndependence >= 75
  ) {

    finalDecision =
      "ALLOW";

  } else {

    finalDecision =
      "REVIEW";

  }


  // ==========================================
  // SCORE CLASSIFICATIONS
  // ==========================================

  const evidenceQualityClass =
    classification(
      evidenceQuality
    );

  const structuralRiskClass =
    structuralRisk >= 65
      ? "HIGH"
      : structuralRisk >= 35
        ? "MEDIUM"
        : "LOW";


  const evidenceStrengthClass =
    classification(
      evidenceStrength
    );


  // ==========================================
  // SCORE REASONS
  // ==========================================

  const reasons = [];

  if (
    identityScore >= 75
  ) {
    reasons.push(
      "On-chain identity evidence is present."
    );
  }

  if (
    reputationQuality >= 70
  ) {
    reasons.push(
      "Reputation evidence has multiple providers."
    );
  }

  if (
    validationQuality < 60
  ) {
    reasons.push(
      "Validation diversity is limited."
    );
  }

  if (
    metadataQuality < 50
  ) {
    reasons.push(
      "Metadata quality is limited."
    );
  }

  if (
    evidenceIndependence < 50
  ) {
    reasons.push(
      "Evidence independence is LOW."
    );
  }

  if (
    structuralRisk >= 65
  ) {
    reasons.push(
      "Structural risk is HIGH."
    );
  }

  if (
    dynamicsRisk >= 40
  ) {
    reasons.push(
      "Historical dynamics contain observed changes."
    );
  }

  if (
    finalDecision === "REVIEW"
  ) {
    reasons.push(
      "Current evidence is insufficient for automatic ALLOW."
    );
  }


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "3.1",

    engine:
      "AGENT_EVIDENCE_SCORING",

    generatedAt:
      new Date().toISOString(),

    agent:
      AGENT_ID,

    scores: {

      evidenceQuality,
      evidenceIndependence,
      structuralRisk,
      dynamicsRisk,
      evidenceStrength,
      riskAdjustedEvidence

    },

    classifications: {

      evidenceQuality:
        evidenceQualityClass,

      evidenceIndependence:
        independenceClass,

      structuralRisk:
        structuralRiskClass,

      evidenceStrength:
        evidenceStrengthClass

    },

    components: {

      identity:
        identityScore,

      reputation:
        reputationQuality,

      validation:
        validationQuality,

      metadata:
        metadataQuality,

      graph:
        graphQuality,

      dynamics:
        dynamicsQuality

    },

    decision: {

      v30Decision:
        baseDecision,

      finalDecision,

      confidence:
        decisionConfidence,

      reasons

    },

    safeguards: {

      trustScore:
        false,

      probabilityOfTruth:
        false,

      maliciousnessProbability:
        false,

      automaticBlockFromRisk:
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
  console.log("          V31 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agent:",
    AGENT_ID
  );

  console.log("");

  console.log(
    "Evidence Quality:",
    evidenceQuality,
    "/100",
    evidenceQualityClass
  );

  console.log(
    "Evidence Independence:",
    evidenceIndependence,
    "/100",
    independenceClass
  );

  console.log(
    "Structural Risk:",
    structuralRisk,
    "/100",
    structuralRiskClass
  );

  console.log(
    "Dynamics Risk:",
    dynamicsRisk,
    "/100"
  );

  console.log("");

  console.log(
    "Evidence Strength:",
    evidenceStrength,
    "/100",
    evidenceStrengthClass
  );

  console.log(
    "Risk-Adjusted Evidence:",
    riskAdjustedEvidence,
    "/100"
  );

  console.log("");

  console.log("==========================================");
  console.log("        COMPONENT SCORES");
  console.log("==========================================");
  console.log("");

  console.log(
    "Identity:",
    identityScore
  );

  console.log(
    "Reputation:",
    reputationQuality
  );

  console.log(
    "Validation:",
    validationQuality
  );

  console.log(
    "Metadata:",
    metadataQuality
  );

  console.log(
    "Graph:",
    graphQuality
  );

  console.log(
    "Dynamics:",
    dynamicsQuality
  );

  console.log("");

  console.log("==========================================");
  console.log("             FINAL DECISION");
  console.log("==========================================");
  console.log("");

  if (
    finalDecision === "ALLOW"
  ) {

    console.log("🟢 ALLOW");

  } else if (
    finalDecision === "BLOCK"
  ) {

    console.log("🔴 BLOCK");

  } else {

    console.log("🟡 REVIEW");

  }

  console.log("");

  console.log(
    "V30 decision:",
    baseDecision
  );

  console.log(
    "Final decision:",
    finalDecision
  );

  console.log(
    "Confidence:",
    decisionConfidence
  );

  console.log("");

  console.log("DECISION REASONS");
  console.log("------------------------------------------");

  for (
    const reason
    of reasons
  ) {

    console.log(
      `→ ${reason}`
    );

  }

  console.log("");

  console.log("==========================================");
  console.log("           SAFETY CHECKS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Trust Score:",
    false
  );

  console.log(
    "Probability of truth:",
    false
  );

  console.log(
    "Automatic BLOCK from risk:",
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
    "        AGENT EVIDENCE SCORING TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");
}

try {
  main();
} catch (error) {

  console.error("");
  console.error("❌ V31 kritik hata:");
  console.error(
    error.message ||
    error
  );
  console.error("");

  process.exit(1);
}