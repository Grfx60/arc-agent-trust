const fs = require("fs");

const V28_FILE = "agent-evidence-independence-v28-1.json";
const V29_FILE = "agent-risk-correlation-v29.json";
const V30_FILE = "agent-evidence-decision-v30.json";
const V32_FILE = "agent-evidence-calibration-v32.json";
const V33_FILE = "agent-trust-assessment-v33.json";

const OUTPUT_FILE = "agent-evidence-review-v34.json";

const AGENT_ID = 845265;

function loadJSON(file) {
  if (!fs.existsSync(file)) return null;

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function num(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function priority(score) {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

function main() {

  console.log("");
  console.log("==========================================");
  console.log("         EVIDENCE REVIEW ENGINE v34");
  console.log("==========================================");
  console.log("");

  const v28 = loadJSON(V28_FILE);
  const v29 = loadJSON(V29_FILE);
  const v30 = loadJSON(V30_FILE);
  const v32 = loadJSON(V32_FILE);
  const v33 = loadJSON(V33_FILE);

  console.log("DATA AVAILABILITY");
  console.log("------------------------------------------");
  console.log("V28.1:", v28 ? "OK" : "MISSING");
  console.log("V29:", v29 ? "OK" : "MISSING");
  console.log("V30:", v30 ? "OK" : "MISSING");
  console.log("V32:", v32 ? "OK" : "MISSING");
  console.log("V33:", v33 ? "OK" : "MISSING");
  console.log("");

  const decision =
    v33?.decision?.current ||
    v30?.decision?.result ||
    "REVIEW";

  const trust =
    num(v33?.assessment?.score);

  const confidence =
    num(v33?.assessment?.confidence);

  const evidenceIndependence =
    num(v33?.evidence?.independence);

  const evidenceQuality =
    num(v33?.evidence?.quality);

  const structuralRisk =
    num(v33?.risk?.structural);

  const anomaly =
    num(v33?.risk?.anomaly);

  const correlatedRisk =
    num(v33?.risk?.correlated);

  const validation =
    num(v33?.dimensions?.validation);

  const metadata =
    num(v33?.dimensions?.metadata);

  const graph =
    num(v33?.dimensions?.graph);

  const dynamics =
    num(v33?.dimensions?.dynamics);

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

  const uriAgents =
    num(
      v28?.verifiedEvidence?.uriAgents,
      v32?.components?.metadata?.uriAgents
    );

  const uriOwners =
    num(
      v28?.verifiedEvidence?.uriOwners,
      v32?.components?.metadata?.uriOwners
    );


  // ==========================================
  // REVIEW ITEMS
  // ==========================================

  const reviewItems = [];


  // 1. VALIDATOR INDEPENDENCE

  if (validatorIndependence < 50) {

    reviewItems.push({
      id: "R01",
      area: "VALIDATION",
      priority: priority(
        100 - validatorIndependence
      ),
      finding:
        "Validation evidence has low independence.",
      evidence:
        `${validatorIndependence}/100 validator independence.`,
      action:
        "Identify additional independent validators and compare their evidence.",
      resolution:
        "Increase validator diversity and verify that validators are independent."
    });

  }


  // 2. PROVIDER / VALIDATOR OVERLAP

  if (providerValidatorOverlap > 0) {

    reviewItems.push({
      id: "R02",
      area: "REVIEWER_SEPARATION",
      priority: "HIGH",
      finding:
        "At least one actor appears in both provider and validator roles.",
      evidence:
        `${providerValidatorOverlap} overlapping actor(s).`,
      action:
        "Determine whether the overlapping actor is independently qualified in both roles.",
      resolution:
        "Separate reputation and validation roles where possible."
    });

  }


  // 3. METADATA ACCESS

  if (metadata < 50) {

    reviewItems.push({
      id: "R03",
      area: "METADATA",
      priority: "HIGH",
      finding:
        "Agent metadata evidence is insufficient.",
      evidence:
        `Metadata assessment: ${metadata}/100.`,
      action:
        "Retry metadata retrieval through the recorded URI and alternative supported gateways.",
      resolution:
        "Obtain accessible, valid and independently attributable metadata."
    });

  }


  // 4. METADATA INDEPENDENCE

  if (metadataIndependence < 50) {

    reviewItems.push({
      id: "R04",
      area: "METADATA_INDEPENDENCE",
      priority: "HIGH",
      finding:
        "Metadata evidence is strongly correlated through URI reuse.",
      evidence:
        `${metadataIndependence}/100 metadata independence; ${uriAgents} agents and ${uriOwners} owners associated with shared URI evidence.`,
      action:
        "Inspect whether the shared URI represents a legitimate common metadata template or agent-specific evidence.",
      resolution:
        "Establish agent-specific metadata or independently verifiable metadata."
    });

  }


  // 5. STRUCTURAL ANOMALY

  if (anomaly >= 60) {

    reviewItems.push({
      id: "R05",
      area: "STRUCTURE",
      priority: "HIGH",
      finding:
        "Agent exhibits significant structural anomaly.",
      evidence:
        `Anomaly score: ${anomaly}/100.`,
      action:
        "Review owner, URI and relationship patterns against normal agent behavior.",
      resolution:
        "Determine whether structural correlation has a legitimate operational explanation."
    });

  }


  // 6. CORRELATED RISK

  if (correlatedRisk >= 60) {

    reviewItems.push({
      id: "R06",
      area: "CORRELATED_RISK",
      priority: "HIGH",
      finding:
        "Multiple risk signals are correlated.",
      evidence:
        `Correlated risk: ${correlatedRisk}/100.`,
      action:
        "Review the underlying independent signals rather than treating correlated signals as separate evidence.",
      resolution:
        "Confirm whether the risk derives from one common source or multiple independent observations."
    });

  }


  // 7. GRAPH

  if (graph < 60) {

    reviewItems.push({
      id: "R07",
      area: "GRAPH",
      priority: "MEDIUM",
      finding:
        "Graph evidence has limited agent-specific strength.",
      evidence:
        `Graph dimension: ${graph}/100.`,
      action:
        "Inspect the agent's direct and indirect graph relationships.",
      resolution:
        "Identify relationships that provide genuinely independent evidence."
    });

  }


  // 8. DYNAMICS

  if (dynamics < 60) {

    reviewItems.push({
      id: "R08",
      area: "DYNAMICS",
      priority: "MEDIUM",
      finding:
        "Behavioral history is not yet sufficiently strong.",
      evidence:
        `Dynamics evidence: ${dynamics}/100.`,
      action:
        "Collect additional historical observations.",
      resolution:
        "Establish whether the observed behavior is stable over time."
    });

  }


  // ==========================================
  // PRIORITY ORDER
  // ==========================================

  const order = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  };

  reviewItems.sort(
    (a, b) =>
      order[b.priority] -
      order[a.priority]
  );


  // ==========================================
  // REVIEW STATUS
  // ==========================================

  let reviewStatus = "NOT_REQUIRED";

  if (decision === "REVIEW") {
    reviewStatus = "REQUIRED";
  }

  if (reviewItems.length >= 5) {
    reviewStatus = "DEEP_REVIEW";
  }


  // ==========================================
  // REVIEW SCORE
  // ==========================================

  let reviewBurden = 0;

  for (const item of reviewItems) {

    if (item.priority === "CRITICAL") {
      reviewBurden += 30;
    } else if (item.priority === "HIGH") {
      reviewBurden += 20;
    } else if (item.priority === "MEDIUM") {
      reviewBurden += 10;
    } else {
      reviewBurden += 5;
    }

  }

  reviewBurden =
    Math.min(100, reviewBurden);


  // ==========================================
  // REVIEW GATES
  // ==========================================

  const gates = {

    validationGate:
      validatorIndependence >= 50,

    reviewerSeparationGate:
      reviewerSeparation >= 50 &&
      providerValidatorOverlap === 0,

    metadataGate:
      metadata >= 50 &&
      metadataIndependence >= 50,

    structuralGate:
      structuralRisk < 60,

    independenceGate:
      evidenceIndependence >= 50,

    confidenceGate:
      confidence >= 60

  };


  const gatesPassed =
    Object.values(gates)
      .filter(Boolean)
      .length;

  const gatesTotal =
    Object.keys(gates).length;


  // ==========================================
  // NEXT ACTION
  // ==========================================

  let nextAction;

  if (
    validatorIndependence < 50
  ) {

    nextAction =
      "VALIDATOR_DIVERSITY";

  } else if (
    metadata < 50 ||
    metadataIndependence < 50
  ) {

    nextAction =
      "METADATA_INDEPENDENCE";

  } else if (
    providerValidatorOverlap > 0
  ) {

    nextAction =
      "ROLE_SEPARATION";

  } else if (
    structuralRisk >= 60
  ) {

    nextAction =
      "STRUCTURAL_REVIEW";

  } else {

    nextAction =
      "ADDITIONAL_INDEPENDENT_EVIDENCE";

  }


  // ==========================================
  // SAFETY
  // ==========================================

  const safety = {

    reviewIsNotFraud:
      true,

    sharedURIIsNotFraud:
      true,

    structuralRiskIsNotMaliciousProof:
      true,

    noAutomaticBlock:
      true,

    manualReviewRequired:
      reviewStatus !== "NOT_REQUIRED"

  };


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion: "3.4",

    engine:
      "EVIDENCE_REVIEW",

    generatedAt:
      new Date().toISOString(),

    agent:
      AGENT_ID,

    currentDecision:
      decision,

    trustAssessment:
      trust,

    trustConfidence:
      confidence,

    evidenceQuality,
    evidenceIndependence,

    risk: {
      structural: structuralRisk,
      anomaly,
      correlated: correlatedRisk
    },

    review: {

      status:
        reviewStatus,

      burden:
        reviewBurden,

      items:
        reviewItems.length,

      gatesPassed,

      gatesTotal,

      nextAction

    },

    gates,

    reviewItems,

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
  console.log("          V34 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agent:",
    AGENT_ID
  );

  console.log(
    "Current decision:",
    decision
  );

  console.log(
    "Trust assessment:",
    trust,
    "/100"
  );

  console.log(
    "Trust confidence:",
    confidence,
    "/100"
  );

  console.log(
    "Evidence quality:",
    evidenceQuality,
    "/100"
  );

  console.log(
    "Evidence independence:",
    evidenceIndependence,
    "/100"
  );

  console.log("");

  console.log("==========================================");
  console.log("             REVIEW STATUS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Review status:",
    reviewStatus
  );

  console.log(
    "Review burden:",
    reviewBurden,
    "/100"
  );

  console.log(
    "Review items:",
    reviewItems.length
  );

  console.log(
    "Gates:",
    `${gatesPassed}/${gatesTotal}`
  );

  console.log(
    "Next action:",
    nextAction
  );

  console.log("");

  console.log("==========================================");
  console.log("           REVIEW PRIORITIES");
  console.log("==========================================");
  console.log("");

  for (const item of reviewItems) {

    console.log(
      `[${item.priority}] ${item.id} — ${item.area}`
    );

    console.log(
      `  Finding: ${item.finding}`
    );

    console.log(
      `  Action: ${item.action}`
    );

    console.log("");

  }


  console.log("==========================================");
  console.log("              REVIEW GATES");
  console.log("==========================================");
  console.log("");

  for (const [gate, passed] of Object.entries(gates)) {

    console.log(
      `${passed ? "🟢" : "🔴"} ${gate}:`,
      passed ? "PASS" : "FAIL"
    );

  }

  console.log("");

  console.log("==========================================");
  console.log("             SAFETY CHECKS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Review = fraud:",
    false
  );

  console.log(
    "Shared URI = fraud:",
    false
  );

  console.log(
    "Structural risk = malicious proof:",
    false
  );

  console.log(
    "Automatic BLOCK:",
    false
  );

  console.log(
    "Manual review required:",
    reviewStatus !== "NOT_REQUIRED"
  );

  console.log("");

  console.log(
    "📁 Output:",
    OUTPUT_FILE
  );

  console.log("");

  console.log("==========================================");
  console.log(
    "       EVIDENCE REVIEW TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");
}

try {
  main();
} catch (error) {

  console.error("");
  console.error("❌ V34 kritik hata:");
  console.error(
    error.message || error
  );
  console.error("");

  process.exit(1);
}