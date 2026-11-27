const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
test('CallMeBot constructs its outgoing request in Cloudflare workerd without contacting the provider',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../lib/callmebot.mjs'),'utf8').replace('export async function sendWhatsApp','async function sendWhatsApp');
 const options={modules:true,compatibilityDate:'2026-08-07',script:source+`\nexport default {async fetch(){let constructed=0;const result=await sendWhatsApp({CALLMEBOT_PHONE:'+19995550123',CALLMEBOT_APIKEY:'fake-key'},'Connection test',{fetch:async(url,init)=>{new Request(url,init);constructed++;return new Response('Message queued.',{status:201});}});return Response.json({result,constructed});}};`};
 const mf=new Miniflare(convertV4MiniflareOptions?convertV4MiniflareOptions(options):options);
 try{const result=await(await mf.dispatchFetch('http://localhost/')).json();assert.equal(result.constructed,1);assert.equal(result.result.ok,true);assert.equal(result.result.reason,'queued');}finally{await mf.dispose();}
});
