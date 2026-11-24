// Keep provider credentials and response bodies out of public responses and logs.
export async function sendWhatsApp(env, text, {fetch: send = globalThis.fetch.bind(globalThis)} = {}) {
  if (!env.CALLMEBOT_PHONE || !env.CALLMEBOT_APIKEY) return {ok: false, skipped: true, reason: 'not_configured'};
  const url = new URL('https://api.callmebot.com/whatsapp.php');
  url.searchParams.set('phone', env.CALLMEBOT_PHONE);
  url.searchParams.set('apikey', env.CALLMEBOT_APIKEY);
  url.searchParams.set('text', text);
  try {
    const response = await send(url.href, {headers: {'User-Agent': 'talkthetaste-website'}, signal: AbortSignal.timeout(8000), redirect: 'error'});
    const body = await response.text();
    const ok = response.ok && !/\b(error|invalid|failed|not activated|not allowed)\b/i.test(body);
    return {ok, status: response.status};
  } catch { return {ok: false, reason: 'unconfirmed'}; }
}
