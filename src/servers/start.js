/** Start the dashboard and API together without relying on a shell-specific command. */
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
const config = require('../config');

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

async function start() {
  const dashboardBusy = await portInUse(config.servers.dashboard.port);
  const apiBusy = await portInUse(config.servers.liveApi.port);

  if (dashboardBusy && apiBusy) {
    console.log('Arc Agent Trust services are already running.');
    console.log(`Dashboard: http://localhost:${config.servers.dashboard.port}`);
    console.log(`Live API:  http://localhost:${config.servers.liveApi.port}`);
    return;
  }

  if (dashboardBusy || apiBusy) {
    const busy = dashboardBusy ? 'dashboard' : 'live API';
    console.error(`Cannot start all services: ${busy} port is already in use.`);
    process.exitCode = 1;
    return;
  }

  const services = ['dashboard.js', 'live-api.js'].map((file) =>
    spawn(process.execPath, [path.join(__dirname, file)], {
      stdio: 'inherit',
      windowsHide: true
    })
  );

  let stopping = false;
  function stop(exitCode = 0) {
    if (stopping) return;
    stopping = true;
    for (const service of services) service.kill();
    process.exit(exitCode);
  }

  for (const service of services) {
    service.on('error', (error) => {
      console.error(`Could not start service: ${error.message}`);
      stop(1);
    });
    service.on('exit', (code, signal) => {
      if (!stopping) {
        console.error(`A service stopped unexpectedly (${signal || `exit code ${code}`}).`);
        stop(code || 1);
      }
    });
  }

  process.once('SIGINT', () => stop());
  process.once('SIGTERM', () => stop());
}

start().catch((error) => {
  console.error(`Could not start services: ${error.message}`);
  process.exitCode = 1;
});
