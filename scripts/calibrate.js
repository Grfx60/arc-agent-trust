const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { calibrate, parseLabels } = require('../src/calibration');

const labelsPath = path.resolve(process.argv[2] || 'calibration/labels.csv');
const reportDir = path.resolve(process.env.REPORT_DIR || 'reports');
const outputPath = path.resolve(process.argv[3] || 'calibration/calibration-result.json');

function main() {
  if (!fs.existsSync(labelsPath)) throw new Error(`Label file not found: ${labelsPath}`);
  const csv = fs.readFileSync(labelsPath, 'utf8');
  const labels = parseLabels(csv);
  const rows = [];
  const missingReports = [];
  for (const entry of labels) {
    const filename = `agent-live-${entry.agentId}-v66.json`;
    const reportPath = path.join(reportDir, filename);
    if (!fs.existsSync(reportPath)) { missingReports.push(entry.agentId); continue; }
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const trust = report.trust || {};
    const trustScore = Number(trust.score);
    const confidence = Number(trust.confidence);
    if (!Number.isFinite(trustScore) || !Number.isFinite(confidence)) {
      missingReports.push(entry.agentId);
      continue;
    }
    rows.push({
      ...entry,
      trustScore,
      confidence,
      negativeSignals: Array.isArray(report.evidence)
        ? report.evidence.filter(item => item?.status === 'NEGATIVE').length
        : Number(report.metrics?.negativeSignals || 0)
    });
  }
  const result = calibrate(rows);
  result.dataset = {
    sha256: crypto.createHash('sha256').update(csv).digest('hex'),
    labeledRows: labels.length,
    usableRows: rows.length,
    missingReports
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

try { main(); } catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
