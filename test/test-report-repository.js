const assert = require('assert');
process.env.DATABASE_URL = 'postgresql://test.invalid/test';

const stored = [];
class FakePool {
  on() {}
  async query(sql, params = []) {
    if (sql.includes('CREATE TABLE')) return { rows: [] };
    if (sql.trim() === 'SELECT 1') return { rows: [{ '?column?': 1 }] };
    if (sql.includes('INSERT INTO agent_reports')) {
      const report = JSON.parse(params[3]);
      const existing = stored.find(row => row.agent_id === params[0] && row.report_version === params[1] && row.analyzed_at === params[2]);
      const row = { agent_id: params[0], report_version: params[1], analyzed_at: params[2], report };
      if (existing) Object.assign(existing, row); else stored.push(row);
      return { rows: [] };
    }
    if (sql.includes('WITH counts AS')) {
      const pattern = params[0].replaceAll('%', '');
      const groups = new Map();
      for (const row of stored.filter(item => item.agent_id.includes(pattern))) {
        if (!groups.has(row.agent_id)) groups.set(row.agent_id, []);
        groups.get(row.agent_id).push(row);
      }
      return { rows: [...groups].map(([agent_id, rows]) => {
        const latest = rows.sort((a, b) => b.analyzed_at.localeCompare(a.analyzed_at))[0];
        return { ...latest, report_count: rows.length };
      }) };
    }
    if (sql.includes('WHERE agent_id = $1')) {
      const rows = stored.filter(row => row.agent_id === params[0]).sort((a, b) => b.analyzed_at.localeCompare(a.analyzed_at)).slice(0, params[1]);
      return { rows };
    }
    throw new Error(`Unexpected SQL in test: ${sql}`);
  }
  async end() {}
}

require('pg').Pool = FakePool;
const repository = require('../src/report-repository');

(async () => {
  const first = {
    agentId: '007', schemaVersion: '1.1', analyzedAt: '2026-01-01T00:00:00.000Z', network: 'Arc Testnet',
    trust: { score: 80, riskScore: 20, confidence: 75, decision: 'TRUST' }
  };
  const second = { ...first, analyzedAt: '2026-01-02T00:00:00.000Z', trust: { ...first.trust, score: 85 } };
  await repository.saveReport(first);
  await repository.saveReport(second);
  assert.deepEqual(await repository.health(), { status: 'ok', store: 'postgresql' });
  const history = await repository.listAgentReports('reports', '7');
  assert.equal(history.length, 2);
  assert.equal(history[0].trustScore, 85);
  assert.equal((await repository.latestAgentReport('reports', '7')).decision, 'TRUST');
  assert.equal((await repository.compareAgents('reports', ['7', '8'])).count, 2);
  assert.equal((await repository.listArchivedAgents('reports'))[0].reportCount, 2);
  await repository.close();
  console.log('PostgreSQL repository contract assertions passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
