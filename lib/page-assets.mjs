export async function fetchAsset(request, env, pathname) {
    let url = new URL(pathname, request.url);
    for (let redirects = 0; redirects < 4; redirects++) {
        // Do not forward conditional headers, ranges or methods from the page request.
        const assetRequest = new Request(url, { method: 'GET' });
        const response = env.ASSETS?.fetch ? await env.ASSETS.fetch(assetRequest) : await fetch(assetRequest);
        if (response.status >= 300 && response.status < 400 && response.headers.get('Location')) {
            const next = new URL(response.headers.get('Location'), url);
            if (next.origin !== new URL(request.url).origin) return new Response('Invalid asset redirect', { status: 500 });
            url = next;
            continue;
        }
        return response;
    }
    return new Response('Asset unavailable', { status: 500 });
}

export async function notFound(request, env) {
    const response = await fetchAsset(request, env, '/404.html');
    const body = await response.text();
    return new Response(body || '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page Not Found | Talk The Taste</title><h1>Page not found</h1><p><a href="/">Return Home</a></p></html>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
}
