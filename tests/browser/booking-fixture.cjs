module.exports=async function bookingFixture(page,options={}){
 const first=new Date(Date.now()+86400000).toISOString().slice(0,10),minimumStart=first+'T00:00:00Z',maximumStart=new Date(Date.parse(minimumStart)+30*86400000).toISOString();
 const submissions=[];let state='not_found';
 await page.route('**/api/booking/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname.split('/').pop();
  if(options.unavailable)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:'booking_permissions_required',message:'Scheduling unavailable'})});
  if(path==='config')return route.fulfill({contentType:'application/json',body:JSON.stringify({name:'Free Marketing Consultation',durationMinutes:30,minimumStart,maximumStart,questions:options.questions===false?[]:Array.isArray(options.questions)?options.questions:[{id:'budget',label:'Monthly marketing budget',type:'radioButton',options:['AED 1,999–2,999','Not sure'],required:true}]})});
  if(path==='availability'){const date=url.searchParams.get('date');return route.fulfill({contentType:'application/json',body:JSON.stringify({date,timeZone:url.searchParams.get('timeZone'),slots:[9,10].map(hour=>({start:date+'T'+hour.toString().padStart(2,'0')+':00:00Z',end:date+'T'+hour.toString().padStart(2,'0')+':30:00Z',token:'test-signed-slot-'+hour}))})});}
  if(path==='status')return route.fulfill({status:state==='not_found'?404:200,contentType:'application/json',body:JSON.stringify({state})});
  if(path==='appointments'){const input=route.request().postDataJSON();submissions.push(input);if(options.conflict&&submissions.length===1)return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({code:'slot_unavailable',message:'That time is no longer available. Please choose another time.'})});state=options.uncertain?'uncertain':'confirmed';return route.fulfill({status:options.uncertain?202:201,contentType:'application/json',body:JSON.stringify({state,reference:input.requestId,start:first+'T09:00:00Z',end:first+'T09:30:00Z',timeZone:input.timeZone})});}
  return route.fulfill({status:404,contentType:'application/json',body:'{}'});
 });return {submissions,first};
};
