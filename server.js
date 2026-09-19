// Pulse uses one backend so both entry points share authentication and file safety.
const { spawn } = require('node:child_process');
const path = require('node:path');
const child = spawn(process.env.PYTHON || 'python3', [path.join(__dirname, 'app.py')], {
  cwd: __dirname,
  stdio: 'inherit',
  env: process.env
});
child.on('error', () => {
  console.error('Python 3가 필요합니다. pip install -r requirements.txt 후 ./start.sh로 실행하세요.');
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', (code) => { process.exitCode = code === null ? 1 : code; });
