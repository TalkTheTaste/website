import { fetchAsset, notFound } from '../../lib/page-assets.mjs';
import { SITE, loadWorkIndex, loadWorkProject, projectSlug } from '../../lib/work-data.mjs';
import { renderWorkDetail } from '../../lib/work-view.mjs';
export async function onRequestGet({request,env}){
 const url=new URL(request.url);let slug;
 try{slug=decodeURIComponent(url.pathname.replace(/^\/work\/+/, '').replace(/\/+$/, ''));}catch{return notFound(request,env);}
 if(!slug)return Response.redirect(SITE+'/work',301);
 const projects=await loadWorkIndex(request);const project=await loadWorkProject(request,slug,projects);
 if(!project)return notFound(request,env);
 if(url.pathname!==`/work/${projectSlug(project)}/`)return Response.redirect(`${SITE}/work/${projectSlug(project)}/`,301);
 const template=await fetchAsset(request,env,'/assets/pages/work-shell.txt');if(!template.ok)return template;
 return new Response(renderWorkDetail(await template.text(),project,projects),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=120, stale-while-revalidate=600','X-Robots-Tag':'index, follow, max-image-preview:large'}});
}
export async function onRequestHead(context){const r=await onRequestGet(context);return new Response(null,r);}
