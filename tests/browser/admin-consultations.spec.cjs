const {test,expect}=require('@playwright/test');

test('private consultations support filtering, Dubai times and safe contact details on mobile',async({page})=>{
  expect((await page.request.get('/api/consultations')).status()).toBe(401);
  const record={reference:'e40f303d-680e-435a-a81f-a1b8af233888',state:'confirmed',start:'2026-12-01T09:00:00Z',createdAt:'2026-11-24T10:00:00Z',contact:{name:'Preview <script>Visitor</script>',email:'test@example.invalid',phone:'+19995550123',company:'Preview Business',notes:'Preview notes',answers:[{question:'Budget',answer:'Not sure'}]},notification:'queued'};
  await page.route('**/api/consultations?**',route=>{
    const query=new URL(route.request().url()).searchParams;
    const empty=query.get('filter')==='attention'||query.get('search')==='missing';
    return route.fulfill({json:{available:true,upcoming:1,total:empty?0:1,items:empty?[]:[record],nextOffset:null}});
  });
  await page.goto('/admin.html');
  await page.locator('#passInput').fill('browser-test-only-password');
  await page.locator('#loginBtn').click();
  await expect(page.locator('#app.visible')).toBeVisible();
  await page.getByRole('button',{name:'Consultations',exact:false}).click();
  await expect(page.locator('.consultation-card')).toHaveCount(1);
  await expect(page.locator('.consultation-when')).toContainText('13:00');
  await page.locator('.consultation-card summary').click();
  await expect(page.locator('.consultation-details')).toContainText('Queued by CallMeBot');
  await expect(page.locator('.consultation-details a[href="mailto:test%40example.invalid"]')).toBeVisible();
  await expect(page.locator('.consultation-card script')).toHaveCount(0);
  expect(await page.evaluate(()=>Object.values(localStorage).some(v=>v.includes('test@example.invalid')))).toBe(false);
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.locator('#consultationFilter').selectOption('attention');
  await expect(page.locator('.consultation-card')).toHaveCount(0);
  await expect(page.locator('#consultationStatus')).toHaveText('0 requests in this view.');
  await page.locator('#consultationFilter').selectOption('all');
  await expect(page.locator('.consultation-card')).toHaveCount(1);
  await page.locator('#consultationSearch').fill('missing');
  await expect(page.locator('.consultation-card')).toHaveCount(0);
  await page.route('**/api/consultations?**',r=>r.fulfill({status:401,json:{error:'Unauthorized'}}));
  await page.locator('#refreshConsultations').click();
  await expect(page.locator('#consultationStatus')).toContainText('session has expired');
});
