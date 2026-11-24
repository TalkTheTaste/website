const { test, expect } = require('@playwright/test');

test('homepage connects the restored hero and questions to audit, pricing and consultation', async ({ page }) => {
    await page.route(/google-analytics|googletagmanager/, route => route.abort());
    await page.route('**/api/analytics/track', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('We turn attentionintoinquiry.');
    await page.locator('.hero-actions a').click();
    await expect(page).toHaveURL(/\/contact#free-audit$/);
    await expect(page.locator('#free-audit')).toBeInViewport();
    await page.goto('/');
    const pricing = page.locator('#faq details').nth(1);
    await pricing.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(pricing).toHaveAttribute('open', '');
    await expect(page.locator('#faq details[open]')).toHaveCount(1);
    await pricing.getByRole('link', { name: 'See packages and pricing' }).click();
    await expect(page).toHaveURL(/\/pricing#social-essentials$/);
    await expect(page.locator('#social-essentials h2')).toHaveText('Social Essentials');
    await expect(page.locator('#social-essentials')).toContainText('1,999');
    await page.goto('/');
    const matchingFAQ = await page.locator('#faq details').evaluateAll(items => {
        const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
        const questions = schema['@graph'].find(item => item['@type'] === 'FAQPage').mainEntity;
        return items.every((item, index) => questions[index].name === item.querySelector('summary').textContent && questions[index].acceptedAnswer.text === item.querySelector('p').textContent);
    });
    expect(matchingFAQ).toBe(true);
    await page.locator('.home-faq-contact a[href="/book-consultation"]').click();
    await expect(page).toHaveURL(/\/book-consultation$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Book Your Free Marketing Consultation', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
