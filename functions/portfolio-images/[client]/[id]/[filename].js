import { loadWorkIndex, loadWorkProject, imageItems, imageURL, photoSource } from '../../../../lib/work-data.mjs';

export async function onRequest(context) {
  const {request, params, waitUntil} = context;
  if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
  const id=String(params.id||'');
  if (!/^[a-zA-Z0-9!_-]{8,160}$/.test(id)) return new Response('Not found',{status:404});
  const key=new Request(new URL(new URL(request.url).pathname,request.url),{method:'GET'});
  const cache=typeof caches!=='undefined'?caches.default:null;
  if(cache){try{const hit=await cache.match(key);if(hit){if(request.method==='HEAD'){hit.body?.cancel().catch(()=>{});return new Response(null,hit);}return hit;}}catch{ /* Cache failure must not hide a published image. */ }}
  const index=await loadWorkIndex(request);
  const project=await loadWorkProject(request,String(params.client||''),index);
  // Only images already exposed by a public project can be requested here.
  const item=project&&imageItems(project).find(item=>item.id===id);
  if(!item)return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
  const canonical=imageURL(project,item);
  // Hero filenames have their own canonical URL, shared by index and detail pages.
  const requested=new URL(request.url).pathname;
  const allowed=[canonical,...(imageURL(project)?[imageURL(project)]:[])];
  if(!allowed.includes(requested))return Response.redirect(new URL(canonical,request.url),301);
  let upstream;
  try {upstream=await fetch(photoSource(id),{redirect:'follow',signal:AbortSignal.timeout(25000)});}catch{return new Response('Image temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store','Retry-After':'60'}});}
  if(!upstream.ok||!/^image\/(jpeg|png|webp|avif|gif)/i.test(upstream.headers.get('Content-Type')||''))return new Response('Image unavailable',{status:502,headers:{'Cache-Control':'no-store'}});
  const headers=new Headers({'Content-Type':upstream.headers.get('Content-Type'),'Cache-Control':'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400','X-Content-Type-Options':'nosniff','X-Robots-Tag':'index, follow, max-image-preview:large'});
  for(const name of ['Content-Length','ETag','Last-Modified'])if(upstream.headers.has(name))headers.set(name,upstream.headers.get(name));
  const response=new Response(upstream.body,{status:200,headers});
  if(cache&&waitUntil)waitUntil(cache.put(key,response.clone()).catch(()=>{}));
  if(request.method==='HEAD'){response.body?.cancel().catch(()=>{});return new Response(null,{status:200,headers});}
  return response;
}
