const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;

test('admin can review all details, join safely and explicitly cancel a shared meeting with a reason',async({page})=>{
 const id='cdd996c7-c751-49d4-a87e-c487c00dd217';let cancellation=null,posts=0;
 const contact={name:'Preview Visitor',email:'preview@example.invalid',phone:'+19995550123',company:'Preview Company',notes:'Discuss our website and social media.',consentAt:'2026-11-24T08:00:00Z',answers:[{question:'Budget',answer:'Not sure'},{question:'Business goals',answer:'More enquiries'},{question:'Optional detail',answer:''}]};
 const base={reference:id,state:'confirmed',createdAt:'2026-11-24T08:00:00Z',start:'2026-12-01T09:00:00Z',end:'2026-12-01T09:30:00Z',timeZone:'Asia/Dubai',service:'Free Marketing Consultation',contact,notification:'queued',joinUrl:'https://teams.microsoft.com/l/meetup-join/preview',attendeeCount:2,canCancel:true,version:'meeting-version'};
 await page.route('**/api/consultations**',route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.endsWith('/cancel')){posts++;const body=route.request().postDataJSON();expect(body.confirm).toBe(true);expect(body.confirmShared).toBe(true);expect(body.version).toBe('meeting-version');cancellation={state:'cancelled',reason:body.reason,updatedAt:'2026-11-24T10:00:00Z'};return route.fulfill({json:{reference:id,state:'cancelled',cancellation}});}
   if(path.endsWith(id))return route.fulfill({json:cancellation?{...base,state:'cancelled',canCancel:false,joinUrl:null,cancellation}:base});
   return route.fulfill({json:{available:true,items:[base],total:1,upcoming:cancellation?0:1,nextOffset:null}});
 });
 await page.goto('/admin.html');await page.locator('#passInput').fill('browser-test-only-password');await page.locator('#loginBtn').click();await expect(page.locator('#app.visible')).toBeVisible();
 await page.locator('.sidebar-btn[data-view="consultations"]').click();await page.locator('.consultation-card summary').click();
 await expect(page.locator('.consultation-live')).toContainText('More enquiries');await expect(page.locator('.consultation-details')).toContainText('Not provided');
 await expect(page.locator('[data-join-meeting]')).toHaveAttribute('href',base.joinUrl);await expect(page.locator('[data-join-meeting]')).toHaveAttribute('rel','noopener noreferrer');
 await page.getByRole('button',{name:'Cancel meeting',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 await expect(dialog).toContainText('all attached customers');
 await page.locator('#confirmCancelConsultation').click();expect(posts).toBe(0);
 await page.locator('#cancelConsultationReason').fill('We need to reschedule due to a team commitment.');await page.locator('#confirmCancelConsultation').click();expect(posts).toBe(0);
 await page.locator('#cancelSharedConfirm').check();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);}
 const axe=await new AxeBuilder({page}).include('#cancelConsultationDialog').analyze();expect(axe.violations).toEqual([]);
 await page.locator('#confirmCancelConsultation').click();await expect(dialog).not.toBeVisible();expect(posts).toBe(1);
 await expect(page.locator('.consultation-state')).toHaveText('Cancelled');await expect(page.locator('.consultation-live')).toContainText('We need to reschedule due to a team commitment.');await expect(page.locator('[data-join-meeting]')).toHaveCount(0);await expect(page.getByRole('button',{name:'Cancel meeting',exact:true})).toHaveCount(0);
 await expect(page.locator('#dash-consultations')).toHaveText('0');
});
