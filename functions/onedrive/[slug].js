'use strict';

export async function onRequestGet({ env, params }) {
  const slug = String(params.slug || '').trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/.test(slug) || !env.TTT_DATA) {
    return notFound();
  }

  const links = await env.TTT_DATA.get('shortlinks', 'json').catch(() => null);
  const link = Array.isArray(links)
    ? links.find((item) => item.slug === slug && item.enabled !== false)
    : null;

  if (!link || !isSafeTarget(link.target)) return notFound();

  return new Response(null, {
    status: 302,
    headers: {
      Location: link.target,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}

function isSafeTarget(value) {
  try {
    const target = new URL(value);
    return target.protocol === 'https:' && !(target.hostname === 'talkthetaste.com' && target.pathname.startsWith('/onedrive/'));
  } catch {
    return false;
  }
}

function notFound() {
  return new Response('Short link not found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
