const {test}=require('node:test');
const assert=require('node:assert/strict');
const database=require('../lib/booking-node-db.cjs');
async function fixture(){
 const {initStore,reserveAttempt,finishAttempt,rememberAppointment,findAttempt}=await import('../lib/booking-store.mjs');
 const {saveBookingContact}=await import('../lib/booking-admin.mjs');
 const {manageConsultation}=await import('../lib/booking-management.mjs');
 const db=database(':memory:');await initStore(db);
 const now=()=>Date.parse('2026-11-24T00:00:00Z'),id=crypto.randomUUID();
 const start='2026-11-25T08:00:00.000Z',end='2026-11-25T08:30:00.000Z';
 const input={name:'Meeting Tester',email:'test@example.invalid',phone:'+19995550123',company:'Test Business',notes:'All discussion topics',answers:[{question:'Budget',answer:'',selectedOptions:['Not sure']},{question:'Business goal',answer:'More enquiries',selectedOptions:[]}]};
 await reserveAttempt(db,id,'fingerprint',now());await finishAttempt(db,id,'confirmed',{reference:id,start,end,timeZone:'Asia/Dubai'});
 await saveBookingContact(db,id,input,'Free Marketing Consultation','Social media',now(),{start,end,timeZone:'Asia/Dubai'});
 await rememberAppointment(db,id,{appointmentId:'opaque/id==',serviceId:'consultation',customerId:'customer-1'});
 const a={id:'opaque/id==',serviceId:'consultation',serviceName:'Free Marketing Consultation',startDateTime:{dateTime:start},endDateTime:{dateTime:end},joinWebUrl:'https://teams.microsoft.com/l/meetup-join/test',customers:[{customerId:'customer-1',name:input.name,emailAddress:input.email,phone:input.phone,notes:'Website booking reference: '+id,customQuestionAnswers:[{question:'Extra detail',answer:'Microsoft answer'}]}],filledAttendeesCount:1};
 const writes=[];let mode='ok';
 const graph={business:'test-business',cancellationAllowed:async()=>true,collection:async()=>[a],call:async(path,args)=>{if(args?.method==='POST'){writes.push({path,...args});if(mode==='timeout')throw Error('Lost response');if(mode==='denied'){const e=Error('Denied');e.graphStatus=403;throw e;}return {};}assert.equal(path,'/appointments/opaque%2Fid%3D%3D');return a;}};
 const call=(body,origin)=>manageConsultation(new Request('https://example.com/api/consultations/'+id+(body?'/cancel':''),{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},...(body?{body:JSON.stringify(body)}:{})}),{BOOKING_DB:db},{graph,now});
 const payload=async()=>({reason:'Our team needs to reschedule this meeting.',confirm:true,version:(await(await call()).json()).version});
 return {db,id,a,graph,writes,call,payload,now,input,findAttempt,setMode:v=>mode=v};
}
test('meeting details include all submitted fields, Microsoft answers and a private join link',async()=>{
 const f=await fixture(),response=await f.call(),view=await response.json();assert.equal(response.status,200);
 assert.equal(view.contact.company,'Test Business');assert.equal(view.contact.notes,'All discussion topics');assert.equal(view.contact.answers.length,3);assert.equal(view.contact.answers[0].answer,'Not sure');assert.equal(view.contact.context,'Social media');assert(view.contact.consentAt);assert.equal(view.joinUrl,f.a.joinWebUrl);assert.equal(view.canCancel,true);assert.equal(view.attendeeCount,1);assert.equal(f.writes.length,0);assert.equal(response.headers.get('Cache-Control'),'no-store');assert(!JSON.stringify(view).includes('opaque/id=='));
});
test('cancel sends the exact required reason once, records history, and preserves booking details',async()=>{
 const f=await fixture(),body=await f.payload();const response=await f.call(body);assert.equal(response.status,200);assert.equal((await response.json()).state,'cancelled');
 assert.equal(f.writes.length,1);assert.equal(f.writes[0].path,'/appointments/opaque%2Fid%3D%3D/cancel');assert.deepEqual(f.writes[0].body,{cancellationMessage:body.reason});
 await f.call(body);assert.equal(f.writes.length,1);const detail=await(await f.call()).json();assert.equal(detail.state,'cancelled');assert.equal(detail.cancellation.reason,body.reason);assert.equal(detail.joinUrl,null);assert.equal(detail.contact.notes,'All discussion topics');assert.equal(detail.start,'2026-11-25T08:00:00.000Z');
});
test('cancellation requires a reason, explicit confirmation, same origin and a fresh meeting version',async()=>{
 const f=await fixture(),body=await f.payload();
 assert.equal((await f.call({...body,reason:'  '})).status,422);assert.equal((await f.call({...body,confirm:false})).status,422);assert.equal((await f.call(body,'https://other.example')).status,403);assert.equal((await f.call({...body,version:'stale'})).status,409);assert.equal(f.writes.length,0);
});
test('a shared meeting requires explicit acknowledgement and updates every linked website booking',async()=>{
 const f=await fixture(),other=crypto.randomUUID(),{reserveAttempt,finishAttempt,rememberAppointment}=await import('../lib/booking-store.mjs');
 await reserveAttempt(f.db,other,'other',f.now());await finishAttempt(f.db,other,'confirmed',{start:'2026-11-25T08:00:00.000Z',end:'2026-11-25T08:30:00.000Z'});await rememberAppointment(f.db,other,{appointmentId:f.a.id});
 f.a.customers.push({customerId:'customer-2',emailAddress:'other@example.invalid',notes:'Website booking reference: '+other});f.a.filledAttendeesCount=2;
 const body=await f.payload();assert.equal((await f.call(body)).status,409);assert.equal(f.writes.length,0);
 assert.equal((await f.call({...body,confirmShared:true})).status,200);assert.equal((await f.findAttempt(f.db,other)).state,'cancelled');assert.equal(f.writes.length,1);
});
test('a lost cancellation response stays unconfirmed and is never automatically sent twice',async()=>{
 const f=await fixture(),body=await f.payload();f.setMode('timeout');assert.equal((await f.call(body)).status,202);assert.equal((await f.findAttempt(f.db,f.id)).state,'confirmed');
 assert.equal((await f.call(body)).status,202);assert.equal(f.writes.length,1);const view=await(await f.call()).json();assert.equal(view.canCancel,false);assert.equal(view.cancellation.state,'uncertain');
});
test('definite permission errors preserve the meeting and permit a deliberate later retry',async()=>{
 const f=await fixture(),body=await f.payload();f.setMode('denied');assert.equal((await f.call(body)).status,503);assert.equal((await f.findAttempt(f.db,f.id)).state,'confirmed');
 f.setMode('ok');assert.equal((await f.call(body)).status,200);assert.equal(f.writes.length,2);
});
test('insufficient permissions and changed meeting times cannot trigger cancellation',async()=>{
 const f=await fixture(),body=await f.payload();f.graph.cancellationAllowed=async()=>false;assert.equal((await f.call(body)).status,503);assert.equal(f.writes.length,0);
 f.graph.cancellationAllowed=async()=>true;f.a.startDateTime.dateTime='2026-11-25T09:00:00Z';f.a.endDateTime.dateTime='2026-11-25T09:30:00Z';assert.equal((await f.call(body)).status,409);assert.equal(f.writes.length,0);
});
test('an unrelated customer on a known appointment cannot be cancelled, and unsafe join URLs are excluded',async()=>{
 const f=await fixture();f.a.joinWebUrl='javascript:alert(1)';assert.equal((await(await f.call()).json()).joinUrl,null);
 const body=await f.payload();f.a.customers=[{customerId:'unrelated',emailAddress:'unrelated@example.invalid'}];assert.equal((await f.call(body)).status,409);assert.equal(f.writes.length,0);
});
test('legacy confirmed bookings resolve by private reference and recover previously unrecorded contact details',async()=>{
 const f=await fixture();await f.db.prepare('DELETE FROM booking_links WHERE id=?').bind(f.id).run();await f.db.prepare('DELETE FROM booking_contacts WHERE id=?').bind(f.id).run();
 const view=await(await f.call()).json();assert.equal(view.contact.email,'test@example.invalid');assert.equal(view.joinUrl,f.a.joinWebUrl);assert.equal(f.writes.length,0);
});
test('concurrent cancellation requests cannot send repeated cancellation notifications',async()=>{
 const f=await fixture(),body=await f.payload();const responses=await Promise.all([f.call(body),f.call(body)]);assert(responses.some(r=>r.status===200));assert.equal(f.writes.length,1);
});
