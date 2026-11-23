import { fetchAsset } from '../../lib/page-assets.mjs';
import { SITE, loadWorkIndex, projectSlug, slugify } from '../../lib/work-data.mjs';
import { renderWorkIndex } from '../../lib/work-view.mjs';
export async function onRequestGet({request,env}){
 const url=new URL(request.url);const client=url.searchParams.get('client')||url.searchParams.get('id');
 if(client){const projects=await loadWorkIndex(request);const p=projects.find(p=>p.id===client||projectSlug(p)===slugify(client));return Response.redirect(`${SITE}/work/${encodeURIComponent(p?projectSlug(p):slugify(client))}/`,301);}
 const template=await fetchAsset(request,env,'/assets/pages/work-shell.txt');if(!template.ok)return template;
 const projects=await loadWorkIndex(request);
 return new Response(renderWorkIndex(await template.text(),projects),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=120, stale-while-revalidate=600','X-Robots-Tag':'index, follow, max-image-preview:large'}});
}
export async function onRequestHead(context){const r=await onRequestGet(context);return new Response(null,r);}
