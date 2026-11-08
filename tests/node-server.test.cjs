const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
let configured, unconfigured;
async function fixture(enabled) {
    const data = fs.mkdtempSync(path.join(os.tmpdir(), 'ttt-server-fixture-'));
    const reserved = net.createServer();
    await new Promise(resolve => reserved.listen(0, '127.0.0.1', resolve));
    const port = reserved.address().port;
    await new Promise(resolve => reserved.close(resolve));
    const env = { ...process.env, NODE_ENV: 'test', PORT: String(port), DATA_DIR: data };
    delete env.ADMIN_PASSWORD; delete env.SESSION_SECRET;
    if (enabled) { env.ADMIN_PASSWORD = 'node-test-only-admin-password'; env.SESSION_SECRET = crypto.randomBytes(32).toString('hex'); }
    const child = spawn(process.execPath, ['server.js'], { cwd: path.resolve(__dirname, '..'), env, stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Server startup timed out')), 10000);
        child.once('error', reject);
        child.stdout.on('data', chunk => { if (chunk.toString().includes('TTT running')) { clearTimeout(timer); resolve(); } });
        child.once('exit', code => { if (code) { clearTimeout(timer); reject(new Error('Server exited ' + code)); } });
    });
    return { child, data, url: 'http://127.0.0.1:' + port };
}
async function call(server, route, data, headers = {}) {
    return fetch(server.url + route, { method: data === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...headers }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
}
before(async () => { configured = await fixture(true); unconfigured = await fixture(false); });
after(async () => {
    for (const server of [configured, unconfigured].filter(Boolean)) {
        await new Promise(resolve => { server.child.once('exit', resolve); server.child.kill(); });
        fs.rmSync(server.data, { recursive: true, force: true });
    }
});
test('Node serves public pages while unconfigured admin access fails closed', async () => {
    assert.equal((await call(unconfigured, '/')).status, 200);
    assert.equal((await call(unconfigured, '/api/auth/login', { password: 'ttt2025' })).status, 503);
});
test('Node rejects private files and returns a readable custom 404', async () => {
    for (const route of ['/data/settings.json', '/data/leads.json', '/server.js', '/package.json']) {
        const response = await call(configured, route);
        assert.equal(response.status, 404);
        assert.match(await response.text(), /Page Not Found/);
    }
    assert.equal(Object.hasOwn(await (await call(configured, '/api/settings')).json(), 'adminPass'), false);
});
test('Node validates leads on the server and normalizes national phone input', async () => {
    assert.equal((await call(configured, '/api/leads/submit', {})).status, 400);
    const lead = { fname: 'Test', lname: 'Lead', email: 'test@example.invalid', phone: '0501234567', countryCode: '+971', message: 'An isolated Node integration lead', contactConsent: false };
    assert.equal((await call(configured, '/api/leads/submit', lead)).status, 400);
    assert.equal((await call(configured, '/api/leads/submit', { ...lead, contactConsent: true })).status, 200);
    assert.equal(JSON.parse(fs.readFileSync(path.join(configured.data, 'leads.json')))[0].phone, '+971501234567');
});
test('Node blocks cross-origin writes and defaults, authenticates configured admins and throttles attempts', async () => {
    assert.equal((await call(configured, '/api/auth/login', { password: 'wrong' }, { Origin: 'https://attacker.example' })).status, 403);
    assert.equal((await call(configured, '/api/auth/login', { password: 'ttt2025' })).status, 401);
    const login = await call(configured, '/api/auth/login', { password: 'node-test-only-admin-password' });
    assert.equal(login.status, 200);
    const Cookie = login.headers.get('Set-Cookie').split(';')[0];
    const sync = await call(configured, '/api/sync', undefined, { Cookie });
    assert.equal(sync.status, 200);
    assert.equal(Object.hasOwn((await sync.json()).settings, 'adminPass'), false);
    let limited;
    for (let i = 0; i < 5; i++) limited = await call(configured, '/api/auth/login', { password: 'wrong' });
    assert.equal(limited.status, 429);
    assert.ok(limited.headers.has('Retry-After'));
});
