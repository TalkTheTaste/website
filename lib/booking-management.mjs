import {BookingGraph} from './booking-api.mjs';
import {graphTime} from './booking-time.mjs';
import {initStore,findAttempt,finishAttempt,rememberAppointment,lock,unlock,limit} from './booking-store.mjs';

const error=(status,code,message)=>{throw Object.assign(new Error(message),{status,code});};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const parse=value=>JSON.parse(value||'{}');
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&Boolean(a.trim())&&a.trim().toLowerCase()===b.trim().toLowerCase();
const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('');
const meetingURL=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};

async function record(db,id){
  const attempt=await findAttempt(db,id);if(!attempt)error(404,'not_found','This consultation request could not be found.');
  const contact=await db.prepare('SELECT details FROM booking_contacts WHERE id=?').bind(id).first();
  const link=await db.prepare('SELECT details FROM booking_links WHERE id=?').bind(id).first();
  return {attempt,contact:parse(contact?.details),link:{...parse(attempt.result),...parse(link?.details)}};
}

async function resolve(graph,db,id,r){
  const reference='Website booking reference: '+id;
  const attendee=a=>(a.customers||[]).find(c=>String(c.notes||'').includes(reference)||same(c.emailAddress,r.contact.email)||Boolean(r.link.customerId&&c.customerId===r.link.customerId)||String(a.customerNotes||'').includes(reference)&&same(c.emailAddress,a.customerEmailAddress));
  const matched=a=>Boolean(attendee(a))&&(!r.link.serviceId||a.serviceId===r.link.serviceId);
  if(r.link.appointmentId){try{const a=await graph.call('/appointments/'+encodeURIComponent(r.link.appointmentId));if(matched(a))return {a,customer:attendee(a)};}catch(e){if(e.graphStatus!==404)throw e;}}
  const start=r.link.start||r.contact.requested?.start,end=r.link.end||r.contact.requested?.end;
  if(!start||!end)error(409,'cannot_identify','This older request cannot be safely matched to a meeting. Please use Microsoft Bookings.');
  const entries=await graph.collection('/calendarView?'+new URLSearchParams({start:new Date(Date.parse(start)-86400000).toISOString(),end:new Date(Date.parse(end)+86400000).toISOString()}));
  const matches=[];
  for(const candidate of entries.slice(0,100)){
    if(graphTime(candidate.startDateTime||candidate.start)!==Date.parse(start))continue;
    let a;try{a=await graph.call('/appointments/'+encodeURIComponent(candidate.id));}catch(e){if(e.graphStatus===404)continue;throw e;}
    if(matched(a)&&graphTime(a.startDateTime||a.start)===Date.parse(start)&&graphTime(a.endDateTime||a.end)===Date.parse(end))matches.push({a,customer:attendee(a)});
  }
  if(matches.length!==1)error(409,'cannot_identify','We could not uniquely verify this meeting. Please check Microsoft Bookings before making changes.');
  await rememberAppointment(db,id,{appointmentId:matches[0].a.id,serviceId:matches[0].a.serviceId});
  return matches[0];
}

function mergeContact(stored,customer,a){
  const liveAnswers=(customer.customQuestionAnswers||[]).map(q=>({question:q.question||q.questionId,answer:q.answer||(q.selectedOptions||[]).join(', ')}));
  const answers=[...(stored.answers||[])];
  for(const answer of liveAnswers)if(!answers.some(q=>q.question===answer.question))answers.push(answer);
  return {...stored,name:stored.name||customer.name||a.customerName||'',email:stored.email||customer.emailAddress||'',phone:stored.phone||customer.phone||'',
    company:stored.company||String(customer.notes||'').match(/(?:^|\n)Business: ([^\n]+)/)?.[1]||'',answers};
}
async function snapshot(graph,db,id,r,now){
  const {a,customer}=await resolve(graph,db,id,r);
  const cancellation=await db.prepare('SELECT state,reason,updated FROM booking_cancellations WHERE appointment_id=?').bind(a.id).first();
  const start=new Date(graphTime(a.startDateTime||a.start)).toISOString(),end=new Date(graphTime(a.endDateTime||a.end)).toISOString();
  const attendeeCount=Math.max(a.customers?.length||0,Number(a.filledAttendeesCount)||0);
  const version=await hash(JSON.stringify({id:a.id,start,end,updated:a.lastUpdatedDateTime||null,customers:(a.customers||[]).map(c=>[c.customerId||'',c.emailAddress||'']).sort()}));
  const permission=graph.cancellationAllowed?await graph.cancellationAllowed():true;
  return {a,body:{reference:id,state:r.attempt.state,contact:mergeContact(r.contact,customer,a),start,end,service:a.serviceName||r.contact.service||'Free Marketing Consultation',
    timeZone:r.link.timeZone||r.contact.requested?.timeZone||customer.timeZone||'Asia/Dubai',joinUrl:meetingURL(a.joinWebUrl||a.anonymousJoinWebUrl),
    attendeeCount,version,cancellation:cancellation?{state:cancellation.state,reason:cancellation.reason,updatedAt:new Date(cancellation.updated).toISOString()}:null,
    permissionRequired:!permission,canCancel:r.attempt.state==='confirmed'&&permission&&Date.parse(end)>now&&!['sending','uncertain','cancelled'].includes(cancellation?.state),
    microsoftNotes:customer.notes||a.customerNotes||'',checkedAt:new Date(now).toISOString()}};
}

async function finalizeCancellation(db,appointmentId,selected,reason,now,a){
  const linked=await db.prepare("SELECT id FROM booking_links WHERE json_extract(details,'$.appointmentId')=?").bind(appointmentId).all();
  const references=new Set([selected,...linked.results.map(r=>r.id)]);
  // Include other website participants of the same shared meeting, even if not yet linked locally.
  for(const customer of a.customers||[])for(const match of String(customer.notes||'').matchAll(/Website booking reference: ([0-9a-f-]{36})/gi))references.add(match[1]);
  for(const id of references){const attempt=await findAttempt(db,id);if(attempt){const result=parse(attempt.result);await rememberAppointment(db,id,{appointmentId,serviceId:a.serviceId||null});await finishAttempt(db,id,'cancelled',{...result,cancelledAt:new Date(now).toISOString()});}}
  await db.prepare("UPDATE booking_cancellations SET state='cancelled',updated=? WHERE appointment_id=?").bind(now,appointmentId).run();
}

// The caller must enforce the administrator session before invoking this handler.
export async function manageConsultation(request,env,{graph=new BookingGraph(env),now=Date.now}={}){
  const db=env.BOOKING_DB;
  try{
    if(!db)error(503,'storage_required','Consultation storage is unavailable.');await initStore(db);
    const url=new URL(request.url),path=url.pathname.replace(/^\/api\/consultations\/?/,'');
    if(request.method==='GET'&&path==='capabilities')return json({canCancel:await graph.cancellationAllowed()});
    const match=path.match(/^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(\/cancel)?$/i);
    if(!match)error(404,'not_found','Not found.');
    const id=match[1],cancel=Boolean(match[2]);
    if(request.method!==(cancel?'POST':'GET'))return json({message:'Method not allowed.'},405);
    if(!await limit(db,'admin-consultation-read',120,60,now()))error(429,'rate_limited','Please wait a minute and try again.');
    if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)error(403,'origin_not_allowed','Please use the admin panel on this website.');
    let body;
    if(cancel){
      if(!request.headers.get('Content-Type')?.startsWith('application/json'))error(415,'invalid_request','Send the cancellation as JSON.');
      if(Number(request.headers.get('Content-Length'))>8192)error(413,'invalid_request','The cancellation request is too large.');
      const text=await request.text();if(text.length>8192)error(413,'invalid_request','The cancellation request is too large.');
      try{body=JSON.parse(text);}catch{error(400,'invalid_request','Invalid cancellation request.');}
      if(typeof body?.reason!=='string'||body.reason.trim().length<5||body.reason.trim().length>1000)error(422,'reason_required','Enter a cancellation reason between 5 and 1,000 characters.');
      if(body.confirm!==true)error(422,'confirmation_required','Confirm that the customer and staff should be notified.');
    }
    const r=await record(db,id);
    const accepted=await db.prepare("SELECT appointment_id,state,reason,updated FROM booking_cancellations WHERE (appointment_id=? OR reference=?) AND state='cancelled' ORDER BY updated DESC LIMIT 1").bind(r.link.appointmentId||'',id).first();
    if(accepted&&r.attempt.state!=='cancelled'){await finalizeCancellation(db,accepted.appointment_id,id,accepted.reason,accepted.updated,{customers:[]});r.attempt.state='cancelled';}
    if(r.attempt.state==='cancelled'){
      const audit=await db.prepare('SELECT state,reason,updated FROM booking_cancellations WHERE appointment_id=? OR reference=? ORDER BY updated DESC LIMIT 1').bind(r.link.appointmentId||'',id).first();
      return json({reference:id,state:'cancelled',contact:r.contact,start:r.link.start||r.contact.requested?.start||null,end:r.link.end||r.contact.requested?.end||null,joinUrl:null,canCancel:false,cancellation:audit?{state:audit.state,reason:audit.reason,updatedAt:new Date(audit.updated).toISOString()}:null});
    }
    if(!cancel)return json((await snapshot(graph,db,id,r,now())).body);
    const owner=crypto.randomUUID();if(!await lock(db,graph.business,owner,now()))error(409,'meeting_busy','Another booking change is in progress. Please try again shortly.');
    try{
      const fresh=await record(db,id),view=await snapshot(graph,db,id,fresh,now()),a=view.a;
      if(view.body.cancellation?.state==='cancelled'){await finalizeCancellation(db,a.id,id,view.body.cancellation.reason,now(),a);return json({state:'cancelled',reference:id});}
      if(['sending','uncertain'].includes(view.body.cancellation?.state))return json({state:'uncertain',message:'The previous cancellation is still unconfirmed. Check Microsoft Bookings before trying again.'},202);
      if(view.body.permissionRequired)error(503,'cancellation_permission_required','Microsoft requires Bookings.ReadWrite.All application permission with admin consent to cancel meetings.');
      if(!view.body.canCancel)error(409,'not_cancellable','Only an upcoming or ongoing confirmed meeting can be cancelled.');
      if(body.version!==view.body.version)error(409,'meeting_changed','The meeting changed since you opened it. Refresh its details and review the cancellation again.');
      if(view.body.attendeeCount>1&&body.confirmShared!==true)error(409,'shared_meeting','This is a shared meeting. Confirm cancellation for all customers attached to it.');
      const reason=body.reason.trim();
      const claim=await db.prepare("INSERT INTO booking_cancellations (appointment_id,reference,state,reason,created,updated) VALUES (?,?,'sending',?,?,?) ON CONFLICT(appointment_id) DO UPDATE SET reference=excluded.reference,state='sending',reason=excluded.reason,updated=excluded.updated WHERE booking_cancellations.state='failed'").bind(a.id,id,reason,now(),now()).run();
      if(claim.meta.changes!==1)return json({state:'uncertain',message:'A cancellation is already being processed. Check Microsoft Bookings before trying again.'},202);
      try{await graph.call('/appointments/'+encodeURIComponent(a.id)+'/cancel',{method:'POST',body:{cancellationMessage:reason}});}
      catch(e){
        const definite=[400,401,403,404,409,412,422,429].includes(e.graphStatus);
        await db.prepare('UPDATE booking_cancellations SET state=?,updated=? WHERE appointment_id=?').bind(definite?'failed':'uncertain',now(),a.id).run();
        if(!definite)return json({state:'uncertain',message:'Microsoft did not confirm the cancellation. Check Microsoft Bookings before trying again; it has not been marked cancelled here.'},202);
        error(e.graphStatus===403?503:409,'cancellation_rejected',e.graphStatus===403?'Microsoft denied cancellation. Check Bookings.ReadWrite.All application permission and admin consent.':'Microsoft did not accept the cancellation. Refresh the meeting details and check Microsoft Bookings.');
      }
      // Persist Microsoft's acceptance before changing other records. A retry never sends the reason again.
      await db.prepare("UPDATE booking_cancellations SET state='cancelled',updated=? WHERE appointment_id=?").bind(now(),a.id).run();
      await finalizeCancellation(db,a.id,id,reason,now(),a);
      return json({state:'cancelled',reference:id,cancellation:{state:'cancelled',reason,updatedAt:new Date(now()).toISOString()}});
    }finally{await unlock(db,graph.business,owner);}
  }catch(e){return json({code:e.code||'meeting_unavailable',message:e.code?e.message:'We could not load or update this meeting. Please refresh or check Microsoft Bookings.'},e.status||503);}
}
