/** Public HTTP API for live Arc agent assessments. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const config = require('../config');
const logger = require('../logger')('live-api');
const CacheManager = require('../cache');
const { normalizeAgentId } = require('../agent-id');
const reportRepository = require('../report-repository');

const { port: PORT, host: HOST } = config.servers.liveApi;
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const ENGINE_PATH = path.join(PROJECT_ROOT, 'agent-trust-v66.js');
const REQUEST_LIMIT = 100;
const REQUEST_WINDOW_MS = 60_000;
const configuredConcurrency = Number.parseInt(process.env.MAX_CONCURRENT_ANALYSES || '2', 10);
const MAX_CONCURRENT_ANALYSES = Number.isInteger(configuredConcurrency) && configuredConcurrency > 0
  ? configuredConcurrency
  : 2;
const requestsByIp = new Map();
const inFlightAnalyses = new Map();
const analysisCache = new CacheManager({
  ttl: Number.parseInt(process.env.ANALYSIS_CACHE_TTL_MS || '300000', 10),
  useFileBackup: false
});
let activeAnalyses = 0;

function sendJson(res, status, body) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };
  if (process.env.CORS_ORIGIN) headers['Access-Control-Allow-Origin'] = process.env.CORS_ORIGIN;
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function clientIp(req) {
  return req.socket.remoteAddress || 'unknown';
}

function withinRateLimit(ip) {
  const now = Date.now();
  const recent = (requestsByIp.get(ip) || []).filter((time) => time > now - REQUEST_WINDOW_MS);
  recent.push(now);
  requestsByIp.set(ip, recent);
  if (requestsByIp.size > 10000) {
    for (const [key, times] of requestsByIp) {
      if (!times.some((time) => time > now - REQUEST_WINDOW_MS)) requestsByIp.delete(key);
      if (requestsByIp.size <= 9000) break;
    }
  }
  return recent.length <= REQUEST_LIMIT;
}

function runEngine(agentId) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [ENGINE_PATH, agentId], {
      cwd: PROJECT_ROOT,
      shell: false,
      windowsHide: true
    });
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Analysis timed out after 30 seconds'));
    }, 30_000);

    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => { clearTimeout(timeout); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) return reject(new Error(stderr.trim() || `Engine exited with code ${code}`));
      const reportPath = path.join(config.evidence.reportDir, `agent-live-${agentId}-v66.json`);
      try {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        reportRepository.saveReport(report).then(() => resolve(report), reject);
      } catch (error) {
        reject(new Error(`Analysis completed without a readable report: ${error.message}`));
      }
    });
  });
}

function analyzeWithControls(agentId) {
  const cached = analysisCache.get('analysis', agentId);
  if (cached) {
    return Promise.resolve({ report: cached, cacheHit: true });
  }

  if (inFlightAnalyses.has(agentId)) {
    return inFlightAnalyses.get(agentId).then((report) => ({ report, cacheHit: false, shared: true }));
  }

  if (activeAnalyses >= MAX_CONCURRENT_ANALYSES) {
    const error = new Error('Analysis capacity is temporarily unavailable.');
    error.code = 'ANALYSIS_CAPACITY';
    return Promise.reject(error);
  }

  activeAnalyses += 1;
  const analysis = runEngine(agentId)
    .then((report) => {
      analysisCache.set('analysis', agentId, report);
      return report;
    })
    .finally(() => {
      activeAnalyses -= 1;
      inFlightAnalyses.delete(agentId);
    });

  inFlightAnalyses.set(agentId, analysis);
  return analysis.then((report) => ({ report, cacheHit: false, shared: false }));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'OPTIONS') {
    const headers = {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (process.env.CORS_ORIGIN) headers['Access-Control-Allow-Origin'] = process.env.CORS_ORIGIN;
    res.writeHead(204, headers);
    return res.end();
  }
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method Not Allowed' });
  if (url.pathname === '/health') {
    const storage = await reportRepository.health();
    return sendJson(res, storage.status === 'ok' ? 200 : 503, {
      status: storage.status,
      engine: 'v66',
      network: config.blockchain.network,
      reportStore: storage.store,
      cacheEnabled: config.features.enableCache,
      maxConcurrentAnalyses: MAX_CONCURRENT_ANALYSES,
      uptime: process.uptime()
    });
  }
  if (url.pathname !== '/api/live-agent') return sendJson(res, 404, { error: 'Not Found' });

  const requestedId = url.searchParams.get('id');
  const agentId = normalizeAgentId(requestedId);
  if (!agentId) return sendJson(res, 400, { error: 'Invalid Agent ID' });
  if (!withinRateLimit(clientIp(req))) return sendJson(res, 429, { error: 'Rate limit exceeded. Try again in one minute.' });

  try {
    logger.info('Starting live analysis', { agentId });
    const result = await analyzeWithControls(agentId);
    logger.info('Live analysis complete', {
      agentId,
      decision: result.report.trust?.decision,
      cacheHit: result.cacheHit,
      shared: result.shared
    });
    return sendJson(res, 200, {
      ...result.report,
      analysisMeta: {
        cacheHit: result.cacheHit,
        shared: result.shared,
        activeAnalyses,
        maxConcurrentAnalyses: MAX_CONCURRENT_ANALYSES
      }
    });
  } catch (error) {
    logger.error('Live analysis failed', { agentId, error: error.message });
    if (error.code === 'ANALYSIS_CAPACITY') {
      return sendJson(res, 429, { error: error.message, retryAfter: 5 });
    }
    return sendJson(res, 502, { error: 'Live analysis failed.', code: error.name === 'TimeoutError' ? 'UPSTREAM_TIMEOUT' : 'ANALYSIS_FAILED' });
  }
});

server.listen(PORT, HOST, () => logger.info('Live API ready', { url: `http://${HOST}:${PORT}` }));
function shutdown() { server.close(() => reportRepository.close().finally(() => process.exit(0))); }
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
