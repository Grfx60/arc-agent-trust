const { sendJson, handleOptions } = require('./_response');
const { listArchivedAgents } = require('../src/report-repository');
const config = require('../src/config');

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method Not Allowed' });
  const query = new URL(req.url, 'http://localhost').searchParams.get('q') || '';
  if (query.length > 80) return sendJson(res, 400, { error: 'Search query is too long.' });
  const agents = await listArchivedAgents(config.evidence.reportDir, query);
  return sendJson(res, 200, { agents, count: agents.length });
};
