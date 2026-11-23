import { WORK_CATALOG } from './work-catalog.mjs';
export const SITE = 'https://talkthetaste.com';
export const slugify = value => String(value || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const isVideo = item => item.type === 'Videography' || /^video\//i.test(item.mimeType || '');
export const projectSlug = project => slugify(project.title) || project.id;
export function imageId(project) {
  const cover=(project.media||[]).find(item=>!isVideo(item))||(project.media||[])[0];
  if(cover?.id)return cover.id;
  try { return new URL(project.imageOriginal || project.image, SITE).searchParams.get('id') || ''; } catch { return ''; }
}
export function imageURL(project, item) {
  const id = item?.id || imageId(project);
  if (!id || !/^[a-zA-Z0-9!_-]{8,160}$/.test(id)) return '';
  const label = 'portfolio';
  return `/portfolio-images/${projectSlug(project)}/${encodeURIComponent(id)}/${projectSlug(project)}-${label}-${id.slice(-8).toLowerCase()}.jpg`;
}
export function mediaCaption(project, item, index) {
  const name=String(item.name||'').replace(/\.[^.]+$/, '').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
  const camera=/^(?:\d|img|dsc|dji|pxl|mvimg|vid|screenshot|whatsapp|banner|untitled)/i.test(name)||/^(?:image|photo|video)(?:\s*\d*)?$/i.test(name);
  const subject=item.caption||(!camera&&name.length>2?name.slice(0,120):'');
  return `${project.title} — ${subject||`${isVideo(item)?'film':'photography'} ${index+1}`}`;
}
export function imageItems(project) {
  const items = (project.media || []).map((item, index) => ({ ...item, image: imageURL(project, item), caption: mediaCaption(project,item,index) }));
  const hero = imageId(project);
  if (hero && !items.some(item => item.id === hero)) items.unshift({ id: hero, image: imageURL(project), caption: `${project.title} — project photography`, type: 'Photography', updatedAt: project.imageUpdatedAt || project.updatedAt });
  return items.filter(item => item.image);
}
async function publicData(request, pathname) {
  const response = await fetch(new URL(pathname, request.url), { headers:{Accept:'application/json'}, signal:AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Portfolio unavailable');
  return response.json();
}
export async function loadWorkIndex(request) {
  try {
    const data = await publicData(request, '/api/portfolio');
    if (data.source === 'onedrive' && Array.isArray(data.projects)) return data.projects;
  } catch { /* The last published real portfolio remains available during an upstream outage. */ }
  return WORK_CATALOG.projects;
}
export async function loadWorkProject(request, slug, index) {
  const projects = index || await loadWorkIndex(request);
  const project = projects.find(p => projectSlug(p) === slug || p.id === slug);
  if (!project) return null;
  try {
    const detail = await publicData(request, '/api/portfolio/client?id=' + encodeURIComponent(project.id));
    if (detail.id === project.id && Array.isArray(detail.media)) return { ...project, ...detail };
  } catch { /* Snapshot contains public metadata only, never signed URLs or credentials. */ }
  return WORK_CATALOG.projects.find(p => p.id === project.id) || project;
}
export async function loadWorkProjects(request) {
  const projects = await loadWorkIndex(request); const result = []; let next = 0;
  await Promise.all(Array.from({length:3},async()=>{while(next<projects.length){const p=projects[next++];result.push(await loadWorkProject(request,projectSlug(p),projects));}}));
  return result.filter(Boolean).sort((a,b)=>a.title.localeCompare(b.title));
}
export function photoSource(id) { return `${SITE}/api/portfolio/thumb?id=${encodeURIComponent(id)}`; }
