const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route(/google-analytics\.com|googletagmanager\.com/,r=>r.abort());});
test('Journal search, topic filters and article navigation',async({page})=>{
 await page.goto('/blog',{waitUntil:'domcontentloaded'});
 const articles=page.locator('[data-journal-item]:visible');expect(await articles.count()).toBeGreaterThan(0);
 await page.getByRole('searchbox').fill('zzzz-not-an-article');await expect(page.locator('[data-journal-empty]')).toBeVisible();
 await page.getByRole('searchbox').fill('');await page.getByRole('button',{name:'All topics',exact:true}).click();
 await articles.first().locator('a').click();await expect(page.locator('#postContent')).toBeVisible();
 await page.getByRole('button',{name:'Copy article link'}).click();await expect(page.locator('[data-journal-share-status]')).not.toBeEmpty();
});
test('Journal remains readable without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
 await page.goto('/blog',{waitUntil:'domcontentloaded'});await page.locator('[data-journal-item] a').first().click();
 await expect(page.locator('#postContent')).not.toBeEmpty();await context.close();
});
