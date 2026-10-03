const assert = require("assert");
const { calculateTrust } = require("../src/trust-scoring");

function run() {
  const mixed = calculateTrust([
    { category: "identity", signal: "OWNER_CONFIRMED", status: "POSITIVE", weight: 20 },
    { category: "risk", signal: "BAD_SIGNAL", status: "NEGATIVE", weight: 10 },
    { category: "metadata", signal: "METADATA_UNKNOWN", status: "UNKNOWN", weight: 10 }
  ]);

  assert.equal(mixed.trustScore, 67);
  assert.equal(mixed.riskScore, 33);
  assert.equal(mixed.confidence, 75);
  assert.equal(mixed.knownWeight, 30);
  assert.equal(mixed.unknownWeight, 10);
  assert.equal(mixed.breakdown.length, 3);
  assert.equal(mixed.totals.negativeWeight, 10);

  const perfect = calculateTrust([
    { status: "POSITIVE", weight: 20 },
    { status: "POSITIVE", weight: 30 }
  ]);

  assert.equal(perfect.trustScore, 100);
  assert.equal(perfect.riskScore, 0);
  assert.equal(perfect.confidence, 100);

  const empty = calculateTrust([]);
  assert.equal(empty.trustScore, 0);
  assert.equal(empty.riskScore, 0);
  assert.equal(empty.confidence, 0);

  const malformed = calculateTrust([
    { status: "POSITIVE", weight: "invalid" },
    null
  ]);
  assert.equal(malformed.trustScore, 0);
  assert.equal(malformed.confidence, 0);

  const unsafeWeights = calculateTrust([
    { status: "POSITIVE", weight: -100 },
    { status: "NEGATIVE", weight: Infinity }
  ]);
  assert.equal(unsafeWeights.totals.totalWeight, 0);
  assert.equal(unsafeWeights.confidence, 0);

  console.log("Trust scoring assertions passed.");
}

run();
