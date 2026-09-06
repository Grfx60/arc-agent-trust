const fs = require("fs");

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
const V31_FILE = "agent-evidence-scoring-v31.json";

const OUTPUT_FILE =
  "agent-evidence-calibration-v32.json";

const AGENT_ID = 845265;

function loadJSON(file) {
  if (!fs.existsSync(file)) return null;

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

  if (!valid.length) return 0;

  return valid.reduce(
    (sum, value) => sum + value,
    0
  ) / valid.length;
}

function level(score) {
  if (score >= 75) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

function main() {

  console.log("");
  console.log("==========================================");
  console.log("       EVIDENCE CALIBRATION ENGINE v32");
  console.log("==========================================");
  console.log("");

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
  const v31 = loadJSON(V31_FILE);

  console.log("DATA AVAILABILITY");
  console.log("------------------------------------------");

  const sources = {
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
    V30: v30,
    V31: v31
  };

  for (const [name, data] of Object.entries(sources)) {
    console.log(
      `${name}:`,
      data ? "OK" : "MISSING"
    );
  }

  console.log("");


  // ==========================================
  // 1. IDENTITY
  // ==========================================

  const identityEvidence =
    v30?.assessment?.identity === "PRESENT";

  const identityScore =
    identityEvidence ? 100 : 0;


  // ==========================================
  // 2. REPUTATION
  // ==========================================

  const reputationProviders =
    num(
      v30?.assessment?.reputation === "PRESENT"
        ? 2
        : 0,
      0
    );

  const reputationIndependence =
    num(
      v28?.components?.reputationIndependence
    );

  let reputationAvailability =
    reputationProviders > 0
      ? 100
      : 0;

  let reputationQuality =
    Math.round(
      average([
        reputationAvailability,
        reputationIndependence
      ])
    );


  // ==========================================
  // 3. VALIDATION
  // ==========================================

  const validatorIndependence =
    num(
      v28?.components?.validatorIndependence
    );

  const providerValidatorOverlap =
    num(
      v28?.verifiedEvidence?.overlappingActors
    );

  let validationAvailability =
    v30?.assessment?.validation === "PRESENT"
      ? 100
      : 0;

  let validationQuality =
    validationAvailability;

  if (validatorIndependence < 50) {
    validationQuality -= 25;
  }

  if (providerValidatorOverlap > 0) {
    validationQuality -= 15;
  }

  validationQuality =
    clamp(validationQuality);


  // ==========================================
  // 4. METADATA — AVAILABILITY
  // ==========================================

  const metadataAccessible =
    num(
      v19?.accessible,
      v19?.metadata?.accessible
    );

  const metadataValidJSON =
    num(
      v19?.validJSON,
      v19?.metadata?.validJSON
    );

  const metadataAttempted =
    num(
      v19?.metadataFetchAttempted,
      v19?.attempted,
      v19?.summary?.metadataFetchAttempted
    );

  let metadataAvailability;

  if (metadataAccessible > 0) {
    metadataAvailability = 100;
  } else if (metadataAttempted > 0) {
    metadataAvailability = 25;
  } else {
    metadataAvailability = 0;
  }


  // ==========================================
  // 5. METADATA — VALIDITY
  // ==========================================

  let metadataValidity;

  if (metadataValidJSON > 0) {
    metadataValidity = 100;
  } else if (metadataAccessible > 0) {
    metadataValidity = 50;
  } else {
    metadataValidity = 0;
  }


  // ==========================================
  // 6. METADATA — INDEPENDENCE
  // ==========================================

  const metadataIndependence =
    num(
      v28?.components?.metadataIndependence
    );

  /*
   * Burada kritik ayrım:
   *
   * Metadata inaccessible ise bunu otomatik
   * olarak "bad metadata" kabul etmiyoruz.
   *
   * Bağımsızlık ayrı bir boyut.
   */

  const metadataEvidenceStatus =
    metadataAccessible > 0
      ? "AVAILABLE"
      : "INACCESSIBLE";

  const metadataQuality =
    Math.round(
      average([
        metadataAvailability,
        metadataValidity
      ])
    );

  const metadataIndependenceStatus =
    metadataIndependence < 35
      ? "LOW"
      : metadataIndependence < 70
        ? "MEDIUM"
        : "HIGH";


  // ==========================================
  // 7. GRAPH — EXISTENCE
  // ==========================================

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

  const graphExists =
    graphNodes > 0 &&
    graphEdges > 0;

  const graphAvailability =
    graphExists ? 100 : 0;


  // ==========================================
  // 8. GRAPH — AGENT SPECIFIC VALUE
  // ==========================================

  const directNeighbors =
    num(
      v23?.knownAgent?.directNeighbors
    );

  const componentAgents =
    num(
      v24?.knownAgent?.agents,
      v24?.knownAgent?.componentAgents
    );

  let graphSpecificity;

  if (directNeighbors === 0) {
    graphSpecificity = 100;
  } else if (directNeighbors < 10) {
    graphSpecificity = 80;
  } else if (directNeighbors < 50) {
    graphSpecificity = 60;
  } else {
    graphSpecificity = 30;
  }


  // ==========================================
  // 9. GRAPH — INDEPENDENCE
  // ==========================================

  const graphIndependence =
    num(
      v28?.components?.graphIndependence
    );

  const graphEvidenceQuality =
    Math.round(
      average([
        graphAvailability,
        graphSpecificity,
        graphIndependence
      ])
    );


  // ==========================================
  // 10. STRUCTURAL RISK
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
  // 11. DYNAMICS
  // ==========================================

  const temporalAssessment =
    String(
      v10Safe(v31)
    );

  function v10Safe() {
    return "";
  }

  const dynamicsEvidence =
    v26 ? 70 : 0;

  const dynamicsStatus =
    dynamicsEvidence > 0
      ? "AVAILABLE"
      : "LIMITED";


  // ==========================================
  // 12. EVIDENCE AVAILABILITY
  // ==========================================

  const evidenceAvailability =
    Math.round(
      average([
        identityScore,
        reputationAvailability,
        validationAvailability,
        metadataAvailability,
        graphAvailability,
        dynamicsEvidence
      ])
    );


  // ==========================================
  // 13. EVIDENCE QUALITY
  // ==========================================

  const calibratedEvidenceQuality =
    Math.round(
      average([
        identityScore,
        reputationQuality,
        validationQuality,
        metadataQuality,
        graphEvidenceQuality,
        dynamicsEvidence
      ])
    );


  // ==========================================
  // 14. EVIDENCE INDEPENDENCE
  // ==========================================

  const calibratedIndependence =
    num(
      v28?.independence?.score
    );


  // ==========================================
  // 15. EVIDENCE CONFIDENCE
  // ==========================================

  /*
   * Confidence:
   * "Evidence ne kadar güvenilir şekilde
   * yorumlanabiliyor?"
   *
   * Bu Trust Score değildir.
   */

  let confidence =
    Math.round(
      (
        evidenceAvailability * 0.35
      ) +
      (
        calibratedIndependence * 0.40
      ) +
      (
        calibratedEvidenceQuality * 0.25
      )
    );

  confidence =
    clamp(confidence);


  // ==========================================
  // 16. RISK-ADJUSTED EVIDENCE
  // ==========================================

  const riskPenalty =
    Math.round(
      structuralRisk * 0.35
    );

  const independencePenalty =
    calibratedIndependence < 50
      ? 15
      : 0;

  const riskAdjustedEvidence =
    clamp(
      calibratedEvidenceQuality -
      riskPenalty -
      independencePenalty
    );


  // ==========================================
  // 17. CALIBRATION NOTES
  // ==========================================

  const notes = [];

  if (!metadataAccessible) {

    notes.push(
      "Metadata is inaccessible; this is not treated as proof of invalid metadata."
    );

  }

  if (
    metadataIndependence < 35
  ) {

    notes.push(
      "Metadata independence remains LOW because of URI reuse."
    );

  }

  if (
    graphExists &&
    directNeighbors >= 50
  ) {

    notes.push(
      "Graph evidence is available but highly connected, reducing agent-specific independence."
    );

  }

  if (
    validatorIndependence <= 30
  ) {

    notes.push(
      "Validation evidence has limited independence."
    );

  }

  if (
    providerValidatorOverlap > 0
  ) {

    notes.push(
      "Provider/validator role overlap reduces reviewer separation."
    );

  }

  if (
    structuralRisk >= 65
  ) {

    notes.push(
      "Structural risk remains HIGH."
    );

  }


  // ==========================================
  // 18. CALIBRATED DECISION
  // ==========================================

  let decision;

  if (
    v30?.decision?.result === "BLOCK"
  ) {

    decision = "BLOCK";

  } else if (
    structuralRisk >= 65 ||
    calibratedIndependence < 50
  ) {

    decision = "REVIEW";

  } else if (
    calibratedEvidenceQuality >= 75 &&
    calibratedIndependence >= 75 &&
    structuralRisk < 35
  ) {

    decision = "ALLOW";

  } else {

    decision = "REVIEW";

  }


  // ==========================================
  // 19. OUTPUT
  // ==========================================

  const output = {

    schemaVersion: "3.2",

    engine:
      "EVIDENCE_CALIBRATION",

    generatedAt:
      new Date().toISOString(),

    agent:
      AGENT_ID,

    availability: {

      score:
        evidenceAvailability,

      classification:
        level(evidenceAvailability)

    },

    quality: {

      score:
        calibratedEvidenceQuality,

      classification:
        level(calibratedEvidenceQuality)

    },

    independence: {

      score:
        calibratedIndependence,

      classification:
        level(calibratedIndependence)

    },

    confidence: {

      score:
        confidence,

      classification:
        level(confidence)

    },

    risk: {

      structural:
        structuralRisk,

      classification:
        level(100 - structuralRisk),

      anomaly:
        anomalyScore,

      correlated:
        correlatedRisk

    },

    components: {

      identity: {

        score:
          identityScore,

        status:
          identityEvidence
            ? "AVAILABLE"
            : "MISSING"

      },

      reputation: {

        score:
          reputationQuality,

        providers:
          reputationProviders

      },

      validation: {

        score:
          validationQuality,

        validatorIndependence,

        providerValidatorOverlap

      },

      metadata: {

        quality:
          metadataQuality,

        availability:
          metadataAvailability,

        validity:
          metadataValidity,

        independence:
          metadataIndependence,

        status:
          metadataEvidenceStatus,

        independenceStatus:
          metadataIndependenceStatus

      },

      graph: {

        quality:
          graphEvidenceQuality,

        availability:
          graphAvailability,

        specificity:
          graphSpecificity,

        independence:
          graphIndependence,

        directNeighbors,

        componentAgents

      },

      dynamics: {

        evidence:
          dynamicsEvidence,

        status:
          dynamicsStatus

      }

    },

    riskAdjustedEvidence: {

      score:
        riskAdjustedEvidence,

      classification:
        level(riskAdjustedEvidence),

      riskPenalty,

      independencePenalty

    },

    decision: {

      v30:
        v30?.decision?.result ||
        "UNKNOWN",

      final:
        decision

    },

    calibrationNotes:
      notes,

    safeguards: {

      inaccessibleMetadataIsNotFraud:
        true,

      sharedURIIsNotFraud:
        true,

      graphConnectivityIsNotFraud:
        true,

      highRiskDoesNotAutomaticallyMeanMalicious:
        true,

      notTrustScore:
        true,

      notProbabilityOfTruth:
        true

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
  console.log("          V32 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agent:",
    AGENT_ID
  );

  console.log(
    "Evidence Availability:",
    evidenceAvailability,
    "/100",
    level(evidenceAvailability)
  );

  console.log(
    "Calibrated Evidence Quality:",
    calibratedEvidenceQuality,
    "/100",
    level(calibratedEvidenceQuality)
  );

  console.log(
    "Evidence Independence:",
    calibratedIndependence,
    "/100",
    level(calibratedIndependence)
  );

  console.log(
    "Evidence Confidence:",
    confidence,
    "/100",
    level(confidence)
  );

  console.log(
    "Structural Risk:",
    structuralRisk,
    "/100",
    level(structuralRisk)
  );

  console.log(
    "Risk-Adjusted Evidence:",
    riskAdjustedEvidence,
    "/100",
    level(riskAdjustedEvidence)
  );

  console.log("");

  console.log("==========================================");
  console.log("        COMPONENT CALIBRATION");
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
    "Metadata Quality:",
    metadataQuality
  );

  console.log(
    "Metadata Availability:",
    metadataAvailability
  );

  console.log(
    "Metadata Independence:",
    metadataIndependence
  );

  console.log(
    "Graph Evidence:",
    graphEvidenceQuality
  );

  console.log(
    "Graph Specificity:",
    graphSpecificity
  );

  console.log(
    "Dynamics Evidence:",
    dynamicsEvidence
  );

  console.log("");

  console.log("==========================================");
  console.log("        CALIBRATION NOTES");
  console.log("==========================================");
  console.log("");

  for (const note of notes) {
    console.log(
      `→ ${note}`
    );
  }

  console.log("");

  console.log("==========================================");
  console.log("           FINAL DECISION");
  console.log("==========================================");
  console.log("");

  if (decision === "ALLOW") {
    console.log("🟢 ALLOW");
  } else if (decision === "BLOCK") {
    console.log("🔴 BLOCK");
  } else {
    console.log("🟡 REVIEW");
  }

  console.log("");

  console.log(
    "V30:",
    v30?.decision?.result ||
    "UNKNOWN"
  );

  console.log(
    "V32:",
    decision
  );

  console.log("");

  console.log("==========================================");
  console.log("             SAFETY CHECKS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Inaccessible metadata = fraud:",
    false
  );

  console.log(
    "Shared URI = fraud:",
    false
  );

  console.log(
    "Graph connectivity = fraud:",
    false
  );

  console.log(
    "High risk = malicious:",
    false
  );

  console.log(
    "Trust Score:",
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
    "       EVIDENCE CALIBRATION TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");
}

try {
  main();
} catch (error) {

  console.error("");
  console.error("❌ V32 kritik hata:");
  console.error(
    error.message ||
    error
  );
  console.error("");

  process.exit(1);
}