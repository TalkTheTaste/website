const {test} = require('node:test');
const assert = require('node:assert/strict');
const database = require('../lib/booking-node-db.cjs');

async function fixture(send) {
  const {handleBooking, signSlot} = await import('../lib/booking-api.mjs');
  const {listConsultations} = await import('../lib/booking-admin.mjs');
  let clock = Date.parse('2026-11-23T00:00:00Z');
  const env = {BOOKING_DB:database(':memory:'), SESSION_SECRET:'test-only-signing-secret-12345678901234567890', CALLMEBOT_PHONE:'+19995550123', CALLMEBOT_APIKEY:'fake-test-key'};
  const slot = {start:'2026-11-24T05:00:00.000Z', end:'2026-11-24T05:30:00.000Z', staffId:'staff'};
  const model = {service:{id:'consultation', displayName:'Free Marketing Consultation', defaultDuration:'PT30M', staffMemberIds:['staff']}, questions:[]};
  const graph = {business:'test-business', model:async()=>model, slots:async()=>[slot], call:async()=>({id:'test-appointment'})};
  const notifications = [];
  const options = {now:()=>clock, graph, fetch:async (url, init) => {notifications.push(new URL(url)); return send ? send(url, init) : new Response('Message queued');}};
  const body = {requestId:crypto.randomUUID(), slotToken:await signSlot(env,{start:slot.start,service:'consultation',exp:clock+600000}), name:'Test Visitor', email:'visitor@example.invalid', phone:'+971501234567', company:'Test Business', consent:true, timeZone:'Asia/Dubai', notes:'Private consultation notes'};
  const call = (path, data) => handleBooking(new Request('https://example.com/api/booking/'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})}),env,options);
  const admin = query => listConsultations(env.BOOKING_DB,new URL('https://example.com/api/consultations?'+(query||'')),clock);
  return {env, options, graph, slot, body, call, admin, notifications, advance:ms=>clock+=ms};
}

test('confirmed consultation stores consented details privately and sends one Dubai-time alert', async()=>{
  const f=await fixture();
  const response=await f.call('appointments',f.body);
  assert.equal(response.status,201);
  assert(!JSON.stringify(await response.json()).includes('visitor@example.invalid'));
  const data=await f.admin();
  assert.equal(data.upcoming,1); assert.equal(data.items.length,1);
  assert.equal(data.items[0].contact.email,f.body.email);
  assert.equal(data.items[0].contact.company,'Test Business');
  assert.equal(data.items[0].contact.consentAt,'2026-11-23T00:00:00.000Z');
  assert.equal(data.items[0].notification,'queued');
  assert.equal(f.notifications[0].origin,'https://api.callmebot.com');
  const text=f.notifications[0].searchParams.get('text');
  assert.match(text,/09:00/); assert.match(text,/Dubai/); assert.match(text,/Test Visitor/); assert.match(text,new RegExp(f.body.requestId));
  await f.call('appointments',f.body);
  const statuses=await Promise.all([f.call('status?id='+f.body.requestId),f.call('status?id='+f.body.requestId)]);
  assert.equal(f.notifications.length,1);
  assert(!JSON.stringify(await statuses[0].json()).includes('Private consultation notes'));
});

test('notification failure never changes a confirmed booking or automatically sends again',async()=>{
  const f=await fixture(async()=>{throw Error('Provider timeout with private query');});
  assert.equal((await f.call('appointments',f.body)).status,201);
  assert.equal((await f.admin()).items[0].notification,'unconfirmed');
  await f.call('status?id='+f.body.requestId);
  assert.equal(f.notifications.length,1);
});

test('an unverified booking is listed as needs checking and alerts only after verified recovery',async()=>{
  const f=await fixture();f.graph.call=async()=>{throw Error('Write response lost');};
  assert.equal((await f.call('appointments',f.body)).status,202);
  assert.equal(f.notifications.length,0);
  assert.equal((await f.admin('filter=attention')).items[0].state,'uncertain');
  assert.equal((await f.admin()).items.length,0);
  f.advance(60000);
  f.graph.collection=async()=>[{id:'recovered'}];
  f.graph.call=async()=>({id:'recovered',serviceId:'consultation',startDateTime:{dateTime:f.slot.start},endDateTime:{dateTime:f.slot.end},customerNotes:'Website booking reference: '+f.body.requestId,customerEmailAddress:f.body.email,customers:[{emailAddress:f.body.email}]});
  assert.equal((await(await f.call('status?id='+f.body.requestId)).json()).state,'confirmed');
  assert.equal(f.notifications.length,1);
  assert.equal((await f.admin()).items[0].notification,'queued');
});

test('rejected and cancelled attempts are not announced as booked and preserve their requested time',async()=>{
  const f=await fixture();f.graph.call=async()=>{const e=Error('Rejected');e.graphStatus=400;throw e;};
  assert.equal((await f.call('appointments',f.body)).status,422);
  assert.equal(f.notifications.length,0);
  const all=await f.admin('filter=all');
  assert.equal(all.items[0].state,'rejected');assert.equal(all.items[0].start,f.slot.start);
  const {finishAttempt}=await import('../lib/booking-store.mjs');
  await finishAttempt(f.env.BOOKING_DB,f.body.requestId,'cancelled',{});
  await f.call('status?id='+f.body.requestId);assert.equal(f.notifications.length,0);
});

test('missing provider configuration is visible privately and never blocks confirmation',async()=>{
  const f=await fixture();delete f.env.CALLMEBOT_APIKEY;
  assert.equal((await f.call('appointments',f.body)).status,201);
  assert.equal((await f.admin()).items[0].notification,'not_configured');
  assert.equal(f.notifications.length,0);
});

test('admin lists and searches older references without exposing internal Graph IDs or diagnostics',async()=>{
  const f=await fixture();await f.call('appointments',f.body);
  const {reserveAttempt,finishAttempt}=await import('../lib/booking-store.mjs');
  const id=crypto.randomUUID();await reserveAttempt(f.env.BOOKING_DB,id,'fingerprint',Date.parse('2026-11-22T00:00:00Z'));
  await finishAttempt(f.env.BOOKING_DB,id,'uncertain',{appointmentId:'private-microsoft-id',failure:{code:'private-error'}});
  const rows=await f.admin('filter=all');assert.equal(rows.total,2);
  assert(!JSON.stringify(rows).includes('private-microsoft-id'));assert(!JSON.stringify(rows).includes('private-error'));
  assert.equal((await f.admin('filter=all&search=Test%20Business')).items.length,1);
  assert.equal((await f.admin('filter=all&search=missing')).items.length,0);
});

test('CallMeBot HTTP or body errors report an unconfirmed alert without leaking its response',async()=>{
  const {sendWhatsApp}=await import('../lib/callmebot.mjs');
  const env={CALLMEBOT_PHONE:'+19995550123',CALLMEBOT_APIKEY:'fake-key'};
  for(const response of [new Response('ERROR: invalid apikey private-details'),new Response('private-details',{status:503})]){
    const sent=await sendWhatsApp(env,'Test',{fetch:async()=>response});
    assert.equal(sent.ok,false);assert(!JSON.stringify(sent).includes('private-details'));
  }
});
