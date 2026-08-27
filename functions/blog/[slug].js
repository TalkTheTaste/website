'use strict';

const SITE_URL = 'https://talkthetaste.com';
const POST_TEMPLATE_PATH = '/post.html';
const DEFAULT_IMAGE = `${SITE_URL}/assets/site/social-card.jpg`;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const slug = decodeURIComponent(url.pathname.replace(/^\/blog\/+/, '').replace(/\/+$/, ''));

  if (!slug) {
    return Response.redirect(`${SITE_URL}/blog`, 301);
  }

  const post = await findPost(request, slug);
  if (!post) {
    return notFound(request, env);
  }

  const templateResponse = await fetchTemplate(request, env);
  if (!templateResponse.ok) return templateResponse;

  const html = await templateResponse.text();
  const rendered = renderPost(html, post);

  return htmlResponse(rendered, templateResponse);
}

export async function onRequestHead(context) {
  const getRequest = new Request(context.request.url, { method: 'GET', headers: context.request.headers });
  const response = await onRequestGet({ ...context, request: getRequest });
  return new Response(null, { status: response.status, headers: response.headers });
}

async function findPost(request, slug) {
  const apiUrl = new URL('/api/posts', request.url);
  const res = await fetch(new Request(apiUrl.toString(), request));
  if (!res.ok) return null;
  const posts = await res.json();
  if (!Array.isArray(posts)) return null;
  return posts.find((p) => p.slug === slug) || null;
}

async function fetchTemplate(request, env) {
  const templateUrl = new URL(POST_TEMPLATE_PATH, request.url);
  const templateRequest = new Request(templateUrl.toString(), request);
  if (env.ASSETS?.fetch) return env.ASSETS.fetch(templateRequest);
  return fetch(templateRequest);
}

async function notFound(request, env) {
  const templateUrl = new URL('/404.html', request.url);
  const templateRequest = new Request(templateUrl.toString(), request);
  const res = env.ASSETS?.fetch ? await env.ASSETS.fetch(templateRequest) : await fetch(templateRequest);
  const headers = new Headers(res.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(await res.text(), { status: 404, headers });
}

function renderPost(html, post) {
  const canonicalUrl = `${SITE_URL}/blog/${post.slug}/`;
  const image = post.thumbnail
    ? (post.thumbnail.startsWith('http') ? post.thumbnail : `${SITE_URL}/${post.thumbnail.replace(/^\/+/, '')}`)
    : DEFAULT_IMAGE;
  const title = `${post.title} | Talk The Taste`;
  const description = truncate(stripHtml(post.excerpt || post.content || ''), 158);
  const dateIso = toIsoDate(post.date);
  const author = post.author || 'Talk The Taste';
  const category = post.category || 'Insights';
  const readingMinutes = estimateReadingMinutes(post.content);

  let next = html;
  next = replaceTitle(next, title);
  next = replaceMeta(next, 'name', 'description', description);
  next = replaceCanonical(next, canonicalUrl);
  next = replaceMeta(next, 'property', 'og:type', 'article');
  next = replaceMeta(next, 'property', 'og:title', post.title);
  next = replaceMeta(next, 'property', 'og:description', description);
  next = replaceMeta(next, 'property', 'og:url', canonicalUrl);
  next = replaceMeta(next, 'property', 'og:image', image);
  next = replaceMeta(next, 'property', 'og:image:secure_url', image);
  next = replaceMeta(next, 'property', 'og:image:type', 'image/jpeg');
  next = replaceMeta(next, 'property', 'og:image:width', '1200');
  next = replaceMeta(next, 'property', 'og:image:height', '630');
  next = replaceMeta(next, 'property', 'og:image:alt', post.title);
  next = replaceMeta(next, 'property', 'article:published_time', dateIso);
  next = replaceMeta(next, 'property', 'article:author', author);
  next = replaceMeta(next, 'name', 'twitter:card', 'summary_large_image');
  next = replaceMeta(next, 'name', 'twitter:title', post.title);
  next = replaceMeta(next, 'name', 'twitter:description', description);
  next = replaceMeta(next, 'name', 'twitter:image', image);
  next = replaceMeta(next, 'name', 'twitter:image:alt', post.title);

  next = replaceBreadcrumbSchema(next, post, canonicalUrl);
  next = injectArticleSchema(next, post, canonicalUrl, image, dateIso, author);

  next = fillById(next, 'postCat', escapeHtml(category));
  next = fillById(next, 'postDate', escapeHtml(formatDisplayDate(post.date)) + (readingMinutes ? ` &middot; ${readingMinutes} min read` : ''));
  next = fillById(next, 'postTitle', escapeHtml(post.title));
  next = fillById(next, 'postExcerpt', escapeHtml(post.excerpt || ''));
  next = fillById(next, 'postAuthor', escapeHtml(author));
  next = fillById(next, 'postAvatar', escapeHtml(initials(author)));
  next = fillById(next, 'postContent', post.content || '', true);
  next = fillHeroImage(next, post, image);

  next = next.replace(
    /<div class="post-layout" id="postLayout" style="display:none;">/,
    '<div class="post-layout" id="postLayout">'
  );
  next = next.replace(
    /<div id="postNotFound" style="display:none;" class="empty-state">[\s\S]*?<\/div>\s*<\/div>/,
    '<div id="postNotFound" style="display:none;" class="empty-state"></div>'
  );

  return next;
}

function fillById(html, id, value, raw = false) {
  const re = new RegExp(`(id="${escapeRegExp(id)}"[^>]*>)([\\s\\S]*?)(<\\/(?:div|h1|span)>)`, 'i');
  if (re.test(html)) {
    return html.replace(re, (match, open, _old, close) => `${open}${raw ? value : value}${close}`);
  }
  return html;
}

function fillHeroImage(html, post, image) {
  const markup = post.thumbnail
    ? `<img src="${escapeAttr(image)}" alt="${escapeAttr(post.title)}" class="post-hero-img-bg" width="1200" height="525" loading="eager">`
    : `<div class="post-hero-img-bg gradient" style="background:linear-gradient(135deg,#0c0c24 0%,#18103c 100%);width:100%;height:100%;"></div>`;
  return html.replace(
    /<div class="post-hero-img" id="postHeroWrap"><\/div>/,
    `<div class="post-hero-img" id="postHeroWrap">${markup}</div>`
  );
}

function replaceBreadcrumbSchema(html, post, canonicalUrl) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonicalUrl },
    ],
  };
  const re = /<script type="application\/ld\+json">\s*{\s*"@context": "https:\/\/schema\.org",\s*"@type": "BreadcrumbList"[\s\S]*?<\/script>/;
  const tag = `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function injectArticleSchema(html, post, canonicalUrl, image, dateIso, author) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${canonicalUrl}#article`,
    headline: post.title,
    description: truncate(stripHtml(post.excerpt || post.content || ''), 200),
    image: [image],
    datePublished: dateIso,
    dateModified: dateIso,
    inLanguage: 'en',
    author: { '@type': 'Person', name: author },
    publisher: { '@type': 'Organization', '@id': `${SITE_URL}/#business`, name: 'Talk The Taste' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
  };
  const tag = `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  return html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function htmlResponse(html, sourceResponse) {
  const headers = new Headers(sourceResponse.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.delete('X-Robots-Tag');
  headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=120');
  return new Response(html, { status: 200, headers });
}

function replaceTitle(html, title) {
  return html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
}
function replaceMeta(html, attrName, attrValue, content) {
  const re = new RegExp(`<meta\\s+${attrName}=["']${escapeRegExp(attrValue)}["'][^>]*>`, 'i');
  const tag = `<meta ${attrName}="${escapeAttr(attrValue)}" content="${escapeAttr(content)}">`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `    ${tag}\n</head>`);
}
function replaceCanonical(html, href) {
  return html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${escapeAttr(href)}">`);
}
function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function truncate(value, max) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}
function toIsoDate(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
function formatDisplayDate(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
function estimateReadingMinutes(content) {
  const words = stripHtml(content || '').split(/\s+/).filter(Boolean).length;
  return words ? Math.max(1, Math.round(words / 200)) : 0;
}
function initials(name) {
  return String(name || 'TTT')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
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
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
