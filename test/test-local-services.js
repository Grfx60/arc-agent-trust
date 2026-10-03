const assert = require('assert');
const net = require('net');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

function getJson(port, route) {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port, path: route }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        try { resolve({ status: response.statusCode, body: JSON.parse(body) }); }
        catch (error) { reject(error); }
      });
    });
    request.setTimeout(1000, () => request.destroy(new Error('Local service request timed out.')));
    request.on('error', reject);
  });
}

async function waitFor(port, route, child) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Service exited early with code ${child.exitCode}.`);
    try { return await getJson(port, route); } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  throw new Error(`Service did not become ready on port ${port}.`);
}

(async () => {
  const apiPort = await freePort();
  let dashboardPort = await freePort();
  while (dashboardPort === apiPort) dashboardPort = await freePort();
  const env = {
    ...process.env,
    DATABASE_URL: '', POSTGRES_URL: '',
    LIVE_API_PORT: String(apiPort), LIVE_API_HOST: '127.0.0.1',
    DASHBOARD_PORT: String(dashboardPort), DASHBOARD_HOST: '127.0.0.1',
    LIVE_API_PROXY_HOST: '127.0.0.1'
  };
  const api = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'servers', 'live-api.js')], { env, stdio: 'ignore', windowsHide: true });
  const dashboard = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'servers', 'dashboard.js')], { env, stdio: 'ignore', windowsHide: true });
  try {
    const apiHealth = await waitFor(apiPort, '/health', api);
    const dashboardHealth = await waitFor(dashboardPort, '/health', dashboard);
    const invalidId = await getJson(apiPort, '/api/live-agent?id=not-a-number');
    assert.equal(apiHealth.status, 200);
    assert.equal(apiHealth.body.reportStore, 'file');
    assert.equal(dashboardHealth.status, 200);
    assert.equal(dashboardHealth.body.reportStore, 'file');
    assert.equal(invalidId.status, 400);
    console.log('Local HTTP service smoke assertions passed.');
  } finally {
    api.kill(); dashboard.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
