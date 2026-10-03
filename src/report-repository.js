const { isValidAgentId, normalizeAgentId } = require('./agent-id');
const fileHistory = require('./report-history');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
let pool;
let schemaReady;

function isConfigured() { return Boolean(databaseUrl); }

async function health() {
  if (!isConfigured()) return { status: 'ok', store: 'file' };
  try {
    await ensureSchema();
    await getPool().query('SELECT 1');
    return { status: 'ok', store: 'postgresql' };
  } catch {
    return { status: 'unavailable', store: 'postgresql' };
  }
}

function getPool() {
  if (!databaseUrl) throw new Error('DATABASE_URL or POSTGRES_URL is required for PostgreSQL report storage.');
  if (!pool) {
    const { Pool } = require('pg');
    const sslMode = String(process.env.DATABASE_SSL || 'require').toLowerCase();
    const ssl = sslMode === 'disable' ? false : {
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false'
    };
    pool = new Pool({
      connectionString: databaseUrl,
      ssl,
      max: Math.min(20, Math.max(1, Number.parseInt(process.env.DATABASE_POOL_MAX || (process.env.VERCEL ? '2' : '5'), 10) || 5)),
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 30000,
      allowExitOnIdle: true
    });
    pool.on('error', error => console.error('PostgreSQL pool error', { message: error.message }));
  }
  return pool;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS agent_reports (
        id BIGSERIAL PRIMARY KEY,
        agent_id VARCHAR(78) NOT NULL,
        report_version TEXT NOT NULL,
        analyzed_at TIMESTAMPTZ NOT NULL,
        report JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (agent_id, report_version, analyzed_at)
      );
      CREATE INDEX IF NOT EXISTS agent_reports_agent_time_idx
        ON agent_reports (agent_id, analyzed_at DESC);
    `).catch(error => { schemaReady = null; throw error; });
  }
  await schemaReady;
}

function reportVersion(report) {
  return String(report.schemaVersion || report.version || 'unknown').slice(0, 80);
}

async function saveReport(report) {
  const agentId = normalizeAgentId(report?.agentId);
  if (!agentId) throw new Error('Cannot persist a report with an invalid agentId.');
  if (!isConfigured()) return false;
  const analyzedAt = new Date(report.analyzedAt || report.timestamp || Date.now());
  if (Number.isNaN(analyzedAt.getTime())) throw new Error('Report timestamp is invalid.');
  await ensureSchema();
  await getPool().query(
    `INSERT INTO agent_reports (agent_id, report_version, analyzed_at, report)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (agent_id, report_version, analyzed_at)
     DO UPDATE SET report = EXCLUDED.report`,
    [agentId, reportVersion(report), analyzedAt.toISOString(), JSON.stringify(report)]
  );
  return true;
}

function summarize(agentId, report, version, analyzedAt) {
  const trust = report.trust || report.assessment || {};
  return {
    file: `agent-live-${agentId}-${version}.json`,
    analyzedAt: report.analyzedAt || report.timestamp || new Date(analyzedAt).toISOString(),
    decision: trust.decision || 'UNKNOWN',
    trustScore: trust.score ?? report.trustScore ?? null,
    riskScore: trust.riskScore ?? trust.risk?.observed ?? null,
    confidence: trust.confidence?.evidence ?? trust.confidence ?? null,
    network: report.network || null,
    name: report.metadata?.name || report.arcscan?.name || null
  };
}

async function listAgentReports(reportDir, agentId, limit = 20) {
  if (!isValidAgentId(agentId)) return [];
  const canonical = normalizeAgentId(agentId);
  if (!isConfigured()) return fileHistory.listAgentReports(reportDir, canonical, limit);
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT report_version, analyzed_at, report FROM agent_reports
     WHERE agent_id = $1 ORDER BY analyzed_at DESC LIMIT $2`,
    [canonical, Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20))]
  );
  return rows.map(row => summarize(canonical, row.report, row.report_version, row.analyzed_at));
}

async function latestAgentReport(reportDir, agentId) {
  const [latest] = await listAgentReports(reportDir, agentId, 1);
  return latest || null;
}

async function latestFullReport(reportDir, agentId) {
  if (!isValidAgentId(agentId)) return null;
  const canonical = normalizeAgentId(agentId);
  if (isConfigured()) {
    await ensureSchema();
    const { rows } = await getPool().query(
      `SELECT report FROM agent_reports WHERE agent_id = $1 ORDER BY analyzed_at DESC LIMIT 1`, [canonical]
    );
    return rows[0]?.report || null;
  }
  const summaries = fileHistory.listAgentReports(reportDir, canonical, 1);
  if (!summaries.length) return null;
  const filename = summaries[0].file;
  try { return JSON.parse(fs.readFileSync(path.join(reportDir, filename), 'utf8')); } catch { return null; }
}

async function compareAgents(reportDir, agentIds) {
  const ids = agentIds.map(normalizeAgentId).filter(Boolean).filter((id, index, all) => all.indexOf(id) === index).slice(0, 10);
  return { agents: await Promise.all(ids.map(async agentId => ({ agentId, latest: await latestAgentReport(reportDir, agentId) }))), count: ids.length };
}

async function listArchivedAgents(reportDir, query = '') {
  if (!isConfigured()) return fileHistory.listArchivedAgents(reportDir, query);
  await ensureSchema();
  const pattern = `%${String(query).trim().slice(0, 80)}%`;
  const { rows } = await getPool().query(`
    WITH counts AS (
      SELECT agent_id, COUNT(*)::int AS report_count FROM agent_reports
      WHERE agent_id LIKE $1 GROUP BY agent_id
    ), latest AS (
      SELECT DISTINCT ON (agent_id) agent_id, report_version, analyzed_at, report
      FROM agent_reports WHERE agent_id LIKE $1 ORDER BY agent_id, analyzed_at DESC
    )
    SELECT latest.agent_id, latest.report_version, latest.analyzed_at, latest.report, counts.report_count
    FROM latest JOIN counts USING (agent_id)
    ORDER BY latest.analyzed_at DESC LIMIT 2000`, [pattern]);
  return rows.map(row => {
    const latest = summarize(row.agent_id, row.report, row.report_version, row.analyzed_at);
    return { agentId: row.agent_id, name: latest.name || `Agent ${row.agent_id}`, latest, reportCount: row.report_count };
  });
}

async function close() {
  if (pool) { const current = pool; pool = null; schemaReady = null; await current.end(); }
}

module.exports = { close, compareAgents, health, isConfigured, latestAgentReport, latestFullReport, listAgentReports, listArchivedAgents, saveReport };
