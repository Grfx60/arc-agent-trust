const fs = require("fs");

const V28_FILE = "agent-evidence-independence-v28-1.json";
const V29_FILE = "agent-risk-correlation-v29.json";
const V30_FILE = "agent-evidence-decision-v30.json";
const V31_FILE = "agent-evidence-scoring-v31.json";
const V32_FILE = "agent-evidence-calibration-v32.json";

const OUTPUT_FILE =
  "agent-trust-assessment-v33.json";

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

function level(score) {
  if (score >= 75) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

function main() {

  console.log("");
  console.log("==========================================");
  console.log("        TRUST ASSESSMENT ENGINE v33");
  console.log("==========================================");
  console.log("");

  const v28 = loadJSON(V28_FILE);
  const v29 = loadJSON(V29_FILE);
  const v30 = loadJSON(V30_FILE);
  const v31 = loadJSON(V31_FILE);
  const v32 = loadJSON(V32_FILE);

  console.log("DATA AVAILABILITY");
  console.log("------------------------------------------");

  console.log(
    "V28.1:",
    v28 ? "OK" : "MISSING"
  );

  console.log(
    "V29:",
    v29 ? "OK" : "MISSING"
  );

  console.log(
    "V30:",
    v30 ? "OK" : "MISSING"
  );

  console.log(
    "V31:",
    v31 ? "OK" : "MISSING"
  );

  console.log(
    "V32:",
    v32 ? "OK" : "MISSING"
  );

  console.log("");


  // ==========================================
  // V32 CALIBRATED EVIDENCE
  // ==========================================

  const evidenceAvailability =
    num(
      v32?.availability?.score
    );

  const evidenceQuality =
    num(
      v32?.quality?.score
    );

  const evidenceIndependence =
    num(
      v32?.independence?.score
    );

  const evidenceConfidence =
    num(
      v32?.confidence?.score
    );


  // ==========================================
  // V32 STRUCTURAL RISK
  // ==========================================

  const structuralRisk =
    num(
      v32?.risk?.structural
    );

  const anomalyRisk =
    num(
      v32?.risk?.anomaly
    );

  const correlatedRisk =
    num(
      v32?.risk?.correlated
    );


  // ==========================================
  // COMPONENTS
  // ==========================================

  const identityScore =
    num(
      v32?.components?.identity?.score
    );

  const reputationScore =
    num(
      v32?.components?.reputation?.score
    );

  const validationScore =
    num(
      v32?.components?.validation?.score
    );

  const metadataQuality =
    num(
      v32?.components?.metadata?.quality
    );

  const metadataIndependence =
    num(
      v32?.components?.metadata?.independence
    );

  const graphQuality =
    num(
      v32?.components?.graph?.quality
    );

  const graphIndependence =
    num(
      v32?.components?.graph?.independence
    );

  const dynamicsEvidence =
    num(
      v32?.components?.dynamics?.evidence
    );


  // ==========================================
  // 1. IDENTITY TRUST DIMENSION
  // ==========================================

  /*
   * Identity is a foundational dimension.
   * Presence does not prove behavior.
   */

  const identityDimension =
    clamp(
      identityScore
    );


  // ==========================================
  // 2. REPUTATION DIMENSION
  // ==========================================

  const reputationDimension =
    clamp(
      reputationScore
    );


  // ==========================================
  // 3. VALIDATION DIMENSION
  // ==========================================

  const validationDimension =
    clamp(
      validationScore
    );


  // ==========================================
  // 4. METADATA DIMENSION
  // ==========================================

  /*
   * Metadata availability is treated separately
   * from metadata independence.
   */

  const metadataDimension =
    clamp(
      (
        metadataQuality * 0.60
      ) +
      (
        metadataIndependence * 0.40
      )
    );


  // ==========================================
  // 5. GRAPH DIMENSION
  // ==========================================

  const graphDimension =
    clamp(
      (
        graphQuality * 0.60
      ) +
      (
        graphIndependence * 0.40
      )
    );


  // ==========================================
  // 6. DYNAMICS DIMENSION
  // ==========================================

  /*
   * Dynamics is not automatically positive or
   * negative. It measures the availability of
   * behavioral/temporal evidence.
   */

  const dynamicsDimension =
    clamp(
      dynamicsEvidence
    );


  // ==========================================
  // EVIDENCE FOUNDATION
  // ==========================================

  const evidenceFoundation =
    Math.round(
      (
        evidenceAvailability * 0.20
      ) +
      (
        evidenceQuality * 0.35
      ) +
      (
        evidenceIndependence * 0.30
      ) +
      (
        evidenceConfidence * 0.15
      )
    );


  // ==========================================
  // IDENTITY / REPUTATION / VALIDATION
  // ==========================================

  const trustEvidence =
    Math.round(
      (
        identityDimension * 0.25
      ) +
      (
        reputationDimension * 0.25
      ) +
      (
        validationDimension * 0.20
      ) +
      (
        metadataDimension * 0.10
      ) +
      (
        graphDimension * 0.10
      ) +
      (
        dynamicsDimension * 0.10
      )
    );


  // ==========================================
  // INDEPENDENCE PENALTY
  // ==========================================

  let independencePenalty = 0;

  if (
    evidenceIndependence < 50
  ) {

    independencePenalty =
      Math.round(
        (
          50 -
          evidenceIndependence
        ) * 0.50
      );

  }


  // ==========================================
  // STRUCTURAL RISK PENALTY
  // ==========================================

  let structuralPenalty = 0;

  if (
    structuralRisk > 35
  ) {

    structuralPenalty =
      Math.round(
        (
          structuralRisk -
          35
        ) * 0.30
      );

  }


  // ==========================================
  // CALIBRATED TRUST ASSESSMENT
  // ==========================================

  const trustAssessment =
    clamp(
      trustEvidence -
      independencePenalty -
      structuralPenalty
    );


  // ==========================================
  // TRUST CONFIDENCE
  // ==========================================

  const trustConfidence =
    Math.round(
      (
        evidenceConfidence * 0.40
      ) +
      (
        evidenceAvailability * 0.25
      ) +
      (
        evidenceIndependence * 0.35
      )
    );


  // ==========================================
  // ASSESSMENT CLASS
  // ==========================================

  const assessmentClass =
    level(
      trustAssessment
    );


  // ==========================================
  // CONFIDENCE CLASS
  // ==========================================

  const confidenceClass =
    level(
      trustConfidence
    );


  // ==========================================
  // DECISION
  // ==========================================

  /*
   * Decision remains separate from assessment.
   *
   * V30 is authoritative for current decision.
   */

  const finalDecision =
    v30?.decision?.result ||
    "REVIEW";


  // ==========================================
  // EXPLANATION
  // ==========================================

  const reasons = [];

  if (
    identityDimension >= 75
  ) {

    reasons.push(
      "Identity evidence provides a strong foundation."
    );

  }

  if (
    reputationDimension >= 75
  ) {

    reasons.push(
      "Reputation evidence is relatively strong."
    );

  }

  if (
    validationDimension < 70
  ) {

    reasons.push(
      "Validation evidence remains limited."
    );

  }

  if (
    metadataDimension < 50
  ) {

    reasons.push(
      "Metadata evidence is currently insufficient."
    );

  }

  if (
    evidenceIndependence < 50
  ) {

    reasons.push(
      "Evidence independence materially limits trust assessment."
    );

  }

  if (
    structuralRisk >= 65
  ) {

    reasons.push(
      "Structural risk materially reduces the assessment."
    );

  }

  if (
    correlatedRisk >= 65
  ) {

    reasons.push(
      "Correlated risk remains HIGH."
    );

  }

  if (
    finalDecision === "REVIEW"
  ) {

    reasons.push(
      "Current evidence does not justify automatic ALLOW."
    );

  }


  // ==========================================
  // POSITIVE / NEGATIVE DIMENSIONS
  // ==========================================

  const strengths = [];
  const weaknesses = [];

  if (
    identityDimension >= 75
  ) {
    strengths.push(
      "STRONG_IDENTITY"
    );
  }

  if (
    reputationDimension >= 75
  ) {
    strengths.push(
      "MULTI_PROVIDER_REPUTATION"
    );
  }

  if (
    graphDimension >= 50
  ) {
    strengths.push(
      "GRAPH_EVIDENCE_AVAILABLE"
    );
  }

  if (
    validationDimension < 70
  ) {
    weaknesses.push(
      "LIMITED_VALIDATION_INDEPENDENCE"
    );
  }

  if (
    metadataDimension < 50
  ) {
    weaknesses.push(
      "INSUFFICIENT_METADATA_EVIDENCE"
    );
  }

  if (
    evidenceIndependence < 50
  ) {
    weaknesses.push(
      "LOW_EVIDENCE_INDEPENDENCE"
    );
  }

  if (
    structuralRisk >= 65
  ) {
    weaknesses.push(
      "HIGH_STRUCTURAL_RISK"
    );
  }


  // ==========================================
  // SAFETY STATE
  // ==========================================

  const safety = {

    directMaliciousEvidence:
      false,

    confirmedFraud:
      false,

    confirmedIdentityForgery:
      false,

    confirmedValidationManipulation:
      false,

    automaticBlock:
      false,

    assessmentIsNotProbability:
      true,

    assessmentIsNotProofOfMaliciousness:
      true,

    assessmentIsNotFinancialAdvice:
      true

  };


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "3.3",

    engine:
      "TRUST_ASSESSMENT",

    generatedAt:
      new Date().toISOString(),

    agent:
      AGENT_ID,

    dimensions: {

      identity:
        identityDimension,

      reputation:
        reputationDimension,

      validation:
        validationDimension,

      metadata:
        metadataDimension,

      graph:
        graphDimension,

      dynamics:
        dynamicsDimension

    },

    evidence: {

      availability:
        evidenceAvailability,

      quality:
        evidenceQuality,

      independence:
        evidenceIndependence,

      confidence:
        evidenceConfidence,

      foundation:
        evidenceFoundation

    },

    risk: {

      structural:
        structuralRisk,

      anomaly:
        anomalyRisk,

      correlated:
        correlatedRisk

    },

    penalties: {

      independence:
        independencePenalty,

      structural:
        structuralPenalty

    },

    assessment: {

      score:
        trustAssessment,

      classification:
        assessmentClass,

      confidence:
        trustConfidence,

      confidenceClassification:
        confidenceClass

    },

    decision: {

      current:
        finalDecision,

      source:
        "V30"

    },

    strengths,

    weaknesses,

    reasons,

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


  // ==========================================
  // REPORT
  // ==========================================

  console.log("");
  console.log("==========================================");
  console.log("          V33 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agent:",
    AGENT_ID
  );

  console.log("");

  console.log(
    "Trust Assessment:",
    trustAssessment,
    "/100",
    assessmentClass
  );

  console.log(
    "Trust Confidence:",
    trustConfidence,
    "/100",
    confidenceClass
  );

  console.log("");

  console.log(
    "Evidence Foundation:",
    evidenceFoundation,
    "/100"
  );

  console.log(
    "Evidence Quality:",
    evidenceQuality,
    "/100"
  );

  console.log(
    "Evidence Independence:",
    evidenceIndependence,
    "/100"
  );

  console.log(
    "Evidence Confidence:",
    evidenceConfidence,
    "/100"
  );

  console.log("");

  console.log("==========================================");
  console.log("          TRUST DIMENSIONS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Identity:",
    identityDimension
  );

  console.log(
    "Reputation:",
    reputationDimension
  );

  console.log(
    "Validation:",
    validationDimension
  );

  console.log(
    "Metadata:",
    metadataDimension
  );

  console.log(
    "Graph:",
    graphDimension
  );

  console.log(
    "Dynamics:",
    dynamicsDimension
  );

  console.log("");

  console.log("==========================================");
  console.log("             RISK");
  console.log("==========================================");
  console.log("");

  console.log(
    "Structural Risk:",
    structuralRisk,
    "/100"
  );

  console.log(
    "Anomaly:",
    anomalyRisk,
    "/100"
  );

  console.log(
    "Correlated Risk:",
    correlatedRisk,
    "/100"
  );

  console.log("");

  console.log("==========================================");
  console.log("             DECISION");
  console.log("==========================================");
  console.log("");

  if (
    finalDecision === "ALLOW"
  ) {

    console.log(
      "🟢 ALLOW"
    );

  } else if (
    finalDecision === "BLOCK"
  ) {

    console.log(
      "🔴 BLOCK"
    );

  } else {

    console.log(
      "🟡 REVIEW"
    );

  }

  console.log("");

  console.log(
    "Decision source: V30"
  );

  console.log("");

  console.log("==========================================");
  console.log("            STRENGTHS");
  console.log("==========================================");
  console.log("");

  for (
    const strength
    of strengths
  ) {

    console.log(
      `✓ ${strength}`
    );

  }

  console.log("");

  console.log("==========================================");
  console.log("           WEAKNESSES");
  console.log("==========================================");
  console.log("");

  for (
    const weakness
    of weaknesses
  ) {

    console.log(
      `⚠ ${weakness}`
    );

  }

  console.log("");

  console.log("==========================================");
  console.log("          SAFETY CHECKS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Direct malicious evidence:",
    false
  );

  console.log(
    "Confirmed fraud:",
    false
  );

  console.log(
    "Automatic BLOCK:",
    false
  );

  console.log(
    "Assessment = probability:",
    false
  );

  console.log(
    "Assessment = maliciousness proof:",
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
    "       TRUST ASSESSMENT TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");
}

try {
  main();
} catch (error) {

  console.error("");
  console.error("❌ V33 kritik hata:");
  console.error(
    error.message ||
    error
  );
  console.error("");

  process.exit(1);
}