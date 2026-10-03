const assert = require('assert');
const { calibrate, parseLabels, predict } = require('../src/calibration');

assert.deepEqual(parseLabels('agentId,label\n0007,TRUST\n8,high_risk'), [
  { agentId: '7', label: 'TRUST' },
  { agentId: '8', label: 'HIGH_RISK' }
]);
assert.throws(() => parseLabels('agentId,label\n1,maybe'), /Invalid label/);
assert.throws(() => parseLabels('agentId,label\n1,TRUST\n1,REVIEW'), /Duplicate/);

const thresholds = { trustScore: 80, confidence: 70, highRiskTrustMax: 55 };
assert.equal(predict({ trustScore: 90, confidence: 90, negativeSignals: 0 }, thresholds), 'TRUST');
assert.equal(predict({ trustScore: 30, confidence: 90, negativeSignals: 1 }, thresholds), 'HIGH_RISK');
assert.equal(predict({ trustScore: 90, confidence: 90, negativeSignals: 1 }, thresholds), 'REVIEW');

const small = calibrate([{ agentId: '1', label: 'TRUST', trustScore: 99, confidence: 99, negativeSignals: 0 }]);
assert.equal(small.status, 'INSUFFICIENT_LABELS');

const labeled = Array.from({ length: 300 }, (_, index) => {
  const kind = index % 3;
  if (kind === 0) return { agentId: String(index + 1), label: 'TRUST', trustScore: 95, confidence: 95, negativeSignals: 0 };
  if (kind === 1) return { agentId: String(index + 1), label: 'HIGH_RISK', trustScore: 20, confidence: 80, negativeSignals: 1 };
  return { agentId: String(index + 1), label: 'REVIEW', trustScore: 70, confidence: 60, negativeSignals: 0 };
});
const calibrated = calibrate(labeled);
assert.equal(calibrated.status, 'CALIBRATED');
assert.equal(calibrated.holdout.total > 0, true);
assert.equal(calibrated.holdout.accuracy, 1);
assert.equal(calibrated.recommendedEnvironment.TRUST_SCORE_THRESHOLD >= 60, true);

console.log('Calibration tool assertions passed.');
