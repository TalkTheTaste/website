'use strict';
// Refresh only metadata already published by the public portfolio API.
const fs=require('node:fs');const path=require('node:path');
const base='https://talkthetaste.com';
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('Public portfolio returned '+r.status);return r.json();}
(async()=>{const index=await get(base+'/api/portfolio');if(index.source!=='onedrive'||!Array.isArray(index.projects)||!index.projects.length)throw Error('Live OneDrive data must be available before replacing the fallback.');const projects=[];let next=0;
await Promise.all(Array.from({length:3},async()=>{while(next<index.projects.length){const p=index.projects[next++];const d=await get(base+'/api/portfolio/client?id='+encodeURIComponent(p.id));if(d.id!==p.id||!Array.isArray(d.media))throw Error('Invalid client metadata');projects.push({...p,...d});}}));
projects.sort((a,b)=>a.title.localeCompare(b.title));const text=JSON.stringify({updatedAt:new Date().toISOString(),projects},null,2);
// Signed media URLs and Graph credentials must never become a committed fallback.
if(/@microsoft.graph.downloadUrl|access_token|client_secret|1drv\.com|sharepoint\.com/i.test(text))throw Error('Unexpected private or expiring data in the public response');
const target=path.join(__dirname,'../lib/work-catalog.mjs');fs.writeFileSync(target+'.tmp','// Last published real portfolio metadata. Refresh with npm run sync:work.\nexport const WORK_CATALOG = '+text+';\n');fs.renameSync(target+'.tmp',target);console.log('Saved '+projects.length+' public project records. Run npm run build to refresh the fallback.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
