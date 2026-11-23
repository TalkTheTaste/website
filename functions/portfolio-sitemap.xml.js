import { SITE, loadWorkProjects, projectSlug, imageItems, escapeHTML } from '../lib/work-data.mjs';
export async function onRequestGet({request}){
 const projects=await loadWorkProjects(request);
 const entries=projects.map(project=>{
  const images=[...new Set(imageItems(project).map(item=>SITE+item.image))];
  const dates=['2026-11-23T00:00:00Z',project.updatedAt,...(project.media||[]).map(m=>m.updatedAt)].map(d=>Date.parse(d)).filter(Number.isFinite);
  return `<url><loc>${SITE}/work/${escapeHTML(projectSlug(project))}/</loc>${dates.length?`<lastmod>${new Date(Math.max(...dates)).toISOString()}</lastmod>`:''}${images.map(url=>`<image:image><image:loc>${escapeHTML(url)}</image:loc></image:image>`).join('')}</url>`;
 });
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${entries.join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=600, stale-while-revalidate=3600'}});
}
export async function onRequestHead(context){const r=await onRequestGet(context);return new Response(null,r);}
