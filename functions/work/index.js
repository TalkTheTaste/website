'use strict';

const SITE_URL = 'https://talkthetaste.com';
const WORK_PATH = '/work';
const WORK_ASSET_PATH = '/assets/pages/portfolio-source.txt';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const clientParam = (url.searchParams.get('client') || url.searchParams.get('id') || '').trim();

  if (clientParam) {
    return Response.redirect(`${SITE_URL}${WORK_PATH}/${encodeURIComponent(slugify(clientParam))}/`, 301);
  }

  const assetResponse = await workAsset(request, env);
  if (!assetResponse.ok) return assetResponse;
  const html = await assetResponse.text();
  return htmlResponse(html, assetResponse, 0);
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

function htmlResponse(html, sourceResponse, maxAge) {
  const headers = new Headers(sourceResponse.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.delete('X-Robots-Tag');
  if (maxAge > 0) headers.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=120`);
  else headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  return new Response(html, { status: 200, headers });
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
