import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
let stopping = false;

function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 250).unref();
}

function run(label, args) {
  const child = spawn(npm, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  children.push(child);
  child.on('error', (error) => {
    console.error(`[${label}] ${error.message}`);
    stopAll(1);
  });
  child.on('exit', (code) => {
    if (!stopping) {
      console.log(`[${label}] exited${code === null ? '' : ` with code ${code}`}`);
      stopAll(code ?? 1);
    }
  });
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

run('worker', ['run', 'dev:worker']);
run('vite', ['run', 'dev']);

console.log('Local app: http://127.0.0.1:5173 (Vite proxies /api to the Worker on port 8787)');
