const assert = require('assert');
const fs = require('fs');
const path = require('path');

const reportsDir = path.join(__dirname, '.tmp-reports');
process.env.REPORT_DIR = reportsDir;
process.env.ARC_SCAN_API = 'https://localhost';
process.env.ARC_RPC_URL = 'https://rpc.testnet.arc.network';
fs.rmSync(reportsDir, { recursive: true, force: true });

const originalFetch = global.fetch;
const originalLog = console.log;
global.fetch = async (_url, options = {}) => {
  await new Promise(resolve => setTimeout(resolve, Math.random() * 15));
  const call = JSON.parse(options.body || '{}');
  const isOwner = String(call.params?.[0]?.data || '').startsWith('0x6352211e');
  const result = isOwner ? `0x${'0'.repeat(24)}${'1234567890abcdef1234567890abcdef12345678'}` : '0x';
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: call.id, result }), {
    status: 200, headers: { 'content-type': 'application/json' }
  });
};
console.log = () => {};

(async () => {
  try {
    const { analyzeAgent } = require('../agent-trust-v66');
    const [first, second] = await Promise.all([analyzeAgent('101'), analyzeAgent('202')]);
    assert.equal(first.agentId, '101');
    assert.equal(second.agentId, '202');
    assert.equal(JSON.parse(fs.readFileSync(path.join(reportsDir, 'agent-live-101-v66.json'))).agentId, '101');
    assert.equal(JSON.parse(fs.readFileSync(path.join(reportsDir, 'agent-live-202-v66.json'))).agentId, '202');
    assert.equal(first.policy.scoringAlgorithm, 'known-weight-ratio-v1');
    originalLog('Concurrent analysis isolation assertions passed.');
  } finally {
    global.fetch = originalFetch;
    console.log = originalLog;
    fs.rmSync(reportsDir, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
