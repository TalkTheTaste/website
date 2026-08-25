'use strict';

const SITE_URL = 'https://talkthetaste.com';
const WORK_PATH = '/work';
const WORK_ASSET_PATH = '/assets/pages/portfolio-source.txt';
const DEFAULT_IMAGE = `${SITE_URL}/assets/site/social-card.jpg`;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const clientParam = (url.searchParams.get('client') || url.searchParams.get('id') || '').trim();
  const assetResponse = await workAsset(request, env);

  if (!assetResponse.ok) return assetResponse;

  let html = await assetResponse.text();
  if (clientParam) {
    try {
      const preview = await clientPreview(env, clientParam);
      if (preview) html = injectPreview(html, preview);
    } catch {}
  }

  return htmlResponse(html, assetResponse, clientParam ? 300 : 0);
}

export async function onRequestHead({ request, env }) {
  const getRequest = new Request(request.url, { method: 'GET', headers: request.headers });
  const response = await onRequestGet({ request: getRequest, env });
  return new Response(null, { status: response.status, headers: response.headers });
}

async function workAsset(request, env) {
  const assetUrl = new URL(WORK_ASSET_PATH, request.url);
  const assetRequest = new Request(assetUrl.toString(), request);
  if (env.ASSETS?.fetch) return env.ASSETS.fetch(assetRequest);
  return fetch(assetRequest);
}

async function clientPreview(env, param) {
  const cacheKey = `portfolio_preview:${slugify(param)}:v1`;
  const cached = await readJsonCache(env, cacheKey);
  if (cached) return cached;

  if (!isOneDriveConfigured(env)) return null;

  const token = await graphAccessToken(env);
  const clientsPath = env.ONEDRIVE_CLIENTS_PATH || 'TalkTheTaste/Work Portfolio/Clients';
  const clientFolders = (await graphChildrenByPath(env, token, clientsPath, 200)).filter((item) => item.folder);
  const client = clientFolders.find((item) => item.id === param || slugify(item.name) === slugify(param));
  if (!client) return null;

  const children = await graphChildrenByPath(env, token, `${clientsPath}/${client.name}`, 50).catch(() => []);
  const photographyFolder = children.find((item) => item.folder && /^photography$/i.test(item.name));
  const videographyFolder = children.find((item) => item.folder && /^videography$/i.test(item.name));
  const imageCount = photographyFolder?.folder?.childCount || 0;
  const videoCount = videographyFolder?.folder?.childCount || 0;
  const banner = await findBannerMedia(env, token, children).catch(() => null);
  const firstImage = !banner && photographyFolder ? await firstMediaFromFolder(env, token, photographyFolder.id) : null;
  const hero = banner || firstImage || null;
  const slug = slugify(client.name);
  const preview = {
    title: `${client.name} Portfolio | Talk The Taste`,
    description: `${client.name} work by Talk The Taste: ${mediaCountText(imageCount, videoCount)}.`,
    url: `${SITE_URL}${WORK_PATH}?client=${encodeURIComponent(slug)}`,
    image: hero ? `${SITE_URL}${hero.thumb}` : DEFAULT_IMAGE,
    imageAlt: `${client.name} portfolio preview by Talk The Taste`,
  };

  await writeJsonCache(env, cacheKey, preview, 1800);
  return preview;
}

function injectPreview(html, preview) {
  let next = html;
  next = replaceTitle(next, preview.title);
  next = replaceMeta(next, 'name', 'description', preview.description);
  next = replaceCanonical(next, preview.url);
  next = replaceMeta(next, 'property', 'og:title', preview.title);
  next = replaceMeta(next, 'property', 'og:description', preview.description);
  next = replaceMeta(next, 'property', 'og:url', preview.url);
  next = replaceMeta(next, 'property', 'og:image', preview.image);
  next = replaceMeta(next, 'property', 'og:image:secure_url', preview.image);
  next = replaceMeta(next, 'property', 'og:image:type', 'image/jpeg');
  next = replaceMeta(next, 'property', 'og:image:width', '1200');
  next = replaceMeta(next, 'property', 'og:image:height', '630');
  next = replaceMeta(next, 'property', 'og:image:alt', preview.imageAlt);
  next = replaceMeta(next, 'name', 'twitter:card', 'summary_large_image');
  next = replaceMeta(next, 'name', 'twitter:title', preview.title);
  next = replaceMeta(next, 'name', 'twitter:description', preview.description);
  next = replaceMeta(next, 'name', 'twitter:image', preview.image);
  next = replaceMeta(next, 'name', 'twitter:image:alt', preview.imageAlt);
  return next;
}

function replaceTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
}

function replaceCanonical(html, href) {
  return html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${escapeAttr(href)}">`);
}

function replaceMeta(html, attrName, attrValue, content) {
  const re = new RegExp(`<meta\\s+${attrName}=["']${escapeRegExp(attrValue)}["'][^>]*>`, 'i');
  const tag = `<meta ${attrName}="${escapeAttr(attrValue)}" content="${escapeAttr(content)}">`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `    ${tag}\n</head>`);
}

function htmlResponse(html, sourceResponse, maxAge) {
  const headers = new Headers(sourceResponse.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.delete('X-Robots-Tag');
  if (maxAge > 0) headers.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=120`);
  else headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  return new Response(html, { status: 200, headers });
}

function isOneDriveConfigured(env) {
  return Boolean(env.MS_TENANT_ID && env.MS_CLIENT_ID && env.MS_CLIENT_SECRET && env.ONEDRIVE_USER);
}

async function graphAccessToken(env) {
  const body = new URLSearchParams({
    client_id: env.MS_CLIENT_ID,
    client_secret: env.MS_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(env.MS_TENANT_ID)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || 'Microsoft Graph token request failed');
  return data.access_token;
}

async function graphChildrenByPath(env, token, folderPath, top = 200) {
  const encodedPath = folderPath.split('/').map(encodeURIComponent).join('/');
  return graphCollection(`${graphDriveBase(env)}/root:/${encodedPath}:/children?$top=${top}&select=id,name,file,folder,image,video,size,lastModifiedDateTime`, token, top);
}

async function graphChildrenById(env, token, id, top = 200) {
  return graphCollection(`${graphDriveBase(env)}/items/${encodeURIComponent(id)}/children?$top=${top}&select=id,name,file,folder,image,video,size,lastModifiedDateTime`, token, top);
}

async function graphCollection(url, token, maxItems = 200) {
  const items = [];
  let next = url;
  while (next && items.length < maxItems) {
    const data = await graphJson(next, token);
    items.push(...(data.value || []));
    next = data['@odata.nextLink'];
  }
  return items.slice(0, maxItems);
}

async function graphJson(url, token) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Microsoft Graph request failed: ${response.status}`);
  return data;
}

function graphDriveBase(env) {
  return `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(env.ONEDRIVE_USER)}/drive`;
}

async function findBannerMedia(env, token, children) {
  const bannerFile = children.find((item) => item.file && bannerName(item.name) && isImageItem(item));
  if (bannerFile) return mediaSummary(bannerFile);
  const bannerFolder = children.find((item) => item.folder && bannerName(item.name));
  if (!bannerFolder) return null;
  const files = await graphChildrenById(env, token, bannerFolder.id, 20);
  const item = files.find(isImageItem);
  return item ? mediaSummary(item) : null;
}

async function firstMediaFromFolder(env, token, folderId) {
  const items = await graphChildrenById(env, token, folderId, 12);
  const item = items.find(isImageItem);
  return item ? mediaSummary(item) : null;
}

function mediaSummary(item) {
  return {
    id: item.id,
    thumb: `/api/portfolio/thumb?id=${encodeURIComponent(item.id)}`,
  };
}

function isImageItem(item) {
  return item.file && (item.image || /^image\//i.test(item.file.mimeType || ''));
}

function bannerName(name) {
  return String(name || '').replace(/\.[^.]+$/, '').toLowerCase() === 'banner';
}

function mediaCountText(imageCount, videoCount) {
  const parts = [];
  if (imageCount) parts.push(`${imageCount} photo${imageCount === 1 ? '' : 's'}`);
  if (videoCount) parts.push(`${videoCount} video${videoCount === 1 ? '' : 's'}`);
  return parts.length ? parts.join(' and ') : 'selected photography and videography';
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function readJsonCache(env, key) {
  if (!env.TTT_DATA) return null;
  try {
    return await env.TTT_DATA.get(key, 'json');
  } catch {
    return null;
  }
}

async function writeJsonCache(env, key, value, expirationTtl = 1800) {
  if (!env.TTT_DATA) return;
  try {
    await env.TTT_DATA.put(key, JSON.stringify(value), { expirationTtl });
  } catch {}
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
