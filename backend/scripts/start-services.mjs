import './load-production-env.mjs';
import { spawn } from 'node:child_process';

const services = [
  ['employee', 'dist/apps/employee-service/src/main.js'],
  ['attendance', 'dist/apps/attendance-service/src/main.js'],
  ['gateway', 'dist/apps/api-gateway/src/main.js'],
];
const children = [];
let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const { child } of children) {
    if (child.exitCode === null) child.kill('SIGTERM');
  }
  const forceStop = setTimeout(() => {
    for (const { child } of children) {
      if (child.exitCode === null) child.kill('SIGKILL');
    }
  }, 5000);
  forceStop.unref();
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

for (const [name, entry] of services) {
  const child = spawn(process.execPath, [entry], {
    env: process.env,
    stdio: 'inherit',
  });
  children.push({ name, child });
  child.on('error', (error) => {
    process.stderr.write(`[${name}] failed to start: ${error.message}\n`);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping) {
      process.stderr.write(
        `[${name}] exited unexpectedly (code=${code}, signal=${signal}). Stopping all services.\n`,
      );
      stop(code ?? 1);
    }
  });
}
