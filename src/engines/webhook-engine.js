/**
 * Arc Agent Trust — Webhook / Alert Motoru
 *
 * Analiz tamamlandığında webhooklara HTTP POST atar.
 * Watchlist agent'larını periyodik olarak tarar.
 */

const http  = require('http');
const https = require('https');
const crypto = require('crypto');
const { getWebhooks, saveAlert, getWatchlist, updateWatchlistStatus } = require('../db');
const logger = require('../logger')('webhook-engine');

/* ── SIGNATURE ── */

function hmacSignature(secret, body) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

/* ── HTTP POST ── */

async function postWebhook(url, payload, secret) {
  return new Promise((resolve) => {
    try {
      const body    = JSON.stringify(payload);
      const parsed  = new URL(url);
      const lib     = parsed.protocol === 'https:' ? https : http;
      const headers = {
        'Content-Type':   'application/json',
        'User-Agent':     'ArcAgentTrust-Webhook/1.0',
        'X-Event-Source': 'arc-agent-trust'
      };
      if (secret) headers['X-Webhook-Signature'] = hmacSignature(secret, body);
      const req = lib.request({
        hostname: parsed.hostname,
        port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path:     parsed.pathname + parsed.search,
        method:   'POST',
        headers,
        timeout:  8000
      }, (res) => {
        res.resume(); // drain
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode });
      });
      req.on('error',   () => resolve({ ok: false, status: 0 }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0 }); });
      req.write(body);
      req.end();
    } catch {
      resolve({ ok: false, status: 0 });
    }
  });
}

/* ── PAYLOAD FORMATTERS (Slack / Discord / Generic) ── */

function buildSlackPayload(report) {
  const decision = report.trust?.decision || 'UNKNOWN';
  const score    = report.trust?.score ?? '?';
  const emoji    = decision === 'TRUST' ? ':white_check_mark:' : decision === 'HIGH_RISK' ? ':red_circle:' : ':large_yellow_circle:';
  const color    = decision === 'TRUST' ? '#4ade80' : decision === 'HIGH_RISK' ? '#f87171' : '#facc15';
  return {
    text: `${emoji} Arc Agent Trust Alert`,
    attachments: [{
      color,
      title: `Agent #${report.agentId} — ${decision}`,
      fields: [
        { title: 'Trust Score', value: `${score}/100`, short: true },
        { title: 'Risk Score',  value: `${report.trust?.riskScore ?? '?'}/100`, short: true },
        { title: 'Confidence',  value: `${report.trust?.confidence ?? '?'}/100`, short: true },
        { title: 'Network',     value: report.network || 'Arc Testnet', short: true },
        { title: 'Negative Signals', value: String(report.metrics?.negativeSignals ?? 0), short: true },
        { title: 'Analyzed At', value: report.analyzedAt, short: false },
      ],
      footer: 'Arc Agent Trust',
      ts: Math.floor(Date.now() / 1000)
    }]
  };
}

function buildDiscordPayload(report) {
  const decision = report.trust?.decision || 'UNKNOWN';
  const score    = report.trust?.score ?? '?';
  const color    = decision === 'TRUST' ? 0x4ade80 : decision === 'HIGH_RISK' ? 0xf87171 : 0xfacc15;
  return {
    embeds: [{
      title: `Agent #${report.agentId} — ${decision}`,
      color,
      fields: [
        { name: 'Trust Score',  value: `${score}/100`, inline: true },
        { name: 'Risk Score',   value: `${report.trust?.riskScore ?? '?'}/100`, inline: true },
        { name: 'Confidence',   value: `${report.trust?.confidence ?? '?'}/100`, inline: true },
        { name: 'Network',      value: report.network || 'Arc Testnet', inline: true },
        { name: 'Neg. Signals', value: String(report.metrics?.negativeSignals ?? 0), inline: true },
      ],
      timestamp: report.analyzedAt,
      footer: { text: 'Arc Agent Trust' }
    }]
  };
}

function buildPayload(report, webhookUrl) {
  const url = String(webhookUrl || '');
  // Slack: hooks.slack.com
  if (url.includes('hooks.slack.com'))   return buildSlackPayload(report);
  // Discord: discord.com/api/webhooks
  if (url.includes('discord.com'))       return buildDiscordPayload(report);
  // Generic JSON
  const decision = report.trust?.decision;
  return {
    event:      'ANALYSIS_COMPLETE',
    agentId:    report.agentId,
    decision,
    trustScore: report.trust?.score,
    riskScore:  report.trust?.riskScore,
    confidence: report.trust?.confidence,
    negativeSignals: report.metrics?.negativeSignals,
    analyzedAt: report.analyzedAt,
    network:    report.network
  };
}

/* ── DISPATCH ── */

async function dispatchAlerts(report) {
  const webhooks = getWebhooks();
  if (!webhooks.length) return;

  const decision = report.trust?.decision;

  for (const wh of webhooks) {
    const events = (wh.events || '').split(',').map(e => e.trim());
    if (!events.includes(decision) && !events.includes('ALL')) continue;

    const payload = buildPayload(report, wh.url);
    const result  = await postWebhook(wh.url, payload, wh.secret);
    saveAlert({
      agentId:    report.agentId,
      webhookId:  wh.id,
      eventType:  decision,
      trustScore: report.trust?.score,
      decision,
      payload,
      status:     result.ok ? 'sent' : 'failed'
    });
    logger.info('Webhook dispatched', { url: wh.url, decision, ok: result.ok });
  }
}

/* ── WATCHLIST SCANNER ── */

let scannerTimer = null;
let analyzeAgentFn = null;

function initScanner(analyzeAgent) {
  analyzeAgentFn = analyzeAgent;
  if (scannerTimer) clearInterval(scannerTimer);
  // Her 5 dakikada bir due olan watchlist agent'larını tara
  scannerTimer = setInterval(runScheduledScans, 5 * 60 * 1000);
  scannerTimer.unref();
  logger.info('Watchlist scanner started (5-min tick)');
}

async function runScheduledScans() {
  if (!analyzeAgentFn) return;
  const items = getWatchlist();
  const now   = Date.now();

  for (const item of items) {
    const lastMs = item.last_checked_at ? new Date(item.last_checked_at).getTime() : 0;
    const dueMs  = lastMs + (item.check_interval * 1000);
    if (now < dueMs) continue;

    logger.info('Scheduled scan', { agentId: item.agent_id });
    try {
      const report = await analyzeAgentFn(item.agent_id);
      updateWatchlistStatus(item.agent_id, report.trust?.score, report.trust?.decision);

      // Eşik aşıldıysa alert gönder
      const score = report.trust?.score ?? 100;
      if (score < item.alert_threshold) {
        await dispatchAlerts(report);
      }
    } catch (err) {
      logger.error('Scheduled scan failed', { agentId: item.agent_id, error: err.message });
    }
  }
}

function stopScanner() {
  if (scannerTimer) { clearInterval(scannerTimer); scannerTimer = null; }
}

module.exports = { dispatchAlerts, initScanner, stopScanner, runScheduledScans };
