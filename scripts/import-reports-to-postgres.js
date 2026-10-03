const fs = require('fs');
const path = require('path');
const repository = require('../src/report-repository');
const { isValidAgentId } = require('../src/agent-id');

async function main() {
  if (!repository.isConfigured()) throw new Error('Set DATABASE_URL or POSTGRES_URL before importing reports.');
  const reportDir = path.resolve(process.env.REPORT_DIR || 'reports');
  if (!fs.existsSync(reportDir)) throw new Error(`Report directory does not exist: ${reportDir}`);
  const files = fs.readdirSync(reportDir).filter(name => /^agent-(?:live-|trust-)?\d+(?:-v\d+)?\.json$/.test(name));
  let imported = 0;
  let skipped = 0;
  for (const filename of files) {
    try {
      const report = JSON.parse(fs.readFileSync(path.join(reportDir, filename), 'utf8'));
      const fromName = filename.match(/^agent-(?:live-|trust-)?(\d+)/)?.[1];
      const agentId = String(report.agentId || fromName || '');
      if (!isValidAgentId(agentId)) { skipped += 1; continue; }
      const stat = fs.statSync(path.join(reportDir, filename));
      const normalized = {
        ...report,
        agentId: String(BigInt(agentId)),
        analyzedAt: report.analyzedAt || report.timestamp || stat.mtime.toISOString()
      };
      await repository.saveReport(normalized);
      imported += 1;
    } catch (error) {
      skipped += 1;
      process.stderr.write(`Skipped ${filename}: ${error.message}\n`);
    }
  }
  process.stdout.write(`PostgreSQL import complete. Imported ${imported}; skipped ${skipped}.\n`);
  await repository.close();
}

main().catch(async error => {
  process.stderr.write(`${error.message}\n`);
  await repository.close().catch(() => {});
  process.exitCode = 1;
});
