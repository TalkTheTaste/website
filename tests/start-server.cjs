// Isolated fixture: browser tests never write to the repository's runtime data.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'ttt-browser-fixture-'));
for (const file of ['projects.json', 'posts.json']) fs.copyFileSync(path.join(root, 'data', file), path.join(data, file));
const server = spawn(process.execPath, ['server.js'], {
    cwd: root, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'test', PORT: '4399', DATA_DIR: data, ADMIN_PASSWORD: 'browser-test-only-password', SESSION_SECRET: require('node:crypto').randomBytes(32).toString('hex') },
});
function stop() { server.kill('SIGTERM'); }
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
server.on('exit', code => { fs.rmSync(data, { recursive: true, force: true }); process.exit(code || 0); });
