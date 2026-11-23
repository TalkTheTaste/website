import {fetchAsset,notFound} from '../../lib/page-assets.mjs';
import {loadPosts} from '../../lib/journal-data.mjs';
import {renderJournalArticle} from '../../lib/journal-view.mjs';
export async function onRequestGet({request,env}){
 let slug;try{slug=decodeURIComponent(new URL(request.url).pathname.replace(/^\/blog\/+/, '').replace(/\/+$/,''));}catch{return notFound(request,env);}
 const posts=await loadPosts(request),post=posts.find(p=>p.slug===slug);if(!post)return notFound(request,env);
 const asset=await fetchAsset(request,env,'/assets/pages/journal-shell.txt');if(!asset.ok)return asset;
 return new Response(await renderJournalArticle(await asset.text(),post,posts),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=120'}});
}
export async function onRequestHead(context){const response=await onRequestGet(context);return new Response(null,{status:response.status,headers:response.headers});}
