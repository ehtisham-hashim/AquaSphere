import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runService = (name, cwd, colorCode) => {
  const proc = spawn('pnpm', ['run', 'dev'], {
    cwd: path.join(__dirname, cwd),
    stdio: 'pipe',
    shell: true,
    env: process.env
  });

  proc.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => console.log(`\x1b[${colorCode}m[${name}]\x1b[0m ${line}`));
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => console.error(`\x1b[${colorCode}m[${name} ERROR]\x1b[0m ${line}`));
  });

  proc.on('close', (code) => {
    console.log(`\x1b[${colorCode}m[${name}]\x1b[0m Exited with code ${code}`);
  });

  return proc;
};

console.log('\x1b[36m🚀 Starting AquaSphere & Wadaana OS (Backend + Frontend)...\x1b[0m');

const backend = runService('BACKEND ', 'backend', '33'); // Yellow
const frontend = runService('FRONTEND', 'frontend', '32'); // Green

const shutdown = () => {
  console.log('\n\x1b[31m🛑 Shutting down servers...\x1b[0m');
  backend.kill('SIGTERM');
  frontend.kill('SIGTERM');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
