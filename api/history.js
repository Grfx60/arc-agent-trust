const { sendJson, handleOptions } = require('./_response');
const { normalizeAgentId } = require('../src/agent-id');
const { listAgentReports } = require('../src/report-repository');
const config = require('../src/config');

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method Not Allowed' });
  const id = new URL(req.url, 'http://localhost').searchParams.get('id');
  const agentId = normalizeAgentId(id);
  if (!agentId) return sendJson(res, 400, { error: 'Invalid Agent ID' });
  return sendJson(res, 200, { agentId, reports: await listAgentReports(config.evidence.reportDir, agentId) });
};
