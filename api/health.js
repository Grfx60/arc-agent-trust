const { sendJson, handleOptions } = require('./_response');
const reportRepository = require('../src/report-repository');

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method Not Allowed' });
  const storage = await reportRepository.health();
  return sendJson(res, storage.status === 'ok' ? 200 : 503, {
    status: storage.status === 'ok' ? 'ok' : 'degraded',
    runtime: 'vercel-nodejs',
    network: process.env.BLOCKCHAIN_NETWORK || 'Arc Testnet',
    reportStore: storage.store
  });
};
