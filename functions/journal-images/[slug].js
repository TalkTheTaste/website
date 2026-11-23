import {loadPosts,cover} from '../../lib/journal-data.mjs';
export async function onRequest({request,params}){
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
 const slug=String(params.slug||'').replace(/\.jpg$/,'');const post=(await loadPosts(request)).find(p=>p.slug===slug);const image=post&&await cover(post);
 if(!image?.data)return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 let bytes;try{bytes=Uint8Array.from(atob(image.data.replace(/\s/g,'')),c=>c.charCodeAt(0));}catch{return new Response('Invalid image',{status:404});}
 return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':image.mime,'Content-Length':String(bytes.length),'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=600, s-maxage=600','X-Robots-Tag':'index, follow, max-image-preview:large'}});
}
