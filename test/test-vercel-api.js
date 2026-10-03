const assert = require('assert');
const health = require('../api/health');
const liveAgent = require('../api/live-agent');
const history = require('../api/history');
const compare = require('../api/compare');
const graph = require('../api/graph');
const networkAgents = require('../api/network-agents');
const agents = require('../api/agents');
const { normalizeAgentId, isValidAgentId } = require('../src/agent-id');

function invoke(handler, url) {
  return new Promise((resolve) => {
    const response = {
      statusCode: 200,
      headers: {},
      setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
      end(body) { resolve({ statusCode: this.statusCode, body: JSON.parse(body) }); }
    };
    Promise.resolve(handler({ method: 'GET', url }, response));
  });
}

(async () => {
  const healthResponse = await invoke(health, '/api/health');
  assert.equal(healthResponse.statusCode, 200);
  assert.equal(healthResponse.body.runtime, 'vercel-nodejs');
  assert.equal(normalizeAgentId('00042'), '42');
  assert.equal(isValidAgentId('1'.repeat(79)), false);

  const invalidResponse = await invoke(liveAgent, '/api/live-agent?id=not-a-number');
  assert.equal(invalidResponse.statusCode, 400);
  assert.equal(invalidResponse.body.error, 'Invalid Agent ID');

  const historyResponse = await invoke(history, '/api/history?id=not-a-number');
  assert.equal(historyResponse.statusCode, 400);
  const compareResponse = await invoke(compare, '/api/compare?ids=1');
  assert.equal(compareResponse.statusCode, 400);
  const graphResponse = await invoke(graph, '/api/graph?id=not-a-number');
  assert.equal(graphResponse.statusCode, 400);
  const catalogResponse = await invoke(networkAgents, '/api/network-agents?page=1&limit=1');
  assert.equal(catalogResponse.statusCode, 200);
  const agentsResponse = await invoke(agents, '/api/agents?q=');
  assert.equal(agentsResponse.statusCode, 200);

  console.log('Vercel function route tests passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
