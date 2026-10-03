const crypto = require('crypto');

const LABELS = ['TRUST', 'REVIEW', 'HIGH_RISK'];
const SCORE_THRESHOLDS = range(60, 95, 5);
const CONFIDENCE_THRESHOLDS = range(50, 90, 5);
const HIGH_RISK_THRESHOLDS = range(20, 80, 5);

function range(start, end, step) {
  const values = [];
  for (let value = start; value <= end; value += step) values.push(value);
  return values;
}

function splitCsvLine(line) {
  const fields = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') { field += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { fields.push(field); field = ''; }
    else field += char;
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  fields.push(field);
  return fields;
}

function parseLabels(csvText) {
  const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) throw new Error('Label CSV is empty.');
  const header = splitCsvLine(lines.shift()).map(value => value.trim().toLowerCase());
  const idColumn = header.indexOf('agentid');
  const labelColumn = header.indexOf('label');
  if (idColumn < 0 || labelColumn < 0) throw new Error('CSV must contain agentId,label columns.');

  const seen = new Set();
  return lines.map((line, index) => {
    const fields = splitCsvLine(line);
    const agentId = String(fields[idColumn] || '').trim();
    const label = String(fields[labelColumn] || '').trim().toUpperCase();
    if (!/^\d{1,78}$/.test(agentId)) throw new Error(`Invalid agentId at CSV row ${index + 2}.`);
    if (!LABELS.includes(label)) throw new Error(`Invalid label at CSV row ${index + 2}; use ${LABELS.join(', ')}.`);
    if (seen.has(agentId)) throw new Error(`Duplicate agentId at CSV row ${index + 2}.`);
    seen.add(agentId);
    return { agentId: String(BigInt(agentId)), label };
  });
}

function stableTestSplit(agentId) {
  return crypto.createHash('sha256').update(String(agentId)).digest()[0] % 5 === 0;
}

function predict(record, thresholds) {
  if (record.negativeSignals > 0 && record.trustScore < thresholds.highRiskTrustMax) return 'HIGH_RISK';
  if (record.trustScore >= thresholds.trustScore && record.confidence >= thresholds.confidence && record.negativeSignals === 0) return 'TRUST';
  return 'REVIEW';
}

function evaluate(records, thresholds) {
  const confusion = Object.fromEntries(LABELS.map(label => [label, Object.fromEntries(LABELS.map(prediction => [prediction, 0]))]));
  for (const record of records) confusion[record.label][predict(record, thresholds)] += 1;
  const total = records.length;
  const correct = LABELS.reduce((sum, label) => sum + confusion[label][label], 0);
  const perLabel = {};
  for (const label of LABELS) {
    const tp = confusion[label][label];
    const actual = LABELS.reduce((sum, other) => sum + confusion[label][other], 0);
    const predicted = LABELS.reduce((sum, other) => sum + confusion[other][label], 0);
    const precision = predicted ? tp / predicted : 0;
    const recall = actual ? tp / actual : 0;
    perLabel[label] = { precision: round(precision), recall: round(recall), f1: round(precision + recall ? 2 * precision * recall / (precision + recall) : 0), support: actual };
  }
  return {
    total,
    accuracy: round(total ? correct / total : 0),
    macroF1: round(LABELS.reduce((sum, label) => sum + perLabel[label].f1, 0) / LABELS.length),
    decisionCoverage: round(total ? records.filter(record => predict(record, thresholds) !== 'REVIEW').length / total : 0),
    perLabel,
    confusion
  };
}

function calibrate(inputRecords, options = {}) {
  const records = inputRecords.slice().sort((a, b) => a.agentId.localeCompare(b.agentId));
  const minimumPerClass = options.minimumPerClass || 5;
  const split = { train: [], test: [] };
  for (const record of records) split[stableTestSplit(record.agentId) ? 'test' : 'train'].push(record);
  const counts = Object.fromEntries(LABELS.map(label => [label, records.filter(record => record.label === label).length]));
  const trainCounts = Object.fromEntries(LABELS.map(label => [label, split.train.filter(record => record.label === label).length]));
  const testCounts = Object.fromEntries(LABELS.map(label => [label, split.test.filter(record => record.label === label).length]));
  const ready = records.length >= minimumPerClass * LABELS.length &&
    LABELS.every(label => counts[label] >= minimumPerClass && trainCounts[label] >= minimumPerClass && testCounts[label] >= minimumPerClass);
  if (!ready) return { status: 'INSUFFICIENT_LABELS', labelCounts: counts, trainCounts, testCounts, requiredPerClassInEachSplit: minimumPerClass };

  let best = null;
  for (const trustScore of SCORE_THRESHOLDS) {
    for (const confidence of CONFIDENCE_THRESHOLDS) {
      for (const highRiskTrustMax of HIGH_RISK_THRESHOLDS) {
        const thresholds = { trustScore, confidence, highRiskTrustMax };
        const metrics = evaluate(split.train, thresholds);
        const rank = [metrics.macroF1, metrics.accuracy, metrics.decisionCoverage];
        if (!best || rank.some((value, i) => value > best.rank[i] && rank.slice(0, i).every((v, j) => v === best.rank[j]))) {
          best = { thresholds, metrics, rank };
        }
      }
    }
  }
  return {
    status: 'CALIBRATED',
    method: 'deterministic-80-20-holdout-grid-search-v1',
    objective: 'macroF1, then accuracy, then decision coverage; thresholds selected on train only',
    labelCounts: counts,
    train: evaluate(split.train, best.thresholds),
    holdout: evaluate(split.test, best.thresholds),
    recommendedEnvironment: {
      TRUST_SCORE_THRESHOLD: best.thresholds.trustScore,
      TRUST_CONFIDENCE_THRESHOLD: best.thresholds.confidence,
      HIGH_RISK_TRUST_MAX: best.thresholds.highRiskTrustMax
    }
  };
}

function round(value) { return Math.round(value * 10000) / 10000; }

module.exports = { LABELS, calibrate, evaluate, parseLabels, predict };
