/** Start the dashboard and API together without relying on a shell-specific command. */
const path = require('path');
const { spawn } = require('child_process');

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
