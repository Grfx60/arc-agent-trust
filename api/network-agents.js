const { sendJson, handleOptions } = require('./_response');
const config = require('../src/config');
const { listCatalog, loadState, scanNextChunk } = require('../src/network-catalog');

const cacheDir = process.env.VERCEL ? '/tmp/arc-agent-trust-cache' : config.evidence.cacheDir;

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method Not Allowed' });
  try {
    const url = new URL(req.url, 'http://localhost');
    const state = url.searchParams.get('refresh') === '1' ? await scanNextChunk(cacheDir) : loadState(cacheDir);
    return sendJson(res, 200, {
      source: 'ARC_IDENTITY_REGISTRY', registry: config.blockchain.contracts.identityRegistry,
      ...listCatalog(state, url.searchParams.get('page'), url.searchParams.get('limit'))
    });
  } catch (error) {
    return sendJson(res, 502, { error: 'Network agent catalog unavailable.', code: 'CATALOG_UNAVAILABLE' });
  }
};
