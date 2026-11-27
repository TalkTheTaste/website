const {test}=require('node:test'),assert=require('node:assert/strict');
const database=require('../lib/booking-node-db.cjs');
const env=()=>({BOOKING_DB:database(':memory:'),CALLMEBOT_PHONE:'+19995550123',CALLMEBOT_APIKEY:'fake-key'});
test('provider errors returned with HTTP 201 are rejected with safe diagnostic codes',async()=>{
 const {sendWhatsApp}=await import('../lib/callmebot.mjs');
 for(const [body,reason]of [['ERROR: apikey is invalid: fake-key','invalid_credentials'],['ERROR: phone parameter is missing','invalid_recipient'],['Oops! Too many requests','rate_limited'],['ERROR: Please send Resume, your number is paused','recipient_paused'],['ERROR: API not activated','recipient_not_authorized']]){
  const result=await sendWhatsApp(env(),'Test',{fetch:async()=>new Response(body,{status:201})});assert.equal(result.ok,false);assert.equal(result.reason,reason);assert(!JSON.stringify(result).includes('fake-key'));
 }
});
test('queue acknowledgement wins over words in echoed customer content and blank responses are not success',async()=>{
 const {sendWhatsApp}=await import('../lib/callmebot.mjs');
 const accepted=await sendWhatsApp(env(),'We have failed campaigns',{fetch:async()=>new Response('<p>Text to send: We have failed campaigns</p><b>Message queued.</b>',{status:201})});assert.equal(accepted.ok,true);assert.equal(accepted.reason,'queued');
 const blank=await sendWhatsApp(env(),'Test',{fetch:async()=>new Response('',{status:200})});assert.equal(blank.ok,false);assert.equal(blank.reason,'unexpected_response');
});
test('timeout classification is distinct from network errors',async()=>{
 const {sendWhatsApp}=await import('../lib/callmebot.mjs');
 for(const [name,reason]of [['TimeoutError','timeout'],['TypeError','network_error']]){const result=await sendWhatsApp(env(),'Test',{fetch:async()=>{const error=Error('Private URL fake-key');error.name=name;throw error;}});assert.equal(result.reason,reason);assert(!JSON.stringify(result).includes('fake-key'));}
});
test('one explicit connection test is idempotent, rate limited, and never sends arbitrary booking text',async()=>{
 const {whatsappDiagnostics}=await import('../lib/whatsapp-diagnostics.mjs');const e=env();let sends=0;
 const options={now:()=>Date.parse('2026-11-27T00:00:00Z'),fetch:async url=>{sends++;assert(new URL(url).searchParams.get('text').includes('not a new booking'));return new Response('Message queued.',{status:201});}};
 const body={confirm:true,requestId:'test:'+crypto.randomUUID()};
 const call=b=>whatsappDiagnostics(new Request('https://example.com/api/notifications/whatsapp/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}),e,options);
 assert.equal((await call({})).status,422);assert.equal(sends,0);
 assert.equal((await(await call(body)).json()).reason,'queued');await call(body);assert.equal(sends,1);
 assert.equal((await call({...body,requestId:'test:'+crypto.randomUUID()})).status,429);assert.equal(sends,1);
 const status=await(await whatsappDiagnostics(new Request('https://example.com/api/notifications/whatsapp'),e,options)).json();assert.equal(status.lastTest.reason,'queued');assert(!JSON.stringify(status).includes('fake-key'));
});
