'use strict';

const SITE_URL = 'https://talkthetaste.com';
const DEFAULT_IMAGE = `${SITE_URL}/assets/site/social-card.jpg`;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const slug = decodeURIComponent(url.pathname.replace(/^\/work\/+/, '').replace(/\/+$/, ''));

  if (!slug) return Response.redirect(`${SITE_URL}/work`, 301);

  if (!isOneDriveConfigured(env)) return notFound(request, env);

  let client;
  try {
    client = await findClientBySlug(env, slug);
  } catch {
    return notFound(request, env);
  }
  if (!client) return notFound(request, env);

  let detail;
  try {
    detail = await loadClientDetail(env, client);
  } catch {
    return notFound(request, env);
  }

  const html = renderCaseStudy(detail, slug);
  return htmlResponse(html);
}

export async function onRequestHead(context) {
  const getRequest = new Request(context.request.url, { method: 'GET', headers: context.request.headers });
  const response = await onRequestGet({ ...context, request: getRequest });
  return new Response(null, { status: response.status, headers: response.headers });
}

async function notFound(request, env) {
  const url = new URL('/404.html', request.url);
  const res = env.ASSETS?.fetch ? await env.ASSETS.fetch(new Request(url.toString(), request)) : await fetch(url.toString());
  const headers = new Headers(res.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(await res.text(), { status: 404, headers });
}

async function findClientBySlug(env, slug) {
  const cacheKey = `work_slug_lookup:${slug}:v1`;
  const cached = await readJsonCache(env, cacheKey);
  if (cached) return cached;

  const token = await graphAccessToken(env);
  const clientsPath = env.ONEDRIVE_CLIENTS_PATH || 'TalkTheTaste/Work Portfolio/Clients';
  const clientFolders = (await graphChildrenByPath(env, token, clientsPath, 200)).filter((item) => item.folder);
  const client = clientFolders.find((item) => item.id === slug || slugify(item.name) === slugify(slug));
  if (!client) return null;

  const result = { id: client.id, name: client.name };
  await writeJsonCache(env, cacheKey, result, 1800);
  return result;
}

async function loadClientDetail(env, client) {
  const cacheKey = `portfolio_client:${client.id}:v3`;
  const cached = await readJsonCache(env, cacheKey);
  if (cached) return cached;

  const token = await graphAccessToken(env);
  const meta = await graphJson(env, `${graphDriveBase(env)}/items/${encodeURIComponent(client.id)}?$select=id,name,lastModifiedDateTime`, token);
  const children = await graphChildrenById(env, token, client.id, 50);
  const photographyFolder = children.find((item) => item.folder && /^photography$/i.test(item.name));
  const videographyFolder = children.find((item) => item.folder && /^videography$/i.test(item.name));
  const [banner, photography, videography] = await Promise.all([
    findBannerMedia(env, token, children).catch(() => null),
    photographyFolder ? graphChildrenById(env, token, photographyFolder.id, 120) : [],
    videographyFolder ? graphChildrenById(env, token, videographyFolder.id, 120) : [],
  ]);
  const images = photography.filter(isImageItem).map((item) => mediaSummary(item, 'Photography'));
  const videos = videography.filter(isVideoItem).map((item) => mediaSummary(item, 'Videography'));
  const tags = [images.length ? 'Photography' : '', videos.length ? 'Videography' : ''].filter(Boolean);
  const hero = banner || images[0] || videos[0] || null;

  const payload = {
    id: meta.id,
    title: meta.name,
    category: tags.length ? tags.join(' + ') : 'Client Work',
    tags,
    description: mediaCountText(images.length, videos.length),
    image: hero ? hero.thumb : '',
    media: [...images, ...videos],
    updatedAt: meta.lastModifiedDateTime || '',
  };
  await writeJsonCache(env, cacheKey, payload, 1800);
  return payload;
}

function renderCaseStudy(project, slug) {
  const canonicalUrl = `${SITE_URL}/work/${slug}/`;
  const image = project.image ? `${SITE_URL}${project.image}` : DEFAULT_IMAGE;
  const title = `${project.title} | Talk The Taste`;
  const description = escapeHtml(`${project.title} - ${project.description || 'client work'} by Talk The Taste.`);
  const media = Array.isArray(project.media) ? project.media : [];

  const galleryHtml = media.length
    ? `<div class="media-gallery">${media.map((item, i) => mediaTile(item, project.title, i)).join('')}</div>`
    : `<p style="color:var(--text-muted);font-size:15px;">Gallery coming soon.</p>`;

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Work', item: `${SITE_URL}/work` },
          { '@type': 'ListItem', position: 3, name: project.title, item: canonicalUrl },
        ],
      },
      {
        '@type': 'CreativeWork',
        '@id': `${canonicalUrl}#work`,
        name: project.title,
        about: project.title,
        description: `${project.title} - ${project.description || 'client work'} by Talk The Taste.`,
        url: canonicalUrl,
        image: image,
        creator: { '@type': 'Organization', '@id': `${SITE_URL}/#business`, name: 'Talk The Taste' },
      },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="robots" content="index, follow">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${escapeAttr(canonicalUrl)}">
<meta property="og:locale" content="en_AE">
<meta property="og:site_name" content="Talk The Taste">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeAttr(title)}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${escapeAttr(canonicalUrl)}">
<meta property="og:image" content="${escapeAttr(image)}">
<meta property="og:image:secure_url" content="${escapeAttr(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(title)}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${escapeAttr(image)}">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,700&family=Space+Grotesk:wght@400;500;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/main.css?v=2">
<style>
.crumbs{font-size:13px;color:var(--text-xmuted);padding:132px 80px 0;}
.crumbs a{color:var(--text-xmuted);}
.client-hero{min-height:56vh;position:relative;display:flex;align-items:flex-end;padding:32px 80px 56px;background:var(--dark);overflow:hidden;margin-top:20px;}
.client-hero-media{position:absolute;inset:0;}
.client-hero-media img{width:100%;height:100%;object-fit:cover;display:block;}
.client-hero::after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(12,12,10,.88),rgba(12,12,10,.18) 55%,rgba(12,12,10,.28));}
.client-hero-copy{position:relative;z-index:2;max-width:760px;color:#fff;}
.client-kicker{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(250,250,248,.58);margin-bottom:16px;}
.client-title{font-family:'Cormorant Garamond',serif;font-size:clamp(40px,6vw,88px);font-weight:700;line-height:.95;letter-spacing:-1.4px;margin-bottom:16px;}
.client-desc{font-size:15px;color:rgba(250,250,248,.72);line-height:1.7;}
.client-body{padding:56px 80px 100px;}
.client-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:28px;flex-wrap:wrap;}
.client-section-head h2{font-family:'Space Grotesk',sans-serif;font-size:clamp(26px,3vw,40px);line-height:1;font-weight:700;letter-spacing:-1px;color:var(--text);margin:0;}
.client-status{font-size:13px;color:var(--text-muted);}
.media-gallery{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
.media-tile{background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;position:relative;}
.media-tile img,.media-tile video{width:100%;height:100%;aspect-ratio:4/5;object-fit:cover;display:block;background:var(--bg-alt);}
.media-tile.media-video img,.media-tile.media-video video{aspect-ratio:16/10;}
.back-link{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--text-muted);margin-top:14px;}
@media(max-width:1100px){.media-gallery{grid-template-columns:repeat(3,1fr)}}
@media(max-width:900px){.crumbs{padding:112px 24px 0}.client-hero{padding:24px 24px 40px}.client-body{padding:40px 24px 72px}.media-gallery{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<nav id="nav"><a href="/" class="nav-logo"><img src="/assets/logo.png" alt="TTT" class="logo-img"></a><ul class="nav-menu"><li><a href="/">Home</a></li><li><a href="/services">Services</a></li><li><a href="/work" class="active">Work</a></li><li><a href="/pricing">Pricing</a></li><li><a href="/blog">Blog</a></li><li><a href="/about">About</a></li></ul><div class="nav-right"><a href="https://wa.me/971565390316" class="nav-wa-link" target="_blank" rel="noopener">WhatsApp &#8599;</a><a href="/contact" class="nav-cta">Let's Talk</a></div></nav>
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/work">Work</a> / ${escapeHtml(project.title)}</nav>
<section class="client-hero">
  <div class="client-hero-media">${project.image ? `<img src="${escapeAttr(image)}" alt="${escapeAttr(project.title)}">` : ''}</div>
  <div class="client-hero-copy">
    <div class="client-kicker">${escapeHtml(project.category || 'Client Work')}</div>
    <h1 class="client-title">${escapeHtml(project.title)}</h1>
    <p class="client-desc">Work for ${escapeHtml(project.title)} by Talk The Taste &mdash; ${escapeHtml(project.description || 'selected photography and videography')}.</p>
  </div>
</section>
<section class="client-body">
  <div class="client-section-head">
    <h2>Project Gallery</h2>
    <div class="client-status">${escapeHtml(project.description || '')}</div>
  </div>
  ${galleryHtml}
  <a href="/work" class="back-link">&larr; Back to all work</a>
</section>
<footer>
  <div class="footer-top">
    <div><a href="/" class="footer-logo nav-logo"><img src="/assets/logo.png" class="logo-img" alt="Talk The Taste"></a><p class="footer-brand-desc">Dubai's creative agency. Marketing, branding, web, apps, and video, all under one roof.</p></div>
    <div><div class="footer-heading">Services</div><ul class="footer-links"><li><a href="/restaurant-marketing-dubai">Restaurant Marketing</a></li><li><a href="/social-media-marketing-dubai">Social Media Marketing</a></li><li><a href="/web-design-dubai">Web Design</a></li><li><a href="/branding-agency-dubai">Branding</a></li></ul></div>
    <div><div class="footer-heading">Company</div><ul class="footer-links"><li><a href="/about">About</a></li><li><a href="/work">Our Work</a></li><li><a href="/blog">Blog</a></li><li><a href="/contact">Contact</a></li><li><a href="/privacy-policy">Privacy Policy</a></li><li><a href="/terms-and-conditions">Terms &amp; Conditions</a></li></ul></div>
    <div><div class="footer-heading">Contact</div><ul class="footer-links"><li><a href="mailto:hi@talkthetaste.com">hi@talkthetaste.com</a></li><li><a href="tel:+971565390316">+971 56 539 0316</a></li><li>3B 22nd St, Al Quoz Industrial 4, Dubai, UAE</li></ul></div>
  </div>
  <div class="footer-bottom"><span>&copy; 2026 Talk The Taste. All rights reserved.</span><span>Dubai, UAE &middot; Irvine, CA</span></div>
</footer>
</body>
</html>`;
}

function mediaTile(item, clientTitle, index) {
  const isVideo = item.type === 'Videography' || /^video\//i.test(item.mimeType || '');
  const label = `${clientTitle} ${isVideo ? 'Video' : 'Photo'} ${index + 1}`;
  const src = item.thumb ? `${SITE_URL}${item.thumb}` : '';
  return `<div class="media-tile ${isVideo ? 'media-video' : ''}"><img src="${escapeAttr(src)}" alt="${escapeAttr(label)}" loading="lazy"></div>`;
}

function htmlResponse(html) {
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=120',
    },
  });
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
  return graphCollection(env, `${graphDriveBase(env)}/root:/${encodedPath}:/children?$top=${top}&select=id,name,file,folder,image,video,size,lastModifiedDateTime`, token, top);
}

async function graphChildrenById(env, token, id, top = 200) {
  return graphCollection(env, `${graphDriveBase(env)}/items/${encodeURIComponent(id)}/children?$top=${top}&select=id,name,file,folder,image,video,size,lastModifiedDateTime`, token, top);
}

async function graphCollection(env, url, token, maxItems = 200) {
  const items = [];
  let next = url;
  while (next && items.length < maxItems) {
    const data = await graphJson(env, next, token);
    items.push(...(data.value || []));
    next = data['@odata.nextLink'];
  }
  return items.slice(0, maxItems);
}

async function graphJson(env, url, token) {
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
  if (bannerFile) return mediaSummary(bannerFile, 'Photography');
  const bannerFolder = children.find((item) => item.folder && bannerName(item.name));
  if (!bannerFolder) return null;
  const files = await graphChildrenById(env, token, bannerFolder.id, 20);
  const item = files.find(isImageItem);
  return item ? mediaSummary(item, 'Photography') : null;
}

function mediaSummary(item, type) {
  return {
    id: item.id,
    name: item.name,
    type,
    mimeType: item.file?.mimeType || '',
    url: `/api/portfolio/media?id=${encodeURIComponent(item.id)}`,
    thumb: `/api/portfolio/thumb?id=${encodeURIComponent(item.id)}`,
  };
}

function isImageItem(item) {
  return item.file && (item.image || /^image\//i.test(item.file.mimeType || ''));
}

function isVideoItem(item) {
  return item.file && (item.video || /^video\//i.test(item.file.mimeType || ''));
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
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
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
