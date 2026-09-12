/** Public HTTP API for live Arc agent assessments. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const config = require('../config');
const logger = require('../logger')('live-api');

const { port: PORT, host: HOST } = config.servers.liveApi;
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const ENGINE_PATH = path.join(PROJECT_ROOT, 'agent-trust-v66.js');
const REQUEST_LIMIT = 100;
const REQUEST_WINDOW_MS = 60_000;
const requestsByIp = new Map();

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*'
  });
  res.end(JSON.stringify(body));
}

function clientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
}

function withinRateLimit(ip) {
  const now = Date.now();
  const recent = (requestsByIp.get(ip) || []).filter((time) => time > now - REQUEST_WINDOW_MS);
  recent.push(now);
  requestsByIp.set(ip, recent);
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
        resolve(JSON.parse(fs.readFileSync(reportPath, 'utf8')));
      } catch (error) {
        reject(new Error(`Analysis completed without a readable report: ${error.message}`));
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method Not Allowed' });
  if (url.pathname === '/health') {
    return sendJson(res, 200, { status: 'ok', engine: 'v66', network: config.blockchain.network, uptime: process.uptime() });
  }
  if (url.pathname !== '/api/live-agent') return sendJson(res, 404, { error: 'Not Found' });

  const agentId = url.searchParams.get('id');
  if (!agentId || !/^\d+$/.test(agentId)) return sendJson(res, 400, { error: 'Invalid Agent ID' });
  if (!withinRateLimit(clientIp(req))) return sendJson(res, 429, { error: 'Rate limit exceeded. Try again in one minute.' });

  try {
    logger.info('Starting live analysis', { agentId });
    const report = await runEngine(agentId);
    logger.info('Live analysis complete', { agentId, decision: report.trust?.decision });
    return sendJson(res, 200, report);
  } catch (error) {
    logger.error('Live analysis failed', { agentId, error: error.message });
    return sendJson(res, 502, { error: 'Live analysis failed.', details: error.message });
  }
});

server.listen(PORT, HOST, () => logger.info('Live API ready', { url: `http://${HOST}:${PORT}` }));
function shutdown() { server.close(() => process.exit(0)); }
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
