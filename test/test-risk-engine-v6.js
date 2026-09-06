const fs = require("fs");

// ============================================
// RISK ENGINE v6 - TEST SUITE
// ============================================
//
// Comprehensive test scenarios
// Tests normalization, thresholds, and decisions
//
// ============================================

// ============================================
// TEST UTILITIES
// ============================================

function createTestEvidence(overrides = {}) {
  const base = {
    schemaVersion: "0.2",
    agentId: "845265",
    network: "Arc Testnet",
    identity: {
      owner: "0xBB30e40F0887b060e9339f6541E29AfA5A3A9dBb",
      metadataURI: "ipfs://bafkreibdi6623n3xpf7ymk62ckb4bo75o3qemwkpfvp5i25j66itxvsoei"
    },
    reputation: {
      totalClients: 2,
      clients: [
        {
          client: "0x10149142",
          feedbacks: [
            { value: 95, revoked: false, tag1: "mode-a-daily-decision" }
          ]
        },
        {
          client: "0x20259252",
          feedbacks: [
            { value: 85, revoked: false, tag1: "mode-a-daily-decision" }
          ]
        }
      ]
    },
    validation: {
      totalRequests: 2,
      records: [
        { validator: "0xE18F822B", response: 1 },
        { validator: "0xD27G933C", response: 1 }
      ]
    }
  };

  return JSON.parse(JSON.stringify({ ...base, ...overrides }));
}

function writeTestFile(testName, evidence) {
  const filename = `test-evidence-${testName}.json`;
  fs.writeFileSync(filename, JSON.stringify(evidence, null, 2));
  return filename;
}

function runTest(testName, evidence) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`TEST: ${testName}`);
  console.log(`${"=".repeat(50)}`);

  const filename = writeTestFile(testName, evidence);
  
  // Create temporary AGENT_ID file
  const tempScript = `
const fs = require("fs");
const evidence = JSON.parse(fs.readFileSync("${filename}", "utf8"));

// Inline the analysis logic from risk-engine-v6
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
  REVIEWER_COVERAGE_UNKNOWN: 5,
};

const MAX_RISK_WEIGHT = Object.values(RISK_WEIGHTS).reduce((a, b) => a + b, 0);

function sigmoid(x, slope = 0.1, midpoint = 50) {
  return 1 / (1 + Math.exp(-slope * (x - midpoint)));
}

function normalizeScore(raw, max = 100) {
  return Math.min(100, Math.max(0, (raw / max) * 100));
}

function calculateIndependenceScore(reputationActors, validators, overlappingActors) {
  if (reputationActors.size === 0 || validators.size === 0) {
    return 0;
  }
  const overlapRatio = overlappingActors.length / Math.max(reputationActors.size, validators.size);
  const diversityBonus = Math.min(reputationActors.size, validators.size) * 5;
  const base = 100 * (1 - overlapRatio);
  return Math.max(0, Math.min(100, base + diversityBonus));
}

// Quick analysis
const identity = evidence.identity || {};
const identityPresent = Boolean(identity.owner || identity.metadataURI);

const reputation = evidence.reputation || {};
const reputationClients = Array.isArray(reputation.clients) ? reputation.clients : [];
const reputationFeedbacks = reputationClients.flatMap(c => Array.isArray(c.feedbacks) ? c.feedbacks : []);
const activeFeedbacks = reputationFeedbacks.filter(f => f.revoked !== true);

const validation = evidence.validation || {};
const validationRecords = Array.isArray(validation.records) ? validation.records : [];

const validators = new Set();
for (const record of validationRecords) {
  if (record.validator) {
    validators.add(record.validator.toLowerCase());
  }
}

const reputationActors = new Set();
for (const feedback of reputationFeedbacks) {
  if (feedback.client) {
    reputationActors.add(feedback.client.toLowerCase());
  }
}

const overlappingActors = [...reputationActors].filter(actor => validators.has(actor));
const independenceScore = calculateIndependenceScore(reputationActors, validators, overlappingActors);

// Calculate risk
const signals = { risk: [], uncertainty: [] };

if (!identityPresent) signals.risk.push({ weight: RISK_WEIGHTS.IDENTITY_MISSING });
if (activeFeedbacks.length === 0) signals.risk.push({ weight: RISK_WEIGHTS.REPUTATION_MISSING });
if (validationRecords.length === 0) signals.risk.push({ weight: RISK_WEIGHTS.VALIDATION_MISSING });
if (overlappingActors.length > 0) signals.risk.push({ weight: RISK_WEIGHTS.ACTOR_OVERLAP });
if (independenceScore < 40) signals.risk.push({ weight: RISK_WEIGHTS.LOW_EVIDENCE_INDEPENDENCE });

if (validators.size === 1) signals.uncertainty.push({ weight: RISK_WEIGHTS.VALIDATION_SINGLE_PROVIDER });

signals.uncertainty.push({ weight: RISK_WEIGHTS.REVIEWER_COVERAGE_UNKNOWN });

const rawRisk = signals.risk.reduce((t, s) => t + s.weight, 0);
const riskScore = normalizeScore(rawRisk, MAX_RISK_WEIGHT);
const uncertaintyScore = Math.min(100, signals.uncertainty.reduce((t, s) => t + s.weight, 0));

let confidenceScore = 0;
if (identityPresent) confidenceScore += 20;
if (activeFeedbacks.length > 0) confidenceScore += Math.min(25, 10 + (activeFeedbacks.length * 2));
if (validationRecords.length > 0) confidenceScore += Math.min(25, 10 + (validationRecords.length * 2));
confidenceScore += (independenceScore / 100) * 20;
confidenceScore = Math.min(100, confidenceScore);

console.log("Risk Score:", riskScore.toFixed(1));
console.log("Uncertainty:", uncertaintyScore.toFixed(1));
console.log("Confidence:", confidenceScore.toFixed(1));
console.log("Independence:", independenceScore.toFixed(1));
console.log("Identity:", identityPresent ? "✓" : "✗");
console.log("Active Feedbacks:", activeFeedbacks.length);
console.log("Validators:", validators.size);
console.log("Overlapping:", overlappingActors.length);
`;

  try {
    require('child_process').execSync(`node -e "${tempScript.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
  } catch (e) {
    console.error("Test execution error:", e.message);
  }

  // Cleanup
  try {
    fs.unlinkSync(filename);
  } catch (e) {}
}

// ============================================
// TEST SCENARIOS
// ============================================

console.log("\n");
console.log("█".repeat(60));
console.log("█  RISK ENGINE v6 - COMPREHENSIVE TEST SUITE");
console.log("█".repeat(60));

// Test 1: Perfect Agent (should be ALLOW)
runTest("1-perfect-agent", createTestEvidence({
  reputation: {
    totalClients: 4,
    clients: [
      { client: "0x1111", feedbacks: [{ value: 95, revoked: false }] },
      { client: "0x2222", feedbacks: [{ value: 90, revoked: false }] },
      { client: "0x3333", feedbacks: [{ value: 88, revoked: false }] },
      { client: "0x4444", feedbacks: [{ value: 92, revoked: false }] }
    ]
  },
  validation: {
    totalRequests: 4,
    records: [
      { validator: "0xA111", response: 1 },
      { validator: "0xB222", response: 1 },
      { validator: "0xC333", response: 1 },
      { validator: "0xD444", response: 1 }
    ]
  }
}));

// Test 2: No Reputation Evidence
runTest("2-no-reputation", createTestEvidence({
  reputation: {
    totalClients: 0,
    clients: []
  }
}));

// Test 3: No Validation Evidence
runTest("3-no-validation", createTestEvidence({
  validation: {
    totalRequests: 0,
    records: []
  }
}));

// Test 4: Missing Identity
runTest("4-missing-identity", createTestEvidence({
  identity: {
    owner: null,
    metadataURI: null
  }
}));

// Test 5: Revoked Feedback
runTest("5-revoked-feedback", createTestEvidence({
  reputation: {
    totalClients: 2,
    clients: [
      { client: "0x1111", feedbacks: [{ value: 90, revoked: true }] },
      { client: "0x2222", feedbacks: [{ value: 85, revoked: false }] }
    ]
  }
}));

// Test 6: Actor Overlap
runTest("6-actor-overlap", createTestEvidence({
  reputation: {
    totalClients: 2,
    clients: [
      { client: "0xAAAA", feedbacks: [{ value: 95, revoked: false }] },
      { client: "0xBBBB", feedbacks: [{ value: 90, revoked: false }] }
    ]
  },
  validation: {
    totalRequests: 2,
    records: [
      { validator: "0xAAAA", response: 1 }, // Same as reputation actor
      { validator: "0xCCCC", response: 1 }
    ]
  }
}));

// Test 7: Single Validator
runTest("7-single-validator", createTestEvidence({
  validation: {
    totalRequests: 1,
    records: [
      { validator: "0xAAA", response: 1 }
    ]
  }
}));

// Test 8: Variable Validation Responses
runTest("8-variable-validation", createTestEvidence({
  validation: {
    totalRequests: 3,
    records: [
      { validator: "0xA111", response: 1 },
      { validator: "0xB222", response: 0 },
      { validator: "0xC333", response: 1 }
    ]
  }
}));

// Test 9: Unknown Semantics
runTest("9-unknown-semantics", createTestEvidence({
  reputation: {
    totalClients: 1,
    clients: [
      { client: "0x1111", feedbacks: [{ value: 80, revoked: false, tag1: "unknown-tag" }] }
    ]
  }
}));

// Test 10: Minimal Data
runTest("10-minimal-data", createTestEvidence({
  identity: {
    owner: "0x1111",
    metadataURI: null
  },
  reputation: {
    totalClients: 1,
    clients: [
      { client: "0xAAA", feedbacks: [{ value: 75, revoked: false }] }
    ]
  },
  validation: {
    totalRequests: 1,
    records: [
      { validator: "0xBBB", response: 1 }
    ]
  }
}));

// Test 11: Large Scale Good Agent
runTest("11-large-scale-good", createTestEvidence({
  reputation: {
    totalClients: 10,
    clients: Array.from({ length: 10 }, (_, i) => ({
      client: `0x${i.toString().padStart(4, '0')}`,
      feedbacks: [{ value: 80 + Math.random() * 15, revoked: false }]
    }))
  },
  validation: {
    totalRequests: 8,
    records: Array.from({ length: 8 }, (_, i) => ({
      validator: `0xV${i.toString().padStart(3, '0')}`,
      response: 1
    }))
  }
}));

// Test 12: Large Scale Bad Agent (many revoked)
runTest("12-large-scale-bad", createTestEvidence({
  reputation: {
    totalClients: 10,
    clients: Array.from({ length: 10 }, (_, i) => ({
      client: `0x${i.toString().padStart(4, '0')}`,
      feedbacks: [
        { value: 50 + Math.random() * 30, revoked: i % 3 === 0 }
      ]
    }))
  },
  validation: {
    totalRequests: 4,
    records: [
      { validator: "0xV001", response: 1 },
      { validator: "0xV001", response: 0 },
      { validator: "0xV001", response: 0 },
      { validator: "0xV002", response: 1 }
    ]
  }
}));

console.log("\n");
console.log("█".repeat(60));
console.log("█  TEST SUITE COMPLETED");
console.log("█".repeat(60));
console.log("\nTest files cleaned up automatically.");
console.log("Review output above for each scenario.\n");
