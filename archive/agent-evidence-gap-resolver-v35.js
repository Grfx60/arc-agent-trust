const fs = require("fs");

const V28_FILE = "agent-evidence-independence-v28-1.json";
const V29_FILE = "agent-risk-correlation-v29.json";
const V30_FILE = "agent-evidence-decision-v30.json";
const V32_FILE = "agent-evidence-calibration-v32.json";
const V33_FILE = "agent-trust-assessment-v33.json";
const V34_FILE = "agent-evidence-review-v34.json";

const OUTPUT_FILE = "agent-evidence-gap-v35.json";

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
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function addTask(tasks, task) {
  tasks.push({
    id: `V35-${String(tasks.length + 1).padStart(3, "0")}`,
    status: "OPEN",
    ...task
  });
}

function main() {

  console.log("");
  console.log("==========================================");
  console.log("        EVIDENCE GAP RESOLVER v35");
  console.log("==========================================");
  console.log("");

  const v28 = loadJSON(V28_FILE);
  const v29 = loadJSON(V29_FILE);
  const v30 = loadJSON(V30_FILE);
  const v32 = loadJSON(V32_FILE);
  const v33 = loadJSON(V33_FILE);
  const v34 = loadJSON(V34_FILE);

  console.log("DATA AVAILABILITY");
  console.log("------------------------------------------");

  console.log("V28.1:", v28 ? "OK" : "MISSING");
  console.log("V29:", v29 ? "OK" : "MISSING");
  console.log("V30:", v30 ? "OK" : "MISSING");
  console.log("V32:", v32 ? "OK" : "MISSING");
  console.log("V33:", v33 ? "OK" : "MISSING");
  console.log("V34:", v34 ? "OK" : "MISSING");

  console.log("");

  const trust =
    num(v33?.assessment?.score);

  const confidence =
    num(v33?.assessment?.confidence);

  const independence =
    num(v33?.evidence?.independence);

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
      v28?.verifiedEvidence?.uriAgents
    );

  const uriOwners =
    num(
      v28?.verifiedEvidence?.uriOwners
    );

  const reviewStatus =
    v34?.review?.status ||
    "UNKNOWN";

  const tasks = [];


  // ==========================================
  // GAP 1 — VALIDATOR DIVERSITY
  // ==========================================

  if (validatorIndependence < 50) {

    addTask(tasks, {
      type: "VALIDATOR_DIVERSITY",
      priority: "CRITICAL",

      finding:
        "Validation evidence is not sufficiently independent.",

      currentValue:
        validatorIndependence,

      target:
        ">= 50",

      requiredEvidence: [
        "Independent validator identity",
        "Independent validation observation",
        "Validator relationship to agent"
      ],

      action:
        "Collect validation evidence from additional independent validators.",

      successCondition:
        "At least two independently attributable validator sources are available.",

      blocksAutomaticAllow:
        true
    });

  }


  // ==========================================
  // GAP 2 — ROLE SEPARATION
  // ==========================================

  if (providerValidatorOverlap > 0) {

    addTask(tasks, {
      type: "ROLE_SEPARATION",
      priority: "HIGH",

      finding:
        "Reputation provider and validator roles overlap.",

      currentValue:
        providerValidatorOverlap,

      target:
        0,

      requiredEvidence: [
        "Provider identity",
        "Validator identity",
        "Role attribution",
        "Independence relationship"
      ],

      action:
        "Determine whether the overlapping actor is independently qualified to perform both roles.",

      successCondition:
        "Role overlap is either independently justified or removed from the independent evidence set.",

      blocksAutomaticAllow:
        true
    });

  }


  // ==========================================
  // GAP 3 — METADATA RETRIEVAL
  // ==========================================

  if (metadata < 50) {

    addTask(tasks, {
      type: "METADATA_RETRIEVAL",
      priority: "HIGH",

      finding:
        "Agent-specific metadata is currently insufficient.",

      currentValue:
        metadata,

      target:
        ">= 50",

      requiredEvidence: [
        "Original tokenURI",
        "IPFS CID or metadata URL",
        "Gateway retrieval result",
        "Raw metadata response",
        "JSON validity"
      ],

      action:
        "Retry retrieval using the original URI and supported IPFS gateways.",

      successCondition:
        "Agent-specific metadata becomes accessible and parseable.",

      blocksAutomaticAllow:
        false
    });

  }


  // ==========================================
  // GAP 4 — METADATA INDEPENDENCE
  // ==========================================

  if (metadataIndependence < 50) {

    addTask(tasks, {
      type: "METADATA_INDEPENDENCE",
      priority: "HIGH",

      finding:
        "The agent shares metadata URI evidence with many other agents.",

      currentValue:
        metadataIndependence,

      target:
        ">= 50",

      context: {
        sharedAgents:
          uriAgents,

        sharedOwners:
          uriOwners
      },

      requiredEvidence: [
        "Agent-specific metadata fields",
        "Metadata ownership attribution",
        "Relationship between shared URI and agent identity",
        "Evidence that shared URI is intentional"
      ],

      action:
        "Determine whether shared URI represents a legitimate template or insufficient agent-specific identity evidence.",

      successCondition:
        "Shared URI is either justified or independent metadata evidence is obtained.",

      blocksAutomaticAllow:
        true
    });

  }


  // ==========================================
  // GAP 5 — STRUCTURAL ANOMALY
  // ==========================================

  if (anomaly >= 60) {

    addTask(tasks, {
      type: "STRUCTURAL_REVIEW",
      priority: "HIGH",

      finding:
        "Agent has a high structural anomaly score.",

      currentValue:
        anomaly,

      target:
        "< 60",

      requiredEvidence: [
        "Owner relationship",
        "URI relationship",
        "Agent cluster membership",
        "Cross-owner relationships",
        "Legitimate operational explanation"
      ],

      action:
        "Investigate the structural cluster and determine whether relationships have a legitimate explanation.",

      successCondition:
        "Structural anomaly is explained or independent evidence offsets the anomaly.",

      blocksAutomaticAllow:
        false
    });

  }


  // ==========================================
  // GAP 6 — CORRELATED RISK
  // ==========================================

  if (correlatedRisk >= 60) {

    addTask(tasks, {
      type: "CORRELATED_RISK_REVIEW",
      priority: "HIGH",

      finding:
        "Multiple risk signals may originate from the same underlying correlation.",

      currentValue:
        correlatedRisk,

      target:
        "< 60",

      requiredEvidence: [
        "Independent origin of risk signals",
        "Provider independence",
        "Validator independence",
        "Metadata independence",
        "Structural relationship analysis"
      ],

      action:
        "Separate correlated observations from genuinely independent risk evidence.",

      successCondition:
        "Risk signals are independently attributable or correlation is explained.",

      blocksAutomaticAllow:
        false
    });

  }


  // ==========================================
  // GAP 7 — GRAPH EVIDENCE
  // ==========================================

  if (graph < 60) {

    addTask(tasks, {
      type: "GRAPH_EVIDENCE",
      priority: "MEDIUM",

      finding:
        "Graph evidence has limited agent-specific value.",

      currentValue:
        graph,

      target:
        ">= 60",

      requiredEvidence: [
        "Direct relationships",
        "Indirect relationships",
        "Relationship direction",
        "Independent graph signals"
      ],

      action:
        "Inspect direct and indirect graph relationships for independent evidence.",

      successCondition:
        "At least one meaningful independent graph signal is established.",

      blocksAutomaticAllow:
        false
    });

  }


  // ==========================================
  // GAP 8 — CONFIDENCE
  // ==========================================

  if (confidence < 60) {

    addTask(tasks, {
      type: "CONFIDENCE_IMPROVEMENT",
      priority: "MEDIUM",

      finding:
        "Confidence in the current assessment is low.",

      currentValue:
        confidence,

      target:
        ">= 60",

      requiredEvidence: [
        "Additional independent evidence",
        "Resolved metadata gap",
        "Improved validator diversity",
        "Resolved role overlap"
      ],

      action:
        "Increase independent evidence coverage before changing the final decision.",

      successCondition:
        "Assessment confidence reaches at least 60.",

      blocksAutomaticAllow:
        false
    });

  }


  // ==========================================
  // REVIEW COMPLETION
  // ==========================================

  const criticalOpen =
    tasks.filter(
      t =>
        t.priority === "CRITICAL" &&
        t.status === "OPEN"
    ).length;

  const highOpen =
    tasks.filter(
      t =>
        t.priority === "HIGH" &&
        t.status === "OPEN"
    ).length;

  const mediumOpen =
    tasks.filter(
      t =>
        t.priority === "MEDIUM" &&
        t.status === "OPEN"
    ).length;

  const totalOpen =
    tasks.filter(
      t =>
        t.status === "OPEN"
    ).length;


  let reviewStage;

  if (criticalOpen > 0) {
    reviewStage = "CRITICAL_GAPS";
  } else if (highOpen > 0) {
    reviewStage = "HIGH_PRIORITY_GAPS";
  } else if (mediumOpen > 0) {
    reviewStage = "FINAL_REVIEW";
  } else {
    reviewStage = "REVIEW_COMPLETE";
  }


  // ==========================================
  // NEXT TASK
  // ==========================================

  let nextTask =
    tasks.find(
      t =>
        t.status === "OPEN" &&
        t.priority === "CRITICAL"
    );

  if (!nextTask) {

    nextTask =
      tasks.find(
        t =>
          t.status === "OPEN" &&
          t.priority === "HIGH"
      );

  }

  if (!nextTask) {

    nextTask =
      tasks.find(
        t =>
          t.status === "OPEN"
      );

  }


  const nextAction =
    nextTask
      ? nextTask.id
      : "NONE";


  // ==========================================
  // DECISION SAFETY
  // ==========================================

  const decision =
    v30?.decision?.result ||
    "REVIEW";

  const automaticAllowBlocked =
    tasks.some(
      task =>
        task.blocksAutomaticAllow &&
        task.status === "OPEN"
    );

  const automaticBlockAllowed =
    false;


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "3.5",

    engine:
      "EVIDENCE_GAP_RESOLVER",

    generatedAt:
      new Date().toISOString(),

    agent:
      AGENT_ID,

    currentState: {

      decision,

      reviewStatus,

      trustAssessment:
        trust,

      trustConfidence:
        confidence,

      evidenceIndependence:
        independence,

      structuralRisk

    },

    gapSummary: {

      totalOpen,

      critical:
        criticalOpen,

      high:
        highOpen,

      medium:
        mediumOpen,

      stage:
        reviewStage

    },

    nextAction,

    tasks,

    safeguards: {

      automaticAllowBlocked,

      automaticBlockAllowed,

      reviewDoesNotMeanFraud:
        true,

      sharedURIIsNotFraud:
        true,

      structuralAnomalyIsNotMaliciousProof:
        true,

      missingMetadataIsNotFraud:
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
  console.log("          V35 FINAL RESULT");
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

  console.log("");

  console.log("==========================================");
  console.log("             GAP SUMMARY");
  console.log("==========================================");
  console.log("");

  console.log(
    "Open gaps:",
    totalOpen
  );

  console.log(
    "Critical:",
    criticalOpen
  );

  console.log(
    "High:",
    highOpen
  );

  console.log(
    "Medium:",
    mediumOpen
  );

  console.log(
    "Review stage:",
    reviewStage
  );

  console.log(
    "Next action:",
    nextAction
  );

  console.log("");

  console.log("==========================================");
  console.log("             OPEN TASKS");
  console.log("==========================================");
  console.log("");

  for (const task of tasks) {

    console.log(
      `[${task.priority}] ${task.id} — ${task.type}`
    );

    console.log(
      `  Finding: ${task.finding}`
    );

    console.log(
      `  Current: ${task.currentValue}`
    );

    console.log(
      `  Target: ${task.target}`
    );

    console.log(
      `  Action: ${task.action}`
    );

    console.log(
      `  Success: ${task.successCondition}`
    );

    console.log("");

  }


  console.log("==========================================");
  console.log("             SAFETY CHECKS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Automatic ALLOW blocked:",
    automaticAllowBlocked
  );

  console.log(
    "Automatic BLOCK allowed:",
    automaticBlockAllowed
  );

  console.log(
    "Review = fraud:",
    false
  );

  console.log(
    "Shared URI = fraud:",
    false
  );

  console.log(
    "Missing metadata = fraud:",
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
    "        EVIDENCE GAP RESOLVER TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");
}

try {
  main();
} catch (error) {

  console.error("");
  console.error("❌ V35 kritik hata:");
  console.error(
    error.message || error
  );
  console.error("");

  process.exit(1);
}