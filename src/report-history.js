const fs = require('fs');
const path = require('path');

function isAgentId(value) {
  return require('./agent-id').isValidAgentId(value);
}

function reportBelongsToAgent(filename, agentId) {
  return new RegExp(`^agent-(?:live-${agentId}(?:-v\\d+)?|trust-${agentId})\\.json$`).test(filename);
}

function readReport(reportDir, filename) {
  if (!/^[a-zA-Z0-9._-]+\.json$/.test(filename)) return null;

  const reportPath = path.join(reportDir, filename);
  if (!fs.existsSync(reportPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch {
    return null;
  }
}

function reportSummary(filename, report, reportDir) {
  const stat = fs.statSync(path.join(reportDir, filename));
  const trust = report.trust || report.assessment || {};
  const risk = trust.riskScore ?? trust.risk?.observed ?? null;
  const confidence = trust.confidence ?? trust.confidence?.evidence ?? null;

  return {
    file: filename,
    analyzedAt: report.analyzedAt || report.timestamp || stat.mtime.toISOString(),
    decision: trust.decision || 'UNKNOWN',
    trustScore: trust.score ?? report.trustScore ?? null,
    riskScore: risk,
    confidence,
    network: report.network || null,
    name: report.metadata?.name || report.arcscan?.name || null
  };
}

function listAgentReports(reportDir, agentId, limit = 20) {
  if (!isAgentId(agentId) || !fs.existsSync(reportDir)) return [];

  return fs.readdirSync(reportDir)
    .filter(filename => reportBelongsToAgent(filename, agentId))
    .map(filename => {
      const report = readReport(reportDir, filename);
      return report ? reportSummary(filename, report, reportDir) : null;
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right.analyzedAt) - new Date(left.analyzedAt))
    .slice(0, limit);
}

function latestAgentReport(reportDir, agentId) {
  const [latest] = listAgentReports(reportDir, agentId, 1);
  return latest || null;
}

function listArchivedAgents(reportDir, query = '') {
  if (!fs.existsSync(reportDir)) return [];

  const ids = fs.readdirSync(reportDir)
    .map(filename => filename.match(/^agent-(?:live-)?(\d+)(?:-v\d+)?\.json$/)?.[1])
    .filter(Boolean)
    .filter((id, index, values) => values.indexOf(id) === index)
    .filter(id => String(id).includes(String(query).trim()))
    .map(agentId => {
      const reports = listAgentReports(reportDir, agentId);
      const latest = reports[0] || null;
      return {
        agentId,
        name: latest?.name || `Agent ${agentId}`,
        latest,
        reportCount: reports.length
      };
    });

  return ids.sort((left, right) => {
    const leftTime = new Date(left.latest?.analyzedAt || 0).getTime();
    const rightTime = new Date(right.latest?.analyzedAt || 0).getTime();
    return rightTime - leftTime || Number(left.agentId) - Number(right.agentId);
  });
}

function compareAgents(reportDir, agentIds) {
  const agents = agentIds
    .filter(isAgentId)
    .filter((id, index, values) => values.indexOf(id) === index)
    .slice(0, 10)
    .map(agentId => ({
      agentId,
      latest: latestAgentReport(reportDir, agentId)
    }));

  return {
    agents,
    count: agents.length
  };
}

module.exports = {
  compareAgents,
  latestAgentReport,
  listArchivedAgents,
  listAgentReports,
  reportBelongsToAgent
};
