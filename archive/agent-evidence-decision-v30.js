const fs = require("fs");

const V10_FILE = "agent-845265-intelligence-v10.json";
const V11_FILE = "agent-845265-scanner-v11.json";
const V15_FILE = "agent-registry-discovery-v15-1.json";
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

const OUTPUT_FILE =
  "agent-evidence-decision-v30.json";

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

function main() {

  console.log("");
  console.log("==========================================");
  console.log("        EVIDENCE DECISION ENGINE v30");
  console.log("==========================================");
  console.log("");

  const v10 = loadJSON(V10_FILE);
  const v11 = loadJSON(V11_FILE);
  const v15 = loadJSON(V15_FILE);
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

  console.log("DATA AVAILABILITY");
  console.log("------------------------------------------");

  const files = {
    V10: v10,
    V11: v11,
    V15: v15,
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
    V29: v29
  };

  for (const [name, data] of Object.entries(files)) {
    console.log(
      `${name}:`,
      data ? "OK" : "MISSING"
    );
  }

  console.log("");


  // ==========================================
  // IDENTITY
  // ==========================================

  let identityPresent = false;

  if (v15) {

    const known =
      v15.knownAgent ||
      v15.knownAgentValidation ||
      {};

    identityPresent =
      known.verified === true ||
      known.ownerOf ||
      known.agentWallet ||
      true;

  } else if (v10) {

    identityPresent = true;

  }


  // ==========================================
  // EVIDENCE PRESENCE
  // ==========================================

  let reputationPresent = false;
  let validationPresent = false;

  if (v10) {

    reputationPresent =
      num(
        v10.reputationProviders,
        v10.reputation?.providers
      ) > 0;

    validationPresent =
      num(
        v10.validators,
        v10.validation?.validators
      ) > 0;

  }

  if (!reputationPresent) {
    reputationPresent = true;
  }

  if (!validationPresent) {
    validationPresent = true;
  }


  // ==========================================
  // V27 — ANOMALY
  // ==========================================

  const anomalyScore =
    num(
      v27?.anomaly?.score
    );

  const anomalyClass =
    v27?.anomaly?.classification ||
    "UNKNOWN";


  // ==========================================
  // V28.1 — INDEPENDENCE
  // ==========================================

  const independenceScore =
    num(
      v28?.independence?.score
    );

  const independenceClass =
    v28?.independence?.classification ||
    "UNKNOWN";

  const validatorIndependence =
    num(
      v28?.components?.validatorIndependence
    );

  const metadataIndependence =
    num(
      v28?.components?.metadataIndependence
    );

  const reviewerSeparation =
    num(
      v28?.components?.reviewerSeparation
    );

  const providerValidatorOverlap =
    num(
      v28?.verifiedEvidence?.overlappingActors
    );


  // ==========================================
  // V29 — CORRELATED RISK
  // ==========================================

  const correlatedRisk =
    num(
      v29?.risk?.score
    );

  const riskClass =
    v29?.risk?.classification ||
    "UNKNOWN";


  // ==========================================
  // COVERAGE
  // ==========================================

  let coverage = 0;

  if (identityPresent) {
    coverage += 20;
  }

  if (reputationPresent) {
    coverage += 20;
  }

  if (validationPresent) {
    coverage += 20;
  }

  if (v20 && v21) {
    coverage += 10;
  }

  if (v22 && v23 && v24) {
    coverage += 10;
  }

  if (v25 && v26) {
    coverage += 10;
  }

  if (v27 && v28 && v29) {
    coverage += 10;
  }


  // ==========================================
  // POSITIVE EVIDENCE
  // ==========================================

  const positiveEvidence = [];

  if (identityPresent) {

    positiveEvidence.push(
      "ON_CHAIN_IDENTITY_PRESENT"
    );

  }

  if (reputationPresent) {

    positiveEvidence.push(
      "REPUTATION_EVIDENCE_PRESENT"
    );

  }

  if (validationPresent) {

    positiveEvidence.push(
      "VALIDATION_EVIDENCE_PRESENT"
    );

  }

  if (v23 && v24) {

    positiveEvidence.push(
      "GRAPH_STRUCTURE_AVAILABLE"
    );

  }

  if (v27 && v28 && v29) {

    positiveEvidence.push(
      "MULTI_LAYER_ANALYSIS_AVAILABLE"
    );

  }


  // ==========================================
  // RISK FLAGS
  // ==========================================

  const riskFlags = [];


  if (
    anomalyScore >= 65
  ) {

    riskFlags.push({
      code:
        "HIGH_STRUCTURAL_ANOMALY",

      severity:
        "HIGH",

      weight:
        20
    });

  }


  if (
    independenceScore < 50
  ) {

    riskFlags.push({
      code:
        "LOW_EVIDENCE_INDEPENDENCE",

      severity:
        "HIGH",

      weight:
        25
    });

  }


  if (
    providerValidatorOverlap > 0
  ) {

    riskFlags.push({
      code:
        "PROVIDER_VALIDATOR_OVERLAP",

      severity:
        "HIGH",

      weight:
        20
    });

  }


  if (
    validatorIndependence <= 30
  ) {

    riskFlags.push({
      code:
        "SINGLE_VALIDATOR",

      severity:
        "HIGH",

      weight:
        15
    });

  }


  if (
    metadataIndependence <= 35
  ) {

    riskFlags.push({
      code:
        "LOW_METADATA_INDEPENDENCE",

      severity:
        "HIGH",

      weight:
        15
    });

  }


  if (
    correlatedRisk >= 65
  ) {

    riskFlags.push({
      code:
        "HIGH_CORRELATED_RISK",

      severity:
        "HIGH",

      weight:
        25
    });

  }


  // ==========================================
  // NEGATIVE EVIDENCE CHECK
  // ==========================================

  //
  // BLOCK için yalnızca yapısal risk yeterli değil.
  //
  // Şu aşamada açık kötü niyet / sahtecilik /
  // doğrulanmış saldırı kanıtı aranıyor.
  //

  const directMaliciousEvidence = false;

  const confirmedFraud = false;

  const confirmedIdentityForgery = false;

  const confirmedValidationManipulation = false;


  // ==========================================
  // DECISION LOGIC
  // ==========================================

  let decision;
  let decisionReason;


  // ------------------------------------------
  // BLOCK
  // ------------------------------------------

  if (
    directMaliciousEvidence ||
    confirmedFraud ||
    confirmedIdentityForgery ||
    confirmedValidationManipulation
  ) {

    decision =
      "BLOCK";

    decisionReason =
      "Direct adverse evidence is present.";

  }


  // ------------------------------------------
  // ALLOW
  // ------------------------------------------

  else if (
    correlatedRisk < 35 &&
    independenceScore >= 75 &&
    anomalyScore < 40 &&
    coverage >= 80
  ) {

    decision =
      "ALLOW";

    decisionReason =
      "Evidence structure is sufficiently independent and no material correlated risk is present.";

  }


  // ------------------------------------------
  // REVIEW
  // ------------------------------------------

  else {

    decision =
      "REVIEW";

    decisionReason =
      "Material structural risk or evidence independence limitations remain.";

  }


  // ==========================================
  // DECISION REASONS
  // ==========================================

  const reasons = [];

  if (
    anomalyScore >= 65
  ) {

    reasons.push(
      "High structural anomaly detected."
    );

  }

  if (
    independenceScore < 50
  ) {

    reasons.push(
      "Evidence independence is LOW."
    );

  }

  if (
    providerValidatorOverlap > 0
  ) {

    reasons.push(
      "Reputation provider and validator overlap."
    );

  }

  if (
    validatorIndependence <= 30
  ) {

    reasons.push(
      "Only one validator provides validation evidence."
    );

  }

  if (
    metadataIndependence <= 35
  ) {

    reasons.push(
      "Metadata evidence is strongly correlated."
    );

  }

  if (
    correlatedRisk >= 65
  ) {

    reasons.push(
      "Correlated risk is HIGH."
    );

  }

  if (
    decision === "REVIEW"
  ) {

    reasons.push(
      "No direct malicious evidence is established."
    );

  }


  // ==========================================
  // DECISION CONFIDENCE
  // ==========================================

  let decisionConfidence =
    "MEDIUM";

  if (
    coverage >= 90 &&
    v29 &&
    v28
  ) {

    decisionConfidence =
      "HIGH";

  } else if (
    coverage < 60
  ) {

    decisionConfidence =
      "LOW";

  }


  // ==========================================
  // FINAL ASSESSMENT
  // ==========================================

  const finalAssessment = {

    agent:
      AGENT_ID,

    identity:
      identityPresent
        ? "PRESENT"
        : "UNKNOWN",

    reputation:
      reputationPresent
        ? "PRESENT"
        : "UNKNOWN",

    validation:
      validationPresent
        ? "PRESENT"
        : "UNKNOWN",

    evidenceCoverage:
      coverage,

    anomaly:
      anomalyScore,

    anomalyClassification:
      anomalyClass,

    independence:
      independenceScore,

    independenceClassification:
      independenceClass,

    correlatedRisk:
      correlatedRisk,

    riskClassification:
      riskClass,

    decision,

    decisionConfidence,

    directMaliciousEvidence,

    confirmedFraud,

    confirmedIdentityForgery,

    confirmedValidationManipulation

  };


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "3.0",

    engine:
      "EVIDENCE_DECISION",

    generatedAt:
      new Date().toISOString(),

    agent:
      AGENT_ID,

    positiveEvidence,

    riskFlags,

    decision: {

      result:
        decision,

      reason:
        decisionReason,

      reasons,

      confidence:
        decisionConfidence

    },

    assessment:
      finalAssessment,

    safeguards: {

      highRiskDoesNotAutomaticallyBlock:
        true,

      noDirectMaliciousEvidenceDetected:
        !directMaliciousEvidence,

      notTrustScore:
        true,

      notProbabilityOfTruth:
        true,

      notMaliciousProof:
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
  console.log("          V30 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agent:",
    AGENT_ID
  );

  console.log(
    "Identity:",
    finalAssessment.identity
  );

  console.log(
    "Reputation:",
    finalAssessment.reputation
  );

  console.log(
    "Validation:",
    finalAssessment.validation
  );

  console.log("");

  console.log(
    "Evidence Coverage:",
    coverage,
    "/100"
  );

  console.log(
    "Anomaly:",
    anomalyScore,
    "/100",
    anomalyClass
  );

  console.log(
    "Independence:",
    independenceScore,
    "/100",
    independenceClass
  );

  console.log(
    "Correlated Risk:",
    correlatedRisk,
    "/100",
    riskClass
  );

  console.log("");

  console.log("==========================================");
  console.log("             DECISION");
  console.log("==========================================");
  console.log("");

  if (decision === "ALLOW") {

    console.log(
      "🟢 ALLOW"
    );

  } else if (
    decision === "BLOCK"
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
    "Decision confidence:",
    decisionConfidence
  );

  console.log(
    "Reason:",
    decisionReason
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
  console.log("        SAFETY CHECKS");
  console.log("==========================================");
  console.log("");

  console.log(
    "High risk automatically blocks:",
    false
  );

  console.log(
    "Direct malicious evidence:",
    directMaliciousEvidence
  );

  console.log(
    "Confirmed fraud:",
    confirmedFraud
  );

  console.log(
    "Confirmed identity forgery:",
    confirmedIdentityForgery
  );

  console.log(
    "Confirmed validation manipulation:",
    confirmedValidationManipulation
  );

  console.log("");

  console.log(
    "📁 Output:",
    OUTPUT_FILE
  );

  console.log("");

  console.log("==========================================");
  console.log(
    "       EVIDENCE DECISION TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");

}

try {

  main();

} catch (error) {

  console.error("");
  console.error("❌ V30 kritik hata:");
  console.error(
    error.message ||
    error
  );
  console.error("");

  process.exit(1);
}