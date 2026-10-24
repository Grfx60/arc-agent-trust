/**
 * Arc Agent Trust — Kalıcı SQLite Veritabanı
 *
 * Tablolar:
 *   analyses  — her analiz sonucu (agentId, timestamp, skor, karar, raw JSON)
 *   watchlist — izlenen agentlar ve uyarı eşikleri
 *   webhooks  — alert hedefleri (URL, event filtresi)
 *   alerts    — gönderilen alert geçmişi
 */

const path = require('path');
const fs   = require('fs');

const DB_DIR  = process.env.DB_DIR || path.join(process.cwd(), '.db');
const DB_PATH = path.join(DB_DIR, 'trust.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

// better-sqlite3 yoksa graceful degradasyon
let Database;
try {
  Database = require('better-sqlite3');
} catch {
  console.warn('[db] better-sqlite3 yüklenemedi — veritabanı devre dışı (in-memory fallback)');
  Database = null;
}

let db = null;

function getDb() {
  if (db) return db;
  if (!Database) return null;
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id    TEXT    NOT NULL,
      analyzed_at TEXT    NOT NULL,
      trust_score INTEGER NOT NULL,
      risk_score  INTEGER NOT NULL,
      confidence  INTEGER NOT NULL,
      decision    TEXT    NOT NULL,
      duration_ms INTEGER,
      report_json TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_analyses_agent ON analyses(agent_id);
    CREATE INDEX IF NOT EXISTS idx_analyses_time  ON analyses(analyzed_at);

    CREATE TABLE IF NOT EXISTS watchlist (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id        TEXT    NOT NULL UNIQUE,
      label           TEXT,
      alert_threshold INTEGER NOT NULL DEFAULT 70,
      check_interval  INTEGER NOT NULL DEFAULT 3600,
      last_checked_at TEXT,
      last_score      INTEGER,
      last_decision   TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      active          INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS webhooks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      url        TEXT    NOT NULL UNIQUE,
      label      TEXT,
      events     TEXT    NOT NULL DEFAULT 'HIGH_RISK,REVIEW',
      secret     TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      active     INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id    TEXT    NOT NULL,
      webhook_id  INTEGER REFERENCES webhooks(id),
      event_type  TEXT    NOT NULL,
      trust_score INTEGER,
      decision    TEXT,
      payload     TEXT,
      sent_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      status      TEXT    NOT NULL DEFAULT 'pending'
    );
  `);
}

/* ── ANALYSES ── */

function saveAnalysis(report) {
  const db = getDb();
  if (!db) return null;
  const stmt = db.prepare(`
    INSERT INTO analyses (agent_id, analyzed_at, trust_score, risk_score, confidence, decision, duration_ms, report_json)
    VALUES (@agentId, @analyzedAt, @trustScore, @riskScore, @confidence, @decision, @durationMs, @reportJson)
  `);
  const info = stmt.run({
    agentId:    report.agentId,
    analyzedAt: report.analyzedAt,
    trustScore: report.trust?.score ?? 0,
    riskScore:  report.trust?.riskScore ?? 100,
    confidence: report.trust?.confidence ?? 0,
    decision:   report.trust?.decision ?? 'UNKNOWN',
    durationMs: report.analysisDurationMs ?? null,
    reportJson: JSON.stringify(report)
  });
  return info.lastInsertRowid;
}

function getHistory(agentId, limit = 50) {
  const db = getDb();
  if (!db) return [];
  return db.prepare(`
    SELECT id, agent_id, analyzed_at, trust_score, risk_score, confidence, decision, duration_ms
    FROM analyses
    WHERE agent_id = ?
    ORDER BY analyzed_at DESC
    LIMIT ?
  `).all(agentId, limit);
}

function getAllHistorySummary(limit = 200) {
  const db = getDb();
  if (!db) return [];
  return db.prepare(`
    SELECT id, agent_id, analyzed_at, trust_score, risk_score, confidence, decision, duration_ms
    FROM analyses
    ORDER BY analyzed_at DESC
    LIMIT ?
  `).all(limit);
}

function getLatestAnalysis(agentId) {
  const db = getDb();
  if (!db) return null;
  const row = db.prepare(`
    SELECT report_json FROM analyses
    WHERE agent_id = ? ORDER BY analyzed_at DESC LIMIT 1
  `).get(agentId);
  return row ? JSON.parse(row.report_json) : null;
}

function getAnalysisById(id) {
  const db = getDb();
  if (!db) return null;
  const row = db.prepare('SELECT report_json FROM analyses WHERE id = ?').get(id);
  return row ? JSON.parse(row.report_json) : null;
}

/* ── WATCHLIST ── */

function addToWatchlist(agentId, label = '', threshold = 70, interval = 3600) {
  const db = getDb();
  if (!db) return null;
  const stmt = db.prepare(`
    INSERT INTO watchlist (agent_id, label, alert_threshold, check_interval)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(agent_id) DO UPDATE SET active=1, label=excluded.label,
      alert_threshold=excluded.alert_threshold, check_interval=excluded.check_interval
  `);
  return stmt.run(agentId, label, threshold, interval).lastInsertRowid;
}

function removeFromWatchlist(agentId) {
  const db = getDb();
  if (!db) return;
  db.prepare('UPDATE watchlist SET active=0 WHERE agent_id=?').run(agentId);
}

function getWatchlist() {
  const db = getDb();
  if (!db) return [];
  return db.prepare('SELECT * FROM watchlist WHERE active=1 ORDER BY created_at DESC').all();
}

function updateWatchlistStatus(agentId, score, decision) {
  const db = getDb();
  if (!db) return;
  db.prepare(`
    UPDATE watchlist SET last_checked_at=datetime('now'), last_score=?, last_decision=?
    WHERE agent_id=?
  `).run(score, decision, agentId);
}

/* ── WEBHOOKS ── */

function addWebhook(url, label = '', events = 'HIGH_RISK,REVIEW', secret = '') {
  const db = getDb();
  if (!db) return null;
  const stmt = db.prepare(`
    INSERT INTO webhooks (url, label, events, secret)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(url) DO UPDATE SET active=1, label=excluded.label,
      events=excluded.events, secret=excluded.secret
  `);
  return stmt.run(url, label, events, secret).lastInsertRowid;
}

function removeWebhook(id) {
  const db = getDb();
  if (!db) return;
  db.prepare('UPDATE webhooks SET active=0 WHERE id=?').run(id);
}

function getWebhooks() {
  const db = getDb();
  if (!db) return [];
  return db.prepare('SELECT * FROM webhooks WHERE active=1').all();
}

/* ── ALERTS ── */

function saveAlert({ agentId, webhookId, eventType, trustScore, decision, payload, status }) {
  const db = getDb();
  if (!db) return;
  db.prepare(`
    INSERT INTO alerts (agent_id, webhook_id, event_type, trust_score, decision, payload, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(agentId, webhookId ?? null, eventType, trustScore ?? null, decision ?? null,
         payload ? JSON.stringify(payload) : null, status ?? 'sent');
}

function getAlertHistory(limit = 100) {
  const db = getDb();
  if (!db) return [];
  return db.prepare(`
    SELECT a.*, w.url as webhook_url, w.label as webhook_label
    FROM alerts a LEFT JOIN webhooks w ON a.webhook_id = w.id
    ORDER BY a.sent_at DESC LIMIT ?
  `).all(limit);
}

/* ── STATS ── */

function getStats() {
  const db = getDb();
  if (!db) return { totalAnalyses: 0, uniqueAgents: 0, avgTrustScore: 0, decisions: {} };
  const total     = db.prepare('SELECT COUNT(*) as c FROM analyses').get().c;
  const unique    = db.prepare('SELECT COUNT(DISTINCT agent_id) as c FROM analyses').get().c;
  const avgScore  = db.prepare('SELECT AVG(trust_score) as a FROM analyses').get().a;
  const decisions = db.prepare(`
    SELECT decision, COUNT(*) as cnt FROM analyses GROUP BY decision
  `).all().reduce((acc, r) => { acc[r.decision] = r.cnt; return acc; }, {});
  const watchCount = db.prepare('SELECT COUNT(*) as c FROM watchlist WHERE active=1').get().c;
  return {
    totalAnalyses: total,
    uniqueAgents:  unique,
    avgTrustScore: Math.round(avgScore ?? 0),
    decisions,
    watchlistCount: watchCount
  };
}

module.exports = {
  getDb,
  saveAnalysis,
  getHistory,
  getAllHistorySummary,
  getLatestAnalysis,
  getAnalysisById,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  updateWatchlistStatus,
  addWebhook,
  removeWebhook,
  getWebhooks,
  saveAlert,
  getAlertHistory,
  getStats
};
