'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const services=require('../scripts/service-content.cjs');
test('service pages keep distinct canonical URLs, accessible content and a real brand preview',()=>{
 const titles=new Set();
 for(const slug of ['services',...services.map(s=>s.slug)]){
  const html=fs.readFileSync(path.join(root,'dist',slug+'.html'),'utf8');
  assert.ok(html.includes(`rel="canonical" href="https://talkthetaste.com/${slug}"`),slug);
  assert.equal((html.match(/<h1\b/g)||[]).length,1,slug);
  const title=html.match(/<title>(.*?)<\/title>/)[1];assert.ok(!titles.has(title),slug);titles.add(title);
  assert.match(html,/property="og:image" content="https:\/\/talkthetaste.com\/assets\/brand\/share-card-v2.png"/);
  assert.ok(!/<(?:img|source)[^>]+(?:home-hero|social-growth-campaign|restaurant-brand-launch|delivery-web-app)/.test(html),slug);
  assert.ok(!/class="[^"\n]*reveal/.test(html.match(/<main[\s\S]*?<\/main>/)[0]),slug);
  for(const json of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>JSON.parse(json[1]));
 }
});
test('adding and removing an approved photo changes the service page on rebuild without HTML edits',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ttt-service-upload-'));
 try{
  for(const directory of ['scripts','css','assets/services'])fs.mkdirSync(path.join(temp,directory),{recursive:true});
  for(const file of ['scripts/render-services.cjs','scripts/service-content.cjs','css/services.css','about.html'])fs.copyFileSync(path.join(root,file),path.join(temp,file));
  const render=()=>execFileSync(process.execPath,[path.join(temp,'scripts/render-services.cjs')],{stdio:'pipe'});
  const read=()=>fs.readFileSync(path.join(temp,'marketing-strategy-dubai.html'),'utf8');
  render();assert.ok(!read().includes('class="sv-shell sv-photo"'));
  fs.copyFileSync(path.join(root,'assets/logo.png'),path.join(temp,'assets/services/marketing-strategy.png'));
  render();assert.match(read(),/<img src="\/assets\/services\/marketing-strategy\.png"/);
  fs.rmSync(path.join(temp,'assets/services/marketing-strategy.png'));
  render();assert.ok(!read().includes('class="sv-shell sv-photo"'));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
