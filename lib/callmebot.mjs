// Keep provider credentials and response bodies out of public responses and logs.
export async function sendWhatsApp(env, text, {fetch: send = globalThis.fetch.bind(globalThis)} = {}) {
  if (!env.CALLMEBOT_PHONE || !env.CALLMEBOT_APIKEY) return {ok: false, skipped: true, reason: 'not_configured'};
  const url = new URL('https://api.callmebot.com/whatsapp.php');
  url.searchParams.set('phone', env.CALLMEBOT_PHONE);
  url.searchParams.set('apikey', env.CALLMEBOT_APIKEY);
  url.searchParams.set('text', text);
  try {
    const response = await send(url.href, {headers: {'User-Agent': 'talkthetaste-website'}, signal: AbortSignal.timeout(15000), redirect: 'error'});
    const body = await response.text();
    // The API can return errors with HTTP 201 and echo the message in HTML.
    // Positive queue acknowledgement, not a generic HTTP success, is required.
    const provider = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (response.ok && /\bmessage\s+(?:has been\s+)?(?:queued|sent)\b/i.test(provider)) return {ok:true,status:response.status,reason:'queued'};
    const reason = response.status===429 || /too many requests|rate.?limit|currently a limit|maximum.*messages/i.test(provider) ? 'rate_limited'
      : /api.?key.{0,60}(?:invalid|incorrect|missing|wrong)|(?:invalid|incorrect|wrong).{0,30}api.?key/i.test(provider) ? 'invalid_credentials'
      : /paused|send.{0,20}resume/i.test(provider) ? 'recipient_paused'
      : /not activated|not authorized|not allowed|i allow callmebot|not registered/i.test(provider) ? 'recipient_not_authorized'
      : /phone.{0,60}(?:missing|invalid|incorrect)/i.test(provider) ? 'invalid_recipient'
      : response.status>=500 ? 'provider_unavailable'
      : /\berror\b|\bfailed\b/i.test(provider) ? 'provider_rejected' : 'unexpected_response';
    return {ok:false,status:response.status,reason};
  } catch (error) { return {ok: false, reason:['TimeoutError','AbortError'].includes(error.name)?'timeout':'network_error'}; }
}
