const { sendJson, handleOptions } = require('./_response');

module.exports = (req, res) => {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method Not Allowed' });
  return sendJson(res, 200, {
    status: 'ok',
    runtime: 'vercel-nodejs',
    network: process.env.BLOCKCHAIN_NETWORK || 'Arc Testnet'
  });
};
