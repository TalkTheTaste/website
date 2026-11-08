const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
    testDir: './tests/browser', workers: 1, timeout: 45000, reporter: 'list',
    use: { baseURL: 'http://127.0.0.1:4399', channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
    webServer: { command: 'node tests/start-server.cjs', url: 'http://127.0.0.1:4399', reuseExistingServer: false, timeout: 15000 },
});
