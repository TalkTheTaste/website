const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.beforeEach(async ({ page }) => {
    await page.route(/google-analytics\.com|googletagmanager\.com/, route => route.abort());
});

test('private files are inaccessible and invalid leads are rejected', async ({ request }) => {
    for (const route of ['/data/settings.json', '/data/leads.json', '/server.js', '/package.json']) expect((await request.get(route)).status()).toBe(404);
    const settings = await (await request.get('/api/settings')).json();
    expect(settings).not.toHaveProperty('adminPass');
    expect((await request.post('/api/leads/submit', { data: {} })).status()).toBe(400);
});

test('Home → About → Home finishes without script errors or an overlay', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.locator('#preloader')).toBeHidden({ timeout: 12000 });
    await page.locator('#nav .nav-menu a[href="/about"]').click();
    await expect(page).toHaveURL(/\/about$/);
    await page.locator('#nav .nav-menu a[href="/"]').click();
    await expect(page).toHaveURL(/\/$/);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('#preloader')).toBeHidden({ timeout: 12000 });
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => getComputedStyle(document.body).transform)).toBe('none');
});

for (const route of ['/', '/pricing', '/privacy-policy', '/terms-and-conditions']) {
    test(`mobile menu is visible and Escape restores focus: ${route}`, async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(route);
        await expect(page.locator('#preloader')).toBeHidden({ timeout: 12000 });
        await page.locator('.hamburger').click();
        await expect(page.locator('#mobileMenu .mobile-menu-links a').first()).toBeInViewport();
        await expect(page.locator('#mobileMenuClose')).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(page.locator('.hamburger')).toHaveAttribute('aria-expanded', 'false');
        await expect(page.locator('.hamburger')).toBeFocused();
    });
}

test('fixed navigation stays in the viewport after scrolling', async ({ page }) => {
    await page.goto('/about');
    await page.evaluate(() => scrollTo(0, 1000));
    await page.waitForTimeout(500);
    const top = await page.locator('#nav').evaluate(el => el.getBoundingClientRect().top);
    expect(top).toBe(0);
});

test('pricing link preserves the package and scrolls to the audit form', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pricing');
    await page.locator('.pkg-cta').first().click();
    await expect(page).toHaveURL(/\/contact\?package=.*#free-audit$/);
    await expect(page.locator('#message')).toHaveValue(/Signature Visibility Program/);
    await expect(page.locator('#free-audit')).toBeInViewport();
});

test('phone parsing, consent and audit validation apply in the actual form', async ({ page }) => {
    await page.goto('/contact');
    await page.locator('#fname').fill('Regression');
    await page.locator('#lname').fill('Tester');
    await page.locator('#email').fill('regression@example.invalid');
    await page.locator('#phone').fill('0501234567');
    await page.locator('#message').fill('Please review this test enquiry.');
    await page.locator('#contactConsent').check();
    const submission = page.waitForRequest(request => request.url().endsWith('/api/leads/submit'));
    await page.locator('#submitBtn').click();
    expect((await submission).postDataJSON().phone).toBe('+971501234567');
    await expect(page.locator('#successMsg')).toBeVisible();
    await page.goto('/contact');
    await page.locator('#auditName').fill('Regression Tester');
    await page.locator('#auditPhone').fill('+971501234567');
    await page.locator('#auditUrl').fill('x');
    await page.locator('#auditConsent').check();
    await page.locator('#auditForm button').click();
    await expect(page.locator('#auditSuccess')).toBeHidden();
    expect(await page.locator('#auditUrl').evaluate(el => el.validity.valid)).toBe(false);
});

test('language links open complete Arabic pages with correct metadata and destinations', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#preloader')).toBeHidden({ timeout: 12000 });
    await page.locator('#nav .ar-lang').click();
    await expect(page).toHaveURL(/\/ar\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('h1')).toContainText(/[\u0600-\u06ff]/);
    await page.goto('/ar/contact/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('#nav a[href="/ar/services/"]')).toHaveAttribute('href', '/ar/services/');
    await expect(page.locator('.language-float')).toHaveAttribute('href', '/contact');
});

test('article scripts, portfolio deep links and custom error pages work', async ({ page, request }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/blog/how-to-market-a-restaurant-in-dubai/');
    await expect(page.locator('#postTitle')).toContainText('Restaurant');
    await page.waitForTimeout(700);
    expect(errors).toEqual([]);
    await page.goto('/work');
    await expect(page.locator('.proj-card').first()).toBeVisible();
    const href = await page.locator('.proj-card').first().getAttribute('href');
    expect((await request.get(href)).status()).toBe(200);
    const missing = await request.get('/work/nonexistent-regression-test/');
    expect(missing.status()).toBe(404);
    expect(await missing.text()).toContain('Page Not Found');
    expect((await request.get('/favicon.ico')).status()).toBe(200);
});

test('legacy article errors never render an untrusted query as HTML', async ({ page }) => {
    const payload = '<img src="/missing-query.png" onerror="window.__queryXss=true">';
    await page.goto('/post.html?id=' + encodeURIComponent(payload));
    await expect(page.locator('#postNotFound')).toBeVisible();
    expect(await page.evaluate(() => window.__queryXss)).toBeUndefined();
    await expect(page.locator('#postDebug')).toHaveCount(0);
});

test('portfolio client dialog contains and restores keyboard focus', async ({ page }) => {
    await page.goto('/work');
    const card = page.locator('.proj-card').first();
    await card.click();
    await expect(page.locator('#clientView')).toHaveAttribute('role', 'dialog');
    await expect(page.locator('#clientClose')).toBeFocused();
    await expect.poll(() => page.locator('#clientHeroMedia img').evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#clientView')).toHaveAttribute('aria-hidden', 'true');
    await expect(card).toBeFocused();
});

test('lead HTML is displayed as text in the authenticated admin table', async ({ page, request }) => {
    const marker = '<img src="/missing-regression.png" onerror="window.__regressionXss=true">';
    const response = await request.post('/api/leads/submit', { data: { fname: marker, lname: 'Tester', email: 'regression@example.invalid', phone: '+971501234567', message: 'Isolated stored XSS regression test', contactConsent: true } });
    expect(response.status()).toBe(200);
    await page.goto('/admin');
    await page.locator('#passInput').fill('browser-test-only-password');
    await page.locator('#loginBtn').click();
    await expect(page.locator('#app')).toHaveClass(/visible/);
    expect(await page.evaluate(() => window.__regressionXss)).toBeUndefined();
    await expect(page.locator('#leadsTable')).toContainText(marker);
    await expect(page.locator('#leadsTable img')).toHaveCount(0);
});

for (const route of ['/custom-software-development-dubai', '/social-media-marketing-dubai']) {
    test(`320px content reflows without horizontal overflow: ${route}`, async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 568 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(route);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    });
}

test('representative pages pass automated WCAG accessibility checks', async ({ page }) => {
    test.setTimeout(120000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const route of ['/', '/contact', '/pricing', '/services', '/privacy-policy', '/ttt-client-intake', '/ar/']) {
        await page.goto(route);
        await expect(page.locator('#preloader')).toBeHidden({ timeout: 12000 });
        await page.waitForTimeout(700);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        expect(results.violations, `${route}: ${results.violations.map(v => v.id).join(', ')}`).toEqual([]);
    }
});
