const windows={UTC:'UTC','Arabian Standard Time':'Asia/Dubai','Arab Standard Time':'Asia/Riyadh','India Standard Time':'Asia/Kolkata','Pakistan Standard Time':'Asia/Karachi','GMT Standard Time':'Europe/London','W. Europe Standard Time':'Europe/Berlin','Romance Standard Time':'Europe/Paris','Pacific Standard Time':'America/Los_Angeles','Mountain Standard Time':'America/Denver','Central Standard Time':'America/Chicago','Eastern Standard Time':'America/New_York','Singapore Standard Time':'Asia/Singapore','Tokyo Standard Time':'Asia/Tokyo','AUS Eastern Standard Time':'Australia/Sydney'};
const formatters=new Map();
export function zone(value){const clean=String(value||'').replace(/\s+/g,' ').trim();const aliases={'(UTC) Coordinated Universal Time':'UTC','(UTC+04:00) Abu Dhabi, Muscat':'Asia/Dubai','(UTC-08:00) Pacific Time (US & Canada)':'America/Los_Angeles'};const z=windows[clean]||aliases[clean]||clean;if(typeof z!=='string'||z.length>100)throw Error('Invalid time zone');new Intl.DateTimeFormat('en',{timeZone:z}).format();return z;}
export function parts(value,timeZone){const z=zone(timeZone);let f=formatters.get(z);if(!f){f=new Intl.DateTimeFormat('en-CA',{timeZone:z,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});formatters.set(z,f);}return Object.fromEntries(f.formatToParts(new Date(value)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));}
export function day(value,timeZone){const p=parts(value,timeZone);return `${p.year}-${p.month}-${p.day}`;}
export function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
export function plusDay(value,n=1){return new Date(Date.parse(value+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);}
export function midnight(date,timeZone){return wallTime(date,'00:00:00',timeZone);}
export function wallTime(date,time,timeZone){const target=Date.parse(date+'T'+time+'Z');if(!Number.isFinite(target))throw Error('Invalid local date');let candidate=target;for(let i=0;i<4;i++){const p=parts(candidate,timeZone);const represented=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);const difference=target-represented;if(!difference)return candidate;candidate+=difference;}throw Error('Nonexistent local time');}
export function duration(value){const m=String(value||'').match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);if(!m||!m.slice(1).some(Boolean))throw Error('Unsupported duration');return (Number(m[1]||0)*86400+Number(m[2]||0)*3600+Number(m[3]||0)*60+Number(m[4]||0))*1000;}
export function graphTime(value){if(!value?.dateTime)return NaN;const text=value.dateTime.replace(/(\.\d{3})\d+/, '$1');if(/Z$|[+-]\d\d:\d\d$/.test(text))return Date.parse(text);const [date,time]=text.split('T');return wallTime(date,time,zone(value.timeZone||'UTC'));}
const weekdays=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
export function ranges(date,hours,timeZone){const weekday=weekdays[new Date(date+'T12:00:00Z').getUTCDay()];const entry=(hours||[]).find(h=>String(h.day).toLowerCase()===weekday);return (entry?.timeSlots||[]).flatMap(t=>{try{const start=wallTime(date,t.startTime,timeZone);const end=wallTime(date,t.endTime,timeZone);return end>start?[[start,end]]:[];}catch{return [];}});}
export function withinHours(start,end,hours,timeZone){const date=day(start,timeZone);return ranges(date,hours,timeZone).some(([a,b])=>a<=start&&end<=b);}
export function calculateSlots({business,service,staff,availability,businessZone,date,timeZone,now=Date.now()}){
 const policy={...business.schedulingPolicy,...Object.fromEntries(Object.entries(service.schedulingPolicy||{}).filter(([,v])=>v!==null&&v!==undefined))};
 const length=duration(service.defaultDuration),step=duration(policy.timeSlotInterval),lead=duration(policy.minimumLeadTime),advance=duration(policy.maximumAdvance),pre=duration(service.preBuffer||'PT0S'),post=duration(service.postBuffer||'PT0S');
 if(length<=0||length>10800000||step<60000||advance<=0)throw Error('Unsupported scheduling policy');
 const from=midnight(date,timeZone),to=midnight(plusDay(date),timeZone);const first=day(from-86400000,businessZone),last=day(to+86400000,businessZone);const results=new Map();
 for(let businessDate=first;businessDate<=last;businessDate=plusDay(businessDate)){
  const overrides=(policy.customAvailabilities||[]).filter(w=>w.startDate<=businessDate&&businessDate<=w.endDate);
  const policies=overrides.length?overrides:[policy.generalAvailability||{availabilityType:'bookWhenStaffAreFree'}];
  if(policies.some(p=>!['bookWhenStaffAreFree','customWeeklyHours'].includes(p.availabilityType)))continue;
  for(const [open,close] of ranges(businessDate,business.businessHours,businessZone))for(let start=open;start+length<=close;start+=step){
   const end=start+length,a=start-pre,b=end+post;
   if(start<from||start>=to||start<now+lead||start>now+advance||a<open||b>close)continue;
   if(policies.some(p=>p.availabilityType==='customWeeklyHours'&&!withinHours(a,b,p.businessHours,businessZone)))continue;
   for(const member of staff){
    if(!service.staffMemberIds?.includes(member.id)||member.membershipStatus&&member.membershipStatus!=='active')continue;
    if(member.useBusinessHours===false&&!withinHours(a,b,member.workingHours,zone(member.timeZone)))continue;
    const items=availability.find(v=>v.staffId===member.id)?.availabilityItems||[];
    const spans=items.map(v=>({start:graphTime(v.startDateTime),end:graphTime(v.endDateTime),status:String(v.status).toLowerCase()}));
    if(spans.some(v=>v.status!=='available'&&v.start<b&&a<v.end))continue;
    const free=spans.filter(v=>v.status==='available'&&v.end>a&&v.start<b).sort((x,y)=>x.start-y.start);let covered=a;for(const span of free){if(span.start>covered)break;covered=Math.max(covered,span.end);}
    if(covered<b)continue;
    if(!results.has(start))results.set(start,{start:new Date(start).toISOString(),end:new Date(end).toISOString(),staffId:member.id});break;
   }
  }
 }
 return [...results.values()].sort((a,b)=>a.start.localeCompare(b.start));
}
