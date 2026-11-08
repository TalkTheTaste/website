// Defense in depth for old Pages configurations that still publish the repo root.
export async function onRequest(context) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(context.request.url).pathname); } catch { return new Response('Not found', { status: 404 }); }
  const privatePath = /(?:^|\/)\./.test(pathname) || /^\/(?:data|lib|functions|scripts|tests|reports|node_modules)(?:\/|$)/i.test(pathname) ||
    /^\/(?:server\.js|package(?:-lock)?\.json|wrangler\.toml|(?:console|stderr)\.log|.*\.md)$/i.test(pathname);
  if (privatePath) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return context.next();
}
