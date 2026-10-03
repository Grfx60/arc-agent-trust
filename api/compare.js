const { sendJson, handleOptions } = require('./_response');
const { normalizeAgentId } = require('../src/agent-id');
const { compareAgents } = require('../src/report-repository');
const config = require('../src/config');

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method Not Allowed' });
  const ids = (new URL(req.url, 'http://localhost').searchParams.get('ids') || '').split(',').filter(Boolean);
  const normalizedIds = ids.map(normalizeAgentId);
  if (ids.length < 2 || ids.length > 10 || normalizedIds.some(id => !id)) {
    return sendJson(res, 400, { error: 'Provide two to ten valid numeric agent IDs.' });
  }
  return sendJson(res, 200, await compareAgents(config.evidence.reportDir, normalizedIds));
};
