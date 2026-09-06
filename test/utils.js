const fs = require("fs");

console.log("\n" + "=".repeat(70));
console.log("RISK ENGINE v6 - FAST TEST MATRIX");
console.log("=".repeat(70) + "\n");

// Test scenarios
const scenarios = [
  {
    name: "Original Agent 845265",
    file: "agent-845265-evidence.json"
  },
  {
    name: "Perfect Agent (test)",
    file: "agent-test-perfect-evidence.json"
  }
];

const RISK_WEIGHTS = {
  IDENTITY_MISSING: 25,
  REPUTATION_MISSING: 20,
  REVOKED_FEEDBACK: 10,
  VALIDATION_MISSING: 20,
  VALIDATION_SINGLE_PROVIDER: 8,
  ACTOR_OVERLAP: 25,
  LOW_EVIDENCE_INDEPENDENCE: 20,
  SEMANTICS_UNKNOWN: 8,
  VALIDATION_CHANGED: 5,
  REVIEWER_COVERAGE_UNKNOWN: 5
};

const MAX_RISK_WEIGHT = Object.values(RISK_WEIGHTS).reduce((a, b) => a + b, 0);

function normalizeScore(raw, max = 100) {
  return Math.min(100, Math.max(0, (raw / max) * 100));
}

function calcIndependence(repActors, vals, overlap) {
  if (repActors.size === 0 || vals.size === 0) {
    return 0;
  }
  const ratio = overlap.length / Math.max(repActors.size, vals.size);
  const bonus = Math.min(repActors.size, vals.size) * 5;
  return Math.max(0, Math.min(100, 100 * (1 - ratio) + bonus));
}

function analyzeEvidence(evidence) {
  const identity = evidence.identity || {};
  const idPresent = Boolean(identity.owner || identity.metadataURI);

  const rep = evidence.reputation || {};
  const repClients = Array.isArray(rep.clients) ? rep.clients : [];
  const repFeeds = repClients.flatMap(
    c => (Array.isArray(c.feedbacks) ? c.feedbacks : [])
  );
  const activeFeed = repFeeds.filter(f => f.revoked !== true);

  const val = evidence.validation || {};
  const valRecords = Array.isArray(val.records) ? val.records : [];

  const validators = new Set();
  for (const r of valRecords) {
    if (r.validator) validators.add(r.validator.toLowerCase());
  }

  const repActors = new Set();
  for (const f of repFeeds) {
    if (f.client) repActors.add(f.client.toLowerCase());
  }

  const overlap = [...repActors].filter(a => validators.has(a));
  const indScore = calcIndependence(repActors, validators, overlap);

  // Risk signals
  const signals = {
    risk: [],
    uncertainty: []
  };

  if (!idPresent) signals.risk.push({ w: RISK_WEIGHTS.IDENTITY_MISSING });
  if (activeFeed.length === 0)
    signals.risk.push({ w: RISK_WEIGHTS.REPUTATION_MISSING });
  if (valRecords.length === 0)
    signals.risk.push({ w: RISK_WEIGHTS.VALIDATION_MISSING });
  if (overlap.length > 0) signals.risk.push({ w: RISK_WEIGHTS.ACTOR_OVERLAP });
  if (indScore < 40)
    signals.risk.push({ w: RISK_WEIGHTS.LOW_EVIDENCE_INDEPENDENCE });
  if (validators.size === 1)
    signals.uncertainty.push({ w: RISK_WEIGHTS.VALIDATION_SINGLE_PROVIDER });
  signals.uncertainty.push({ w: RISK_WEIGHTS.REVIEWER_COVERAGE_UNKNOWN });

  const rawRisk = signals.risk.reduce((t, s) => t + s.w, 0);
  const riskScore = normalizeScore(rawRisk, MAX_RISK_WEIGHT);
  const uncertScore = Math.min(
    100,
    signals.uncertainty.reduce((t, s) => t + s.w, 0)
  );

  let confScore = 0;
  if (idPresent) confScore += 20;
  if (activeFeed.length > 0)
    confScore += Math.min(25, 10 + activeFeed.length * 2);
  if (valRecords.length > 0)
    confScore += Math.min(25, 10 + valRecords.length * 2);
  confScore += (indScore / 100) * 20;
  confScore = Math.min(100, confScore);

  return {
    risk: riskScore,
    confidence: confScore,
    uncertainty: uncertScore,
    independence: indScore,
    identity: idPresent,
    feedbacks: activeFeed.length,
    validators: validators.size,
    overlap: overlap.length
  };
}

// Run tests
for (const scenario of scenarios) {
  if (!fs.existsSync(scenario.file)) {
    console.log("❌", scenario.name, "- File not found");
    continue;
  }

  const evidence = JSON.parse(fs.readFileSync(scenario.file, "utf8"));
  const result = analyzeEvidence(evidence);

  let decision = "🟡 REVIEW";
  if (result.risk < 15 && result.confidence > 70) {
    decision = "🟢 ALLOW";
  } else if (result.risk > 40 || result.confidence < 50) {
    decision = "🔴 BLOCK";
  }

  console.log(scenario.name);
  console.log(
    `  Risk:${result.risk.toFixed(1)}/100 | Conf:${result.confidence.toFixed(1)}/100 | Uncert:${result.uncertainty.toFixed(1)}/100`
  );
  console.log(
    `  Identity:${result.identity ? "✓" : "✗"} | Feedback:${result.feedbacks} | Validators:${result.validators} | Overlap:${result.overlap}`
  );
  console.log(
    `  Independence:${result.independence.toFixed(1)}/100 | Decision: ${decision}`
  );
  console.log("");
}

console.log("=".repeat(70) + "\n");

// Save summary report
const summary = {
  testDate: new Date().toISOString(),
  engine: "risk-engine-v6-improved",
  results: []
};

for (const scenario of scenarios) {
  if (!fs.existsSync(scenario.file)) continue;
  const evidence = JSON.parse(fs.readFileSync(scenario.file, "utf8"));
  const result = analyzeEvidence(evidence);
  summary.results.push({
    scenario: scenario.name,
    file: scenario.file,
    metrics: result
  });
}

fs.writeFileSync(
  `test-summary-${Date.now()}.json`,
  JSON.stringify(summary, null, 2)
);

console.log("Test summary saved.\n");
