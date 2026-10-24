/** Public HTTP API for live Arc agent assessments. */
const http = require('http');
const path = require('path');
const config = require('../config');
const logger = require('../logger')('live-api');
const db     = require('../db');
const { dispatchAlerts, initScanner } = require('../engines/webhook-engine');
const { addToBlacklist, addToGreylist, removeFromBlacklist, listBlacklist } = require('../engines/blacklist-engine');
const { generateReportHTML } = require('../utils/pdf-report');

const { port: PORT, host: HOST } = config.servers.liveApi;
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const REQUEST_LIMIT      = 100;
const AGENT_ID_MAX_LENGTH = 15;
const REQUEST_WINDOW_MS  = 60_000;
const requestsByIp       = new Map();

// Motor doğrudan require ile yükleniyor — subprocess overhead yok
const { analyzeAgent } = require(path.join(PROJECT_ROOT, 'agent-trust-v66.js'));

// Watchlist scanner'ı başlat
initScanner(analyzeAgent);

// ── Analiz önbelleği (10 dakika TTL) ──
const CACHE_TTL_MS  = 10 * 60 * 1000;
const analysisCache = new Map();
function getCached(agentId) {
  const entry = analysisCache.get(agentId);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { analysisCache.delete(agentId); return null; }
  return entry.data;
}
function setCache(agentId, data) { analysisCache.set(agentId, { ts: Date.now(), data }); }

// ── Eş zamanlı istek kilidi ──
const pendingAnalyses = new Map();

// ── Rate limit ──
function clientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
}
function withinRateLimit(ip) {
  const now    = Date.now();
  const recent = (requestsByIp.get(ip) || []).filter(t => t > now - REQUEST_WINDOW_MS);
  recent.push(now);
  requestsByIp.set(ip, recent);
  return recent.length <= REQUEST_LIMIT;
}
setInterval(() => {
  const cutoff = Date.now() - REQUEST_WINDOW_MS;
  for (const [ip, times] of requestsByIp) {
    const fresh = times.filter(t => t > cutoff);
    if (fresh.length === 0) requestsByIp.delete(ip);
    else requestsByIp.set(ip, fresh);
  }
}, 5 * 60 * 1000).unref();

// ── Response helper ──
function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type':             'application/json; charset=utf-8',
    'Cache-Control':            'no-store',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'X-Content-Type-Options':  'nosniff',
    'X-Frame-Options':         'DENY',
    'X-XSS-Protection':        '1; mode=block',
    'Referrer-Policy':         'strict-origin-when-cross-origin'
  });
  res.end(JSON.stringify(body));
}

// ── Body parser ──
function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => resolve(body));
    req.on('error', () => resolve(''));
  });
}

// ── Route handler ──
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const method = req.method;

  // ── GET /health ──
  if (method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, {
      status: 'ok', engine: 'v66', network: config.blockchain.network,
      uptime: process.uptime(), dbEnabled: !!db.getDb()
    });
  }

  // ── GET /api/stats ──
  if (method === 'GET' && url.pathname === '/api/stats') {
    return sendJson(res, 200, { ...db.getStats(), uptime: process.uptime() });
  }

  // ── GET /api/history/all ──
  if (method === 'GET' && url.pathname === '/api/history/all') {
    const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 500);
    return sendJson(res, 200, { analyses: db.getAllHistorySummary(limit) });
  }

  // ── GET /api/history?id= ──
  if (method === 'GET' && url.pathname === '/api/history') {
    const agentId = url.searchParams.get('id');
    if (!agentId || !/^\d+$/.test(agentId)) return sendJson(res, 400, { error: 'Invalid Agent ID' });
    const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 500);
    return sendJson(res, 200, { agentId, history: db.getHistory(agentId, limit) });
  }

  // ── Watchlist ──
  if (url.pathname === '/api/watchlist') {
    if (method === 'GET')    return sendJson(res, 200, { watchlist: db.getWatchlist() });
    if (method === 'POST') {
      const raw = await readBody(req);
      try {
        const { agentId, label, threshold, interval } = JSON.parse(raw || '{}');
        if (!agentId || !/^\d+$/.test(String(agentId))) return sendJson(res, 400, { error: 'Invalid agentId' });
        db.addToWatchlist(String(agentId), label || '', Number(threshold) || 70, Number(interval) || 3600);
        return sendJson(res, 200, { ok: true, agentId });
      } catch { return sendJson(res, 400, { error: 'Invalid JSON body' }); }
    }
    if (method === 'DELETE') {
      const raw = await readBody(req);
      try {
        const { agentId } = JSON.parse(raw || '{}');
        if (!agentId) return sendJson(res, 400, { error: 'agentId required' });
        db.removeFromWatchlist(String(agentId));
        return sendJson(res, 200, { ok: true });
      } catch { return sendJson(res, 400, { error: 'Invalid JSON body' }); }
    }
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  // ── Webhooks ──
  if (url.pathname === '/api/webhooks') {
    if (method === 'GET')    return sendJson(res, 200, { webhooks: db.getWebhooks() });
    if (method === 'POST') {
      const raw = await readBody(req);
      try {
        const { url: whUrl, label, events, secret } = JSON.parse(raw || '{}');
        if (!whUrl) return sendJson(res, 400, { error: 'url required' });
        const id = db.addWebhook(whUrl, label || '', events || 'HIGH_RISK,REVIEW', secret || '');
        return sendJson(res, 200, { ok: true, id });
      } catch { return sendJson(res, 400, { error: 'Invalid JSON body' }); }
    }
    if (method === 'DELETE') {
      const raw = await readBody(req);
      try {
        const { id } = JSON.parse(raw || '{}');
        if (!id) return sendJson(res, 400, { error: 'id required' });
        db.removeWebhook(id);
        return sendJson(res, 200, { ok: true });
      } catch { return sendJson(res, 400, { error: 'Invalid JSON body' }); }
    }
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  // ── Webhook test: POST /api/webhooks/test { id } ──
  if (method === 'POST' && url.pathname === '/api/webhooks/test') {
    const raw = await readBody(req);
    try {
      const { id } = JSON.parse(raw || '{}');
      if (!id) return sendJson(res, 400, { error: 'id required' });
      const webhooks = db.getWebhooks();
      const wh = webhooks.find(w => w.id === id || w.id === Number(id));
      if (!wh) return sendJson(res, 404, { error: 'Webhook not found' });
      // Test payload — gerçek bir analiz simülasyonu
      const testReport = {
        agentId: 'TEST', network: config.blockchain.network,
        analyzedAt: new Date().toISOString(),
        trust: { decision: 'REVIEW', score: 75, riskScore: 25, confidence: 60 },
        metrics: { negativeSignals: 0, positiveSignals: 3 }
      };
      const { dispatchAlerts } = require('../engines/webhook-engine');
      // Sadece bu webhook'a gönder
      const { postWebhook: _pw } = require('../engines/webhook-engine');
      // dispatchAlerts tüm webhooklara gönderir; burada tek webhook'a gönderiyoruz
      const { buildTestPayload } = (() => {
        const decision = testReport.trust.decision;
        const score    = testReport.trust.score;
        const color    = decision === 'TRUST' ? '#4ade80' : decision === 'HIGH_RISK' ? '#f87171' : '#facc15';
        let payload;
        if (wh.url.includes('hooks.slack.com')) {
          payload = { text: ':test_tube: Arc Agent Trust — Test Webhook', attachments: [{ color, title: `Test Agent — ${decision}`, fields: [{ title: 'Trust Score', value: `${score}/100`, short: true }, { title: 'Network', value: testReport.network, short: true }], footer: 'Arc Agent Trust Test' }] };
        } else if (wh.url.includes('discord.com')) {
          payload = { embeds: [{ title: `Test Agent — ${decision}`, color: decision === 'TRUST' ? 0x4ade80 : decision === 'HIGH_RISK' ? 0xf87171 : 0xfacc15, fields: [{ name: 'Trust Score', value: `${score}/100`, inline: true }], timestamp: testReport.analyzedAt, footer: { text: 'Arc Agent Trust Test' } }] };
        } else {
          payload = { event: 'TEST', agentId: 'TEST', decision, trustScore: score, network: testReport.network, analyzedAt: testReport.analyzedAt };
        }
        return { buildTestPayload: () => payload };
      })();
      const crypto = require('crypto');
      const body = JSON.stringify(buildTestPayload());
      const https = require('https'); const http = require('http');
      const result = await new Promise(resolve => {
        try {
          const parsed = new URL(wh.url);
          const lib = parsed.protocol === 'https:' ? https : http;
          const headers = { 'Content-Type': 'application/json', 'User-Agent': 'ArcAgentTrust-Webhook/1.0', 'X-Event-Source': 'arc-agent-trust-test' };
          if (wh.secret) headers['X-Webhook-Signature'] = 'sha256=' + crypto.createHmac('sha256', wh.secret).update(body).digest('hex');
          const r = lib.request({ hostname: parsed.hostname, port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80), path: parsed.pathname + parsed.search, method: 'POST', headers, timeout: 8000 }, (res2) => { res2.resume(); resolve({ ok: res2.statusCode >= 200 && res2.statusCode < 300, status: res2.statusCode }); });
          r.on('error', () => resolve({ ok: false, status: 0 }));
          r.on('timeout', () => { r.destroy(); resolve({ ok: false, status: 0 }); });
          r.write(body); r.end();
        } catch { resolve({ ok: false, status: 0 }); }
      });
      return sendJson(res, 200, { ok: result.ok, status: result.status });
    } catch { return sendJson(res, 400, { error: 'Invalid JSON body' }); }
  }

  // ── Kara liste yönetimi ──
  if (url.pathname === '/api/blacklist') {
    if (method === 'GET') return sendJson(res, 200, listBlacklist());
    if (method === 'POST') {
      const raw = await readBody(req);
      try {
        const body = JSON.parse(raw || '{}');
        const { type, address, agentId, reason } = body;
        if (type === 'greylist') { addToGreylist({ address, agentId }); return sendJson(res, 200, { ok: true, list: 'greylist' }); }
        addToBlacklist({ address, agentId, reason }); return sendJson(res, 200, { ok: true, list: 'blacklist' });
      } catch { return sendJson(res, 400, { error: 'Invalid JSON body' }); }
    }
    if (method === 'DELETE') {
      const raw = await readBody(req);
      try {
        const { address, agentId } = JSON.parse(raw || '{}');
        removeFromBlacklist({ address, agentId }); return sendJson(res, 200, { ok: true });
      } catch { return sendJson(res, 400, { error: 'Invalid JSON body' }); }
    }
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  // ── PDF rapor: GET /api/report/:agentId/pdf ──
  const pdfMatch = url.pathname.match(/^\/api\/report\/(\d{1,15})\/pdf$/);
  if (method === 'GET' && pdfMatch) {
    const agentId = pdfMatch[1];
    // Önce önbellekte ara
    const cached = getCached(agentId);
    if (cached) {
      const html = generateReportHTML(cached);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(html);
    }
    // DB'den son analizi al
    try {
      const history = db.getHistory(agentId, 1);
      if (history?.length) {
        const report = JSON.parse(history[0].report_json || '{}');
        const html   = generateReportHTML(report);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(html);
      }
    } catch { /* fall through */ }
    return sendJson(res, 404, { error: 'No report found for this agent. Run a live analysis first.' });
  }

  // ── Alert history ──
  if (method === 'GET' && url.pathname === '/api/alerts') {
    const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 500);
    return sendJson(res, 200, { alerts: db.getAlertHistory(limit) });
  }

  // ── Batch analiz: POST /api/batch { ids: ["1","2",...] } ──
  if (method === 'POST' && url.pathname === '/api/batch') {
    const raw = await readBody(req);
    try {
      const { ids, skipCache } = JSON.parse(raw || '{}');
      if (!Array.isArray(ids) || ids.length === 0) return sendJson(res, 400, { error: 'ids array required' });
      if (ids.length > 10) return sendJson(res, 400, { error: 'Max 10 IDs per batch' });
      const invalid = ids.find(id => !/^\d+$/.test(String(id)) || String(id).length > 15);
      if (invalid) return sendJson(res, 400, { error: `Invalid agent ID: ${invalid}` });

      const results = await Promise.allSettled(
        ids.map(async id => {
          const agentId = String(id);
          if (!skipCache) {
            const cached = getCached(agentId);
            if (cached) return { agentId, ...cached, _cached: true };
          }
          const report = await analyzeAgent(agentId);
          setCache(agentId, report);
          return report;
        })
      );

      const batch = results.map((r, i) => r.status === 'fulfilled'
        ? r.value
        : { agentId: String(ids[i]), error: r.reason?.message || 'Analysis failed' });

      return sendJson(res, 200, { batch, count: batch.length, timestamp: new Date().toISOString() });
    } catch { return sendJson(res, 400, { error: 'Invalid JSON body' }); }
  }

  // ── Live agent analysis ──
  if (url.pathname === '/api/live-agent') {
    if (method !== 'GET') return sendJson(res, 405, { error: 'Method Not Allowed' });

    const agentId = url.searchParams.get('id');
    if (!agentId || !/^\d+$/.test(agentId) || agentId.length > AGENT_ID_MAX_LENGTH) {
      return sendJson(res, 400, { error: 'Invalid Agent ID. Must be a number with at most 15 digits.' });
    }
    if (!withinRateLimit(clientIp(req))) return sendJson(res, 429, { error: 'Rate limit exceeded. Try again in one minute.' });

    const cached = getCached(agentId);
    if (cached) {
      logger.info('Cache hit', { agentId });
      return sendJson(res, 200, { ...cached, _cached: true });
    }

    if (pendingAnalyses.has(agentId)) {
      logger.info('Joining pending analysis', { agentId });
      try {
        const report = await pendingAnalyses.get(agentId);
        return sendJson(res, 200, { ...report, _joined: true });
      } catch (error) {
        return sendJson(res, 502, { error: 'Analiz başarısız oldu.', details: error.message });
      }
    }

    const promise = analyzeAgent(agentId).then(r => { setCache(agentId, r); return r; });
    pendingAnalyses.set(agentId, promise);

    try {
      logger.info('Starting live analysis', { agentId });
      const report = await promise;
      logger.info('Live analysis complete', { agentId, decision: report.trust?.decision, durationMs: report.analysisDurationMs });
      dispatchAlerts(report).catch(e => logger.error('Webhook dispatch error', { error: e.message }));
      return sendJson(res, 200, report);
    } catch (error) {
      logger.error('Live analysis failed', { agentId, error: error.message });
      return sendJson(res, 502, { error: 'Analiz başarısız oldu. Lütfen birkaç saniye bekleyip tekrar deneyin.', details: error.message });
    } finally {
      pendingAnalyses.delete(agentId);
    }
  }

  return sendJson(res, 404, { error: 'Not Found' });
});

server.listen(PORT, HOST, () => logger.info('Live API ready', { url: `http://${HOST}:${PORT}` }));
function shutdown() { server.close(() => process.exit(0)); }
process.once('SIGINT',  shutdown);
process.once('SIGTERM', shutdown);
