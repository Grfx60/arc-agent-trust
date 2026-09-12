const { analyzeAgent } = require('../agent-trust-v66');
const { sendJson, handleOptions } = require('./_response');

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method Not Allowed' });

  const requestUrl = new URL(req.url, 'http://localhost');
  const agentId = requestUrl.searchParams.get('id');
  if (!agentId || !/^\d+$/.test(agentId)) {
    return sendJson(res, 400, { error: 'Invalid Agent ID' });
  }

  try {
    const report = await analyzeAgent(agentId);
    return sendJson(res, 200, report);
  } catch (error) {
    console.error('Live analysis failed', { agentId, error: error.message });
    return sendJson(res, 502, { error: 'Live analysis failed.', details: error.message });
  }
};
