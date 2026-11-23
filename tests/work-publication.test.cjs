'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const project={id:'PUBLICCLIENT001',title:'Real Client',image:'/api/portfolio/thumb?id=PUBLICIMAGE001',tags:['Photography'],updatedAt:'2026-11-01',media:[{id:'PUBLICIMAGE001',type:'Photography',mimeType:'image/jpeg',url:'/api/portfolio/media?id=PUBLICIMAGE001',thumb:'/api/portfolio/thumb?id=PUBLICIMAGE001',updatedAt:'2026-11-02'}]};
const request=()=>new Request('https://talkthetaste.com/work');
function fixtureFetch(extra){return async input=>{const url=new URL(input instanceof Request?input.url:input);if(url.pathname==='/api/portfolio')return Response.json({source:'onedrive',projects:[project]});if(url.pathname==='/api/portfolio/client')return Response.json(project);return extra(url);};}
test('published projects and gallery images exist in HTML without JavaScript and share stable public URLs',async()=>{
 const {imageURL}=await import('../lib/work-data.mjs');const {renderWorkIndex,renderWorkDetail}=await import('../lib/work-view.mjs');
 const template=fs.readFileSync(path.join(__dirname,'../assets/pages/work-shell.txt'),'utf8');
 const index=renderWorkIndex(template,[project]);const detail=renderWorkDetail(template,project,[project]);
 assert.equal(imageURL(project),imageURL(project,project.media[0]));
 assert.ok(index.includes('href="/work/real-client/"'));assert.ok(detail.includes('src="'+imageURL(project)+'"'));
 for(const html of [index,detail]){assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.ok(!/<img[^>]+src="[^"\n]*\/api\//.test(html));assert.ok(!/\.sharepoint\.com|1drv\.com/.test(html));for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>JSON.parse(m[1]));}
 const hostile={...project,title:'Client </script><script>bad()</script>'};assert.ok(!renderWorkDetail(template,hostile,[hostile]).includes('<script>bad()</script>'));
});
test('the public photo route returns image bytes, caches them and supports HEAD without exposing a signed redirect',async()=>{
 const {imageURL}=await import('../lib/work-data.mjs');const renderer=await import('../functions/portfolio-images/[client]/[id]/[filename].js');
 const original=global.fetch,oldCaches=global.caches;let mediaCalls=0;const cache=new Map();global.caches={default:{match:async r=>cache.get(r.url)?.clone(),put:async(r,response)=>cache.set(r.url,response)}};
 global.fetch=fixtureFetch(async url=>{assert.equal(url.pathname,'/api/portfolio/thumb');mediaCalls++;return new Response(new Uint8Array([255,216,255]),{headers:{'Content-Type':'image/jpeg'}});});
 const url='https://talkthetaste.com'+imageURL(project);const parts=new URL(url).pathname.split('/');const params={client:parts[2],id:parts[3],filename:parts[4]};const jobs=[];
 try{const r=await renderer.onRequest({request:new Request(url),params,waitUntil:p=>jobs.push(p)});assert.equal(r.status,200);assert.equal(r.headers.get('Location'),null);assert.equal(r.headers.get('Content-Type'),'image/jpeg');assert.match(r.headers.get('X-Robots-Tag'),/^index/);assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],[255,216,255]);await Promise.all(jobs);const head=await renderer.onRequest({request:new Request(url,{method:'HEAD'}),params});assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal(mediaCalls,1);}finally{global.fetch=original;global.caches=oldCaches;}
});
test('unpublished image IDs cannot use the public photo proxy',async()=>{
 const renderer=await import('../functions/portfolio-images/[client]/[id]/[filename].js');const original=global.fetch;let mediaCalls=0;global.fetch=fixtureFetch(async()=>{mediaCalls++;throw Error('Should not request private media');});
 try{const r=await renderer.onRequest({request:new Request('https://talkthetaste.com/portfolio-images/real-client/PRIVATEIMAGE001/private.jpg'),params:{client:'real-client',id:'PRIVATEIMAGE001',filename:'private.jpg'}});assert.equal(r.status,404);assert.equal(mediaCalls,0);}finally{global.fetch=original;}
});
test('image sitemap discovers live public projects and uses the same crawlable photo URLs as the gallery',async()=>{
 const {imageURL}=await import('../lib/work-data.mjs');const renderer=await import('../functions/portfolio-sitemap.xml.js');const original=global.fetch;global.fetch=fixtureFetch(async()=>{throw Error('Unexpected call');});
 try{const r=await renderer.onRequestGet({request:request()});const xml=await r.text();assert.equal(r.status,200);assert.match(r.headers.get('Content-Type'),/xml/);assert.ok(xml.includes('<loc>https://talkthetaste.com/work/real-client/</loc>'));assert.ok(xml.includes('<image:loc>https://talkthetaste.com'+imageURL(project)+'</image:loc>'));assert.ok(!xml.includes('/api/'));assert.equal((xml.match(/<image:image>/g)||[]).length,1);}finally{global.fetch=original;}
});
test('upstream failure falls back to real published work, never invented seed projects',async()=>{
 const {loadWorkIndex}=await import('../lib/work-data.mjs');const {WORK_CATALOG}=await import('../lib/work-catalog.mjs');const original=global.fetch;global.fetch=async()=>Response.json({source:'default',projects:[{title:'Invented example'}]});
 try{const projects=await loadWorkIndex(request());assert.equal(projects.length,WORK_CATALOG.projects.length);assert.ok(!projects.some(p=>p.title==='Invented example'));}finally{global.fetch=original;}
});
