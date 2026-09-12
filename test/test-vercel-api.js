const assert = require('assert');
const health = require('../api/health');
const liveAgent = require('../api/live-agent');

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

  const invalidResponse = await invoke(liveAgent, '/api/live-agent?id=not-a-number');
  assert.equal(invalidResponse.statusCode, 400);
  assert.equal(invalidResponse.body.error, 'Invalid Agent ID');

  console.log('Vercel function route tests passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
