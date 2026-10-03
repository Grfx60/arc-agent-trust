const path = require('path');
const { sendJson, handleOptions } = require('./_response');
const { normalizeAgentId } = require('../src/agent-id');
const { deriveReportGraph, loadGraph, loadReportDerivedGraph, summarizeGraph } = require('../src/graph-data');
const reportRepository = require('../src/report-repository');
const config = require('../src/config');

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method Not Allowed' });
  const id = new URL(req.url, 'http://localhost').searchParams.get('id');
  const agentId = normalizeAgentId(id);
  if (!agentId) return sendJson(res, 400, { error: 'Invalid Agent ID' });
  const graph = loadGraph(path.resolve(__dirname, '..'), agentId)
    || loadReportDerivedGraph(config.evidence.reportDir, agentId)
    || deriveReportGraph(await reportRepository.latestFullReport(config.evidence.reportDir, agentId), agentId);
  const summary = summarizeGraph(graph);
  return summary ? sendJson(res, 200, summary) : sendJson(res, 404, { error: 'No graph data found for this agent.' });
};
