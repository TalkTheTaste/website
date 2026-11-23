const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const bookingURL='https://bookings.cloud.microsoft/book/BookaMeetingwithUs@talkthetaste.com/?ismsaljsauthenabled';
test.beforeEach(async({page})=>{
 await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/,r=>r.abort());
 await page.route(/google-analytics\.com|googletagmanager\.com/,r=>r.abort());
 // Keep form tests independent of live availability and never create real appointments.
 await require('./booking-fixture.cjs')(page,{questions:false});
});
test('free consultation starts at the native calendar and keeps package context',async({page})=>{
 await page.goto('/pricing',{waitUntil:'domcontentloaded'});
 await page.locator('#social-essentials a').filter({hasText:'Get Started'}).click();
 await expect(page).toHaveURL(/\/book-consultation\?package=Social%20Essentials&service=Social%20Media$/);
 await expect(page.locator('h1')).toHaveText('Book Your Free Marketing Consultation');
 await expect(page.locator('[data-booking-context]')).toContainText('Social Essentials');
 expect(await page.locator('iframe').count()).toBe(0);
 await expect(page.locator('#booking-form')).toBeVisible();
 await expect(page.locator('[data-booking-external]')).toHaveAttribute('href',bookingURL);
 await expect(page.locator('.cp-help a')).toHaveAttribute('href','/contact?package=Social+Essentials&service=Social+Media#contactForm');
});
test('enquiries require consent, preserve context and report server errors before retry',async({page})=>{
 const submissions=[];let success=false;
 await page.route('**/api/leads/submit',async route=>{submissions.push(route.request().postDataJSON());await route.fulfill({status:success?200:503,contentType:'application/json',body:JSON.stringify({ok:success})});});
 await page.goto('/contact?package=Social%20Essentials&service=Social%20Media#contactForm',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#message')).toHaveValue(/Social Essentials/);
 await page.locator('#submitBtn').click();await expect(page.locator('#fname')).toHaveAttribute('aria-invalid','true');expect(submissions).toHaveLength(0);
 await page.locator('#fname').fill('Website');await page.locator('#lname').fill('Tester');await page.locator('#email').fill('contact-test@example.invalid');await page.locator('#phone').fill('0501234567');
 await page.locator('#submitBtn').click();await expect(page.locator('#consentError')).toBeVisible();expect(submissions).toHaveLength(0);
 await page.locator('#contactConsent').check();await page.locator('#submitBtn').click();await expect(page.locator('#contactStatus')).toContainText('could not be sent');await expect(page.locator('#successMsg')).toBeHidden();await expect(page.locator('#submitBtn')).toBeEnabled();
 success=true;await page.locator('#submitBtn').click();await expect(page.locator('#successMsg')).toBeVisible();expect(submissions).toHaveLength(2);
 expect(submissions[1]).toMatchObject({phone:'+971501234567',contactConsent:true,package:'Social Essentials',service:'Social Media Marketing',source:'Pricing Package Form'});
});
test('audit validates the profile and sends an approved request once',async({page})=>{
 const submissions=[];await page.route('**/api/leads/submit',async route=>{submissions.push(route.request().postDataJSON());await route.fulfill({contentType:'application/json',body:'{"ok":true}'});});
 await page.goto('/contact#free-audit',{waitUntil:'domcontentloaded'});
 await page.locator('#auditName').fill('Website Tester');await page.locator('#auditPhone').fill('+971501234567');await page.locator('#auditUrl').fill('x');await page.locator('#auditConsent').check();
 await page.locator('#auditForm button').click();await expect(page.locator('#auditSuccess')).toBeHidden();expect(await page.locator('#auditUrl').evaluate(el=>el.validity.valid)).toBe(false);expect(submissions).toHaveLength(0);
 await page.locator('#auditUrl').fill('@talkthetaste');await page.locator('#auditForm button').click();await expect(page.locator('#auditSuccess')).toBeVisible();expect(submissions).toHaveLength(1);expect(submissions[0]).toMatchObject({service:'Free Growth Audit',auditUrl:'@talkthetaste',contactConsent:true});
});
for(const route of ['/contact','/book-consultation'])test('responsive layout, accessibility and mobile menu: '+route,async({page})=>{
 for(const width of [320,390,768,1024,1440,2560]){await page.setViewportSize({width,height:900});await page.goto(route,{waitUntil:'domcontentloaded'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
 await expect.poll(()=>page.locator('body').evaluate(el=>getComputedStyle(el).opacity)).toBe('1');const violations=(await new AxeBuilder({page}).include('#main-content').exclude('iframe').analyze()).violations;expect(violations).toEqual([]);
 await page.setViewportSize({width:390,height:844});await page.locator('.hamburger').focus();await page.locator('.hamburger').press('Enter');await expect(page.locator('#mobileMenu .mobile-menu-links a').first()).toBeInViewport();await page.keyboard.press('Escape');await expect(page.locator('.hamburger')).toBeFocused();
});
test('contact fallback works without scripts and booking context is rendered as text',async({browser,page})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const noJS=await context.newPage();await noJS.goto('/contact',{waitUntil:'domcontentloaded'});await expect(noJS.locator('#fname')).toBeDisabled();await expect(noJS.getByRole('link',{name:'Book your free consultation',exact:true})).toHaveAttribute('href','/book-consultation');await context.close();
 await page.goto('/book-consultation?package='+encodeURIComponent('<img src=x onerror=alert(1)>'),{waitUntil:'domcontentloaded'});await expect(page.locator('[data-booking-context]')).toContainText('<img src=x onerror=alert(1)>');expect(await page.locator('[data-booking-context] img').count()).toBe(0);
});
