const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  compareAgents,
  listAgentReports,
  listArchivedAgents,
  reportBelongsToAgent
} = require('../src/report-history');

const reportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arc-agent-trust-history-'));

try {
  fs.writeFileSync(
    path.join(reportDir, 'agent-live-12-v66.json'),
    JSON.stringify({
      agentId: '12',
      network: 'Arc Testnet',
      analyzedAt: '2026-09-15T10:00:00.000Z',
      trust: { score: 82, riskScore: 18, confidence: 90, decision: 'TRUST' }
    })
  );
  fs.writeFileSync(
    path.join(reportDir, 'agent-trust-12.json'),
    JSON.stringify({
      agentId: '12',
      analyzedAt: '2026-09-14T10:00:00.000Z',
      trust: { score: 70, riskScore: 30, confidence: 75, decision: 'REVIEW' }
    })
  );
  fs.writeFileSync(
    path.join(reportDir, 'agent-live-34.json'),
    JSON.stringify({
      agentId: '34',
      analyzedAt: '2026-09-15T09:00:00.000Z',
      trust: { score: 40, riskScore: 60, confidence: 55, decision: 'HIGH_RISK' }
    })
  );

  assert.equal(reportBelongsToAgent('agent-live-12-v66.json', '12'), true);
  assert.equal(reportBelongsToAgent('agent-trust-12.json', '12'), true);
  assert.equal(reportBelongsToAgent('agent-live-123-v66.json', '12'), false);
  assert.equal(reportBelongsToAgent('../agent-live-12-v66.json', '12'), false);

  const history = listAgentReports(reportDir, '12');
  assert.equal(history.length, 2);
  assert.equal(history[0].decision, 'TRUST');
  assert.equal(history[1].decision, 'REVIEW');

  const comparison = compareAgents(reportDir, ['12', '34']);
  assert.equal(comparison.count, 2);
  assert.equal(comparison.agents[0].latest.trustScore, 82);
  assert.equal(comparison.agents[1].latest.decision, 'HIGH_RISK');

  const archive = listArchivedAgents(reportDir);
  assert.equal(archive.length, 2);
  assert.equal(archive[0].agentId, '12');
  assert.equal(archive[0].reportCount, 2);
  assert.equal(listArchivedAgents(reportDir, '34')[0].agentId, '34');

  console.log('Report history assertions passed.');
} finally {
  fs.rmSync(reportDir, { recursive: true, force: true });
}