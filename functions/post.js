'use strict';

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    return Response.redirect(`https://talkthetaste.com/blog/${encodeURIComponent(id)}/`, 301);
  }

  return Response.redirect('https://talkthetaste.com/blog', 301);
}
