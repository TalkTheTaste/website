const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { publicSettings, normalizePhone, validAuditUrl, validateLead, adminConfigured } = require('../lib/security.cjs');

test('public settings exclude credentials, arbitrary keys and old auth configuration', () => {
    assert.deepEqual(publicSettings({ email: 'hi@example.com', adminPass: 'private', SESSION_SECRET: 'secret', injected: true }), { email: 'hi@example.com' });
});
test('phone parsing handles trunk prefixes, pasted international numbers and invalid numbers', () => {
    assert.equal(normalizePhone('0501234567', '+971'), '+971501234567');
    assert.equal(normalizePhone('+971 50 123 4567', '+971'), '+971501234567');
    assert.equal(normalizePhone('00971 50 123 4567'), '+971501234567');
    assert.equal(normalizePhone('020 7946 0018', '+44'), '+442079460018');
    assert.equal(normalizePhone('02 36618 300', '+39'), '+390236618300');
    assert.equal(normalizePhone('abc1234567', '+971'), '');
    assert.equal(normalizePhone('12345', '+971'), '');
});
test('audit URL accepts websites and handles and rejects placeholders and active URLs', () => {
    for (const value of ['https://example.com/path', '@your.brand']) assert.equal(validAuditUrl(value), true);
    for (const value of ['x', '@', 'javascript:alert(1)', 'https://user:pass@example.com']) assert.equal(validAuditUrl(value), false);
});
test('lead validation requires consent and validates audit destinations server-side', () => {
    const lead = { fname: 'Test', lname: 'Lead', email: 'audit@example.com', message: 'Please audit this website', contactConsent: true };
    assert.deepEqual(validateLead(lead, '+971501234567'), []);
    assert.ok(validateLead({ ...lead, contactConsent: 'true' }, '+971501234567').includes('contactConsent'));
    assert.ok(validateLead({ ...lead, source: 'Free Growth Audit Form', auditUrl: 'x' }, '+971501234567').includes('auditUrl'));
    assert.ok(validateLead({}, '').length >= 6);
});
test('admin authentication requires two independent configured secrets', () => {
    assert.equal(adminConfigured({}), false);
    assert.equal(adminConfigured({ ADMIN_PASSWORD: 'ttt2025', SESSION_SECRET: 'x'.repeat(32) }), false);
    assert.equal(adminConfigured({ ADMIN_PASSWORD: 'test-only-password-16+', SESSION_SECRET: crypto.randomBytes(32).toString('hex') }), true);
});
test('public build excludes private/runtime/source files', () => {
    const output = path.resolve(__dirname, '../dist');
    assert.ok(fs.existsSync(path.join(output, 'index.html')), 'Run npm run build first');
    for (const file of ['data', 'lib', 'server.js', 'package.json', 'package-lock.json', 'reports', 'functions', '.env', '.dev.vars']) assert.equal(fs.existsSync(path.join(output, file)), false, file);
});

async function cloudflareFixture() {
    const { onRequest } = await import('../functions/api/[[path]].js');
    const store = new Map();
    const env = {
        ADMIN_PASSWORD: 'test-only-admin-password', SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
        TTT_DATA: { get: async key => store.has(key) ? JSON.parse(store.get(key)) : null, put: async (key, value) => { store.set(key, value); } },
    };
    async function call(endpoint, body, headers = {}) {
        const request = new Request('https://website.example/api/' + endpoint, {
            method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': crypto.randomUUID(), ...headers },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        return onRequest({ request, env, params: { path: endpoint.split('/') } });
    }
    return { call, env, store };
}
test('Cloudflare rejects empty/unconsented leads and unknown origins', async () => {
    const { call } = await cloudflareFixture();
    assert.equal((await call('leads/submit', {})).status, 400);
    assert.equal((await call('leads/submit', { fname: 'Test', lname: 'Lead', email: 'audit@example.com', phone: '+971501234567', message: 'An otherwise valid lead', contactConsent: false })).status, 400);
    const hostile = await call('settings', undefined, { Origin: 'https://attacker.example' });
    assert.equal(hostile.status, 403);
    assert.equal(hostile.headers.has('Access-Control-Allow-Origin'), false);
});
test('Cloudflare rejects defaults, signs only configured sessions and keeps secrets out of sync', async () => {
    const { call, env } = await cloudflareFixture();
    assert.equal((await call('auth/login', { password: 'ttt2025' })).status, 401);
    const login = await call('auth/login', { password: env.ADMIN_PASSWORD });
    assert.equal(login.status, 200);
    const Cookie = login.headers.get('Set-Cookie').split(';')[0];
    const sync = await call('sync', undefined, { Cookie });
    assert.equal(sync.status, 200);
    const data = await sync.json();
    assert.equal(Object.hasOwn(data.settings, 'adminPass'), false);
    assert.equal(data.authConfig.passwordManagedExternally, true);
    delete env.SESSION_SECRET;
    assert.equal((await call('auth/login', { password: env.ADMIN_PASSWORD })).status, 503);
    assert.equal((await call('sync', undefined, { Cookie })).status, 401);
});
test('Cloudflare throttles repeated authentication attempts', async () => {
    const { call } = await cloudflareFixture();
    const headers = { 'CF-Connecting-IP': crypto.randomUUID() };
    for (let i = 0; i < 5; i++) assert.equal((await call('auth/login', { password: 'wrong' }, headers)).status, 401);
    assert.equal((await call('auth/login', { password: 'wrong' }, headers)).status, 429);
});
