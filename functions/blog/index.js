import {fetchAsset} from '../../lib/page-assets.mjs';
import {loadPosts} from '../../lib/journal-data.mjs';
import {renderJournalIndex} from '../../lib/journal-view.mjs';
export async function onRequestGet({request,env}){
 const asset=await fetchAsset(request,env,'/assets/pages/journal-shell.txt');if(!asset.ok)return asset;
 const params=new URL(request.url).searchParams;
 const filtered=['q','topic','category'].some(key=>params.has(key));
 return new Response(await renderJournalIndex(await asset.text(),await loadPosts(request),params),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':filtered?'no-store':'public, max-age=0, s-maxage=120',...(filtered?{'X-Robots-Tag':'noindex, follow'}:{})}});
}
export async function onRequestHead(context){const response=await onRequestGet(context);return new Response(null,{status:response.status,headers:response.headers});}
