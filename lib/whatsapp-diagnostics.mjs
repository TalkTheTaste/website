import {initStore,limit} from './booking-store.mjs';
import {sendWhatsApp} from './callmebot.mjs';

export const whatsappReasons={queued:'Accepted into the CallMeBot queue; delivery is not confirmed.',rate_limited:'CallMeBot rate limit reached.',invalid_credentials:'CallMeBot rejected the configured API key.',recipient_paused:'CallMeBot reports the recipient is paused.',recipient_not_authorized:'The recipient needs to activate or authorize CallMeBot.',invalid_recipient:'CallMeBot rejected the configured recipient.',provider_unavailable:'CallMeBot is temporarily unavailable.',provider_rejected:'CallMeBot rejected the message.',unexpected_response:'CallMeBot did not acknowledge queueing the message.',timeout:'CallMeBot did not respond before the timeout; delivery is unknown.',network_error:'The website could not complete the connection to CallMeBot.',not_configured:'CallMeBot phone or API key is not configured.'};
export async function recordWhatsAppResult(db,id,result,now=Date.now()){
  await db.prepare('INSERT INTO booking_notification_diagnostics (id,reason,status,updated) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET reason=excluded.reason,status=excluded.status,updated=excluded.updated').bind(id,result.reason||'unexpected_response',result.status||null,now).run();
}
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
// The API router enforces the administrator session before calling this handler.
export async function whatsappDiagnostics(request,env,{fetch:send,now=Date.now}={}){
 const db=env.BOOKING_DB;if(!db)return json({message:'Notification diagnostics storage is unavailable.'},503);
 await initStore(db);
 const path=new URL(request.url).pathname;
 if(request.method==='GET'&&path==='/api/notifications/whatsapp'){
  const last=await db.prepare("SELECT reason,status,updated FROM booking_notification_diagnostics WHERE id LIKE 'test:%' ORDER BY updated DESC LIMIT 1").first();
  return json({configured:Boolean(env.CALLMEBOT_PHONE&&env.CALLMEBOT_APIKEY),lastTest:last?{reason:last.reason,status:last.status,description:whatsappReasons[last.reason],updatedAt:new Date(last.updated).toISOString()}:null});
 }
 if(request.method!=='POST'||path!=='/api/notifications/whatsapp/test')return json({message:'Not found.'},404);
 const url=new URL(request.url);if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return json({message:'Origin not allowed.'},403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({message:'Send the test request as JSON.'},415);
 if(Number(request.headers.get('Content-Length'))>1024)return json({message:'Invalid test request.'},413);
 const text=await request.text();if(text.length>1024)return json({message:'Invalid test request.'},413);
 let body;try{body=JSON.parse(text);}catch{return json({message:'Invalid test request.'},400);}
 if(body?.confirm!==true||typeof body.requestId!=='string'||!/^test:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))return json({message:'Confirm the test and supply a new test reference.'},422);
 const previous=await db.prepare('SELECT reason,status,updated FROM booking_notification_diagnostics WHERE id=?').bind(body.requestId).first();
 if(previous)return json({ok:previous.reason==='queued',reason:previous.reason,status:previous.status,description:whatsappReasons[previous.reason]||'This test has already been attempted.'});
 if(!await limit(db,'whatsapp-connection-test',1,60,now()))return json({message:'Please wait one minute before sending another connection test.'},429);
 const claim=await db.prepare("INSERT OR IGNORE INTO booking_notification_diagnostics (id,reason,status,updated) VALUES (?,'sending',NULL,?)").bind(body.requestId,now()).run();
 if(claim.meta.changes!==1)return json({message:'This connection test is already in progress.'},409);
 const result=await sendWhatsApp(env,'TalkTheTaste WhatsApp connection test. This is a diagnostic message only, not a new booking.',send?{fetch:send}:{});
 await recordWhatsAppResult(db,body.requestId,result,now());
 return json({...result,description:whatsappReasons[result.reason]||'The provider response was not recognized.'});
}
