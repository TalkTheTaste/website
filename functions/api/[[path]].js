'use strict';

const DEFAULT_SETTINGS = {
  siteName: 'Talk The Taste',
  tagline: "Dubai's Full-Service Creative Agency",
  email: 'hi@talkthetaste.com',
  phone: '+971565390316',
  instagram: 'https://www.instagram.com/talkthetaste/',
  linkedin: 'https://www.linkedin.com/company/ttt-mm/',
  tiktok: '#',
  adminPass: 'ttt2025',
  web3formsKey: '',
};

const DEFAULT_PROJECTS = [
  {
    id: 'mnplq1qa_r8kbpuf',
    title: 'On-Demand Delivery App',
    category: 'Mobile App',
    tags: ['Mobile App', 'iOS', 'Android'],
    description: 'Native iOS and Android on-demand delivery platform built from MVP to full launch.',
    fullDesc: '<p>We designed and built a full-featured on-demand delivery platform from the ground up - native iOS and Android apps, a web-based merchant dashboard, and a driver app. The platform launched with 12 restaurant partners and processed over 1,000 orders in its first month.</p>',
    image: 'assets/site/delivery-web-app.jpg',
    color1: '#001508',
    color2: '#002912',
    featured: true,
    date: '2024-09-20',
    createdAt: 1775625745474,
  },
  {
    id: 'mnplq1qa_tmzomjg',
    title: 'Social Growth Campaign - F&B Brand',
    category: 'Social Media',
    tags: ['Social Media', 'Content', 'Ads'],
    description: '3x engagement growth in 90 days through strategic content and paid advertising.',
    fullDesc: '<p>This F&B brand came to us struggling with flat social media engagement. Within 90 days of our social media management, we tripled their engagement rate and doubled their follower count through strategic content creation, community management, and targeted paid campaigns.</p>',
    image: 'assets/site/social-growth-campaign.jpg',
    color1: '#1a0800',
    color2: '#2d1500',
    featured: true,
    date: '2024-10-05',
    createdAt: 1775625745474,
  },
  {
    id: 'mnplq1qa_h6qf44m',
    title: 'Full Brand Launch - Dubai Restaurant Group',
    category: 'Branding',
    tags: ['Branding', 'Web', 'Strategy'],
    description: 'Complete brand identity, website, and go-to-market strategy for a Dubai F&B group.',
    fullDesc: "<p>We partnered with this Dubai restaurant group from concept to launch - developing the visual identity, brand guidelines, website, social media presence, and marketing strategy that positioned them as one of the city's most talked-about dining destinations.</p><p>The project included logo design, color system, typography, interior signage, menu design, a custom website with online booking, and a 90-day social media launch campaign.</p>",
    image: 'assets/site/restaurant-brand-launch.jpg',
    color1: '#0c0c24',
    color2: '#18103c',
    featured: true,
    date: '2024-11-10',
    createdAt: 1775625745474,
  },
];

const DEFAULT_POSTS = [];

const DEFAULTS = {
  projects: DEFAULT_PROJECTS,
  posts: DEFAULT_POSTS,
  settings: DEFAULT_SETTINGS,
  leads: [],
  analytics: [],
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

export async function onRequest(context) {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  const path = '/' + normalizePath(params.path);

  try {
    const response = await routeRequest(path, request, env);
    return withCors(response, request);
  } catch (error) {
    return json({ error: error.message || 'Server error' }, error.status || 500, request);
  }
}

async function routeRequest(path, request, env) {
  if (path === '/auth/login' && request.method === 'POST') return login(request, env);
  if (path === '/auth/logout' && request.method === 'POST') return logout(request);
  if (path === '/auth/check' && request.method === 'GET') {
    return json({ loggedIn: await isAuthed(request, env) });
  }

  if (path === '/sync' && request.method === 'GET') {
    await requireAuth(request, env);
    return json({
      projects: await readStore(env, 'projects'),
      posts: await readStore(env, 'posts'),
      settings: await readStore(env, 'settings'),
      leads: await readStore(env, 'leads'),
      analytics: await readStore(env, 'analytics'),
    });
  }

  if (path === '/projects' && request.method === 'GET') return json(await readStore(env, 'projects'));
  if (path === '/projects/save' && request.method === 'POST') {
    await requireAuth(request, env);
    return saveBody(request, env, 'projects', []);
  }

  if (path === '/posts' && request.method === 'GET') {
    const posts = await readStore(env, 'posts');
    return json(posts.filter(isPostLive));
  }
  if (path === '/posts/save' && request.method === 'POST') {
    await requireAuth(request, env);
    return saveBody(request, env, 'posts', []);
  }

  if (path === '/settings' && request.method === 'GET') return json(await publicSettings(env));
  if (path === '/settings/save' && request.method === 'POST') {
    await requireAuth(request, env);
    const current = await readStore(env, 'settings');
    const next = { ...current, ...(await request.json()) };
    await writeStore(env, 'settings', next);
    return json({ ok: true });
  }

  if (path === '/leads' && request.method === 'GET') {
    await requireAuth(request, env);
    return json(await readStore(env, 'leads'));
  }
  if (path === '/leads/save' && request.method === 'POST') {
    await requireAuth(request, env);
    return saveBody(request, env, 'leads', []);
  }
  if (path === '/leads/submit' && request.method === 'POST') return submitLead(request, env);
  if (path === '/analytics/track' && request.method === 'POST') return trackAnalytics(request, env);
  if (path === '/analytics' && request.method === 'GET') {
    await requireAuth(request, env);
    return json(await readStore(env, 'analytics'));
  }
  if (path === '/analytics/clear' && request.method === 'POST') {
    await requireAuth(request, env);
    await writeStore(env, 'analytics', []);
    return json({ ok: true });
  }
  if (path === '/portfolio' && request.method === 'GET') return portfolioIndex(env);
  if (path === '/portfolio/client' && request.method === 'GET') return portfolioClient(request, env);
  if (path === '/portfolio/media' && (request.method === 'GET' || request.method === 'HEAD')) return portfolioMedia(request, env);
  if (path === '/portfolio/thumb' && (request.method === 'GET' || request.method === 'HEAD')) return portfolioThumb(request, env);

  return json({ error: 'Not found' }, 404);
}

async function portfolioIndex(env) {
  if (!isOneDriveConfigured(env)) {
    return portfolioJson({
      source: 'default',
      configured: false,
      env: oneDriveEnvStatus(env),
      projects: DEFAULT_PROJECTS,
      message: 'OneDrive portfolio is not configured.',
    });
  }

  const cacheKey = 'portfolio_index:v4';
  const cached = await readJsonCache(env, cacheKey);
  if (cached) return portfolioJson({ ...cached, cached: true }, 120);

  const token = await graphAccessToken(env);
  const clientsPath = env.ONEDRIVE_CLIENTS_PATH || 'TalkTheTaste/Work Portfolio/Clients';
  const clientFolders = (await graphChildren(env, token, clientsPath))
    .filter((item) => item.folder)
    .sort((a, b) => a.name.localeCompare(b.name));

  const clients = await Promise.all(clientFolders.map(async (client) => {
    const categoryFolders = await graphChildrenByPath(env, token, `${clientsPath}/${client.name}`, 50).catch(() => []);
    const photographyFolder = categoryFolders.find((item) => item.folder && /^photography$/i.test(item.name));
    const videographyFolder = categoryFolders.find((item) => item.folder && /^videography$/i.test(item.name));
    const imageCount = photographyFolder?.folder?.childCount || 0;
    const videoCount = videographyFolder?.folder?.childCount || 0;
    const banner = await findBannerMedia(env, token, categoryFolders).catch(() => null);
    const firstImage = !banner && photographyFolder ? await firstMediaFromFolder(env, token, photographyFolder.id, 'Photography') : null;
    const firstVideo = !banner && !firstImage && videographyFolder ? await firstMediaFromFolder(env, token, videographyFolder.id, 'Videography') : null;
    const hero = banner || firstImage || firstVideo || null;
    const tags = [
      imageCount ? 'Photography' : '',
      videoCount ? 'Videography' : '',
    ].filter(Boolean);

    return {
      id: client.id,
      title: client.name,
      category: tags.length ? tags.join(' + ') : 'Client Work',
      tags,
      description: mediaCountText(imageCount, videoCount),
      fullDesc: '',
      image: hero ? hero.thumb : '',
      color1: '#0C0C0A',
      color2: '#BF8D2C',
      media: [],
      mediaCount: imageCount + videoCount,
      updatedAt: client.lastModifiedDateTime || '',
    };
  }));

  const payload = {
    source: 'onedrive',
    configured: true,
    projects: clients.filter((client) => client.mediaCount),
  };
  await writeJsonCache(env, cacheKey, payload, 120);
  return portfolioJson(payload, 120);
}

async function portfolioClient(request, env) {
  if (!isOneDriveConfigured(env)) return json({ error: 'OneDrive portfolio is not configured' }, 503);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'Missing client id' }, 400);
  const cacheKey = `portfolio_client:${id}:v3`;
  const cached = await readJsonCache(env, cacheKey);
  if (cached) return portfolioJson({ ...cached, cached: true }, 1800);

  const token = await graphAccessToken(env);
  const client = await graphJson(`${graphDriveBase(env)}/items/${encodeURIComponent(id)}?$select=id,name,lastModifiedDateTime`, token);
  const children = await graphChildrenById(env, token, id, 50);
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
    id: client.id,
    title: client.name,
    category: tags.length ? tags.join(' + ') : 'Client Work',
    tags,
    description: mediaCountText(images.length, videos.length),
    image: hero ? hero.thumb : '',
    media: [...images, ...videos],
    updatedAt: client.lastModifiedDateTime || '',
  };
  await writeJsonCache(env, cacheKey, payload, 1800);
  return portfolioJson(payload, 1800);
}

async function portfolioMedia(request, env) {
  return graphMediaResponse(request, env, 'content');
}

async function portfolioThumb(request, env) {
  return graphMediaResponse(request, env, 'thumbnail');
}

async function graphMediaResponse(request, env, mode) {
  if (!isOneDriveConfigured(env)) return json({ error: 'OneDrive portfolio is not configured' }, 503);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'Missing media id' }, 400);

  const token = await graphAccessToken(env);
  const endpoint = mode === 'thumbnail'
    ? `${graphDriveBase(env)}/items/${encodeURIComponent(id)}/thumbnails/0/large/content`
    : `${graphDriveBase(env)}/items/${encodeURIComponent(id)}/content`;
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'manual',
  });
  const location = response.headers.get('Location');
  if (location) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: location,
        'Cache-Control': 'public, max-age=1800',
      },
    });
  }
  if (!response.ok) {
    return json({ error: `Microsoft Graph media request failed: ${response.status}` }, response.status);
  }
  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
      'Cache-Control': 'public, max-age=1800',
    },
  });
}

function isOneDriveConfigured(env) {
  const status = oneDriveEnvStatus(env);
  return Object.values(status).every(Boolean);
}

function oneDriveEnvStatus(env) {
  return {
    MS_TENANT_ID: Boolean(env.MS_TENANT_ID),
    MS_CLIENT_ID: Boolean(env.MS_CLIENT_ID),
    MS_CLIENT_SECRET: Boolean(env.MS_CLIENT_SECRET),
    ONEDRIVE_USER: Boolean(env.ONEDRIVE_USER),
  };
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
  if (!response.ok) {
    throw Object.assign(new Error(data.error_description || 'Microsoft Graph token request failed'), { status: 502 });
  }
  return data.access_token;
}

async function graphChildren(env, token, folderPath) {
  return graphChildrenByPath(env, token, folderPath, 200);
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
  if (!response.ok) {
    throw Object.assign(new Error(data.error?.message || `Microsoft Graph request failed: ${response.status}`), { status: 502 });
  }
  return data;
}

function graphDriveBase(env) {
  return `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(env.ONEDRIVE_USER)}/drive`;
}

function isImageItem(item) {
  return item.file && (item.image || /^image\//i.test(item.file.mimeType || ''));
}

function isVideoItem(item) {
  return item.file && (item.video || /^video\//i.test(item.file.mimeType || ''));
}

function mediaSummary(item, type) {
  return {
    id: item.id,
    name: item.name,
    type,
    mimeType: item.file?.mimeType || '',
    size: item.size || 0,
    updatedAt: item.lastModifiedDateTime || '',
    url: `/api/portfolio/media?id=${encodeURIComponent(item.id)}`,
    thumb: `/api/portfolio/thumb?id=${encodeURIComponent(item.id)}`,
  };
}

async function findBannerMedia(env, token, children) {
  const bannerFile = children.find((item) => item.file && bannerName(item.name) && (isImageItem(item) || isVideoItem(item)));
  if (bannerFile) return mediaSummary(bannerFile, isVideoItem(bannerFile) ? 'Videography' : 'Photography');
  const bannerFolder = children.find((item) => item.folder && bannerName(item.name));
  if (!bannerFolder) return null;
  const files = await graphChildrenById(env, token, bannerFolder.id, 20);
  const item = files.find((file) => isImageItem(file) || isVideoItem(file));
  return item ? mediaSummary(item, isVideoItem(item) ? 'Videography' : 'Photography') : null;
}

async function firstMediaFromFolder(env, token, folderId, type) {
  const items = await graphChildrenById(env, token, folderId, 12);
  const item = items.find((file) => type === 'Photography' ? isImageItem(file) : isVideoItem(file));
  return item ? mediaSummary(item, type) : null;
}

function bannerName(name) {
  return String(name || '').replace(/\.[^.]+$/, '').toLowerCase() === 'banner';
}

function mediaCountText(imageCount, videoCount) {
  const parts = [];
  if (imageCount) parts.push(`${imageCount} photo${imageCount === 1 ? '' : 's'}`);
  if (videoCount) parts.push(`${videoCount} video${videoCount === 1 ? '' : 's'}`);
  return parts.length ? parts.join(' and ') : 'Client portfolio media';
}

async function login(request, env) {
  const body = await request.json().catch(() => ({}));
  const settings = await readStore(env, 'settings');
  const configuredPass = env.ADMIN_PASSWORD || settings.adminPass || DEFAULT_SETTINGS.adminPass;

  if (body.password !== configuredPass) {
    return json({ error: 'Invalid password' }, 401);
  }

  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  const token = await signToken(env, expiresAt);

  return json(
    { ok: true },
    200,
    null,
    { 'Set-Cookie': cookieString('ttt_admin', token, { maxAge: 8 * 60 * 60, secure: isHttps(request) }) },
  );
}

function logout(request) {
  return json(
    { ok: true },
    200,
    null,
    { 'Set-Cookie': cookieString('ttt_admin', '', { maxAge: 0, secure: isHttps(request) }) },
  );
}

async function submitLead(request, env) {
  const body = await request.json().catch(() => ({}));
  const phone = normalizePhone(body.phone || `${body.countryCode || ''}${body.phoneRaw || ''}`);
  const validationErrors = validateLead(body, phone);
  if (validationErrors.length) {
    return json({ ok: false, error: 'Validation failed', fields: validationErrors }, 400);
  }

  const list = await readStore(env, 'leads');
  const lead = {
    id: Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
    fname: cleanText(body.fname),
    lname: cleanText(body.lname),
    email: cleanText(body.email).toLowerCase(),
    countryCode: cleanText(body.countryCode),
    phone,
    phoneRaw: cleanText(body.phoneRaw),
    company: cleanText(body.company),
    service: cleanText(body.service),
    budget: cleanText(body.budget),
    message: cleanText(body.message),
    contactConsent: Boolean(body.contactConsent),
    consentText: cleanText(body.consentText),
    consentAt: cleanText(body.consentAt),
    source: cleanText(body.source),
    interest: cleanText(body.interest),
    package: cleanText(body.package),
    page: cleanText(body.page),
    status: cleanText(body.status) || 'new',
    date: new Date().toISOString().slice(0, 10),
    createdAt: Date.now(),
    read: false,
  };
  list.unshift(lead);
  await writeStore(env, 'leads', list);
  const notification = await notifyCallMeBot(env, lead);
  return json({ ok: true, id: lead.id, notification });
}

async function notifyCallMeBot(env, lead) {
  const phone = env.CALLMEBOT_PHONE;
  const apikey = env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return { ok: false, skipped: true, reason: 'Missing CallMeBot configuration' };

  const text = [
    'New Talk The Taste lead',
    `Name: ${[lead.fname, lead.lname].filter(Boolean).join(' ') || '-'}`,
    `Email: ${lead.email || '-'}`,
    `Phone: ${lead.phone || '-'}`,
    `Company: ${lead.company || '-'}`,
    `Service: ${lead.service || '-'}`,
    `Budget: ${lead.budget || '-'}`,
    `Source: ${lead.source || '-'}`,
    `Interest: ${lead.interest || '-'}`,
    `Package: ${lead.package || '-'}`,
    `Page: ${lead.page || '-'}`,
    `Message: ${lead.message || '-'}`,
  ].join('\n');

  const url = new URL('https://api.callmebot.com/whatsapp.php');
  url.searchParams.set('phone', phone);
  url.searchParams.set('text', text);
  url.searchParams.set('apikey', apikey);

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': 'talkthetaste-cloudflare-pages' },
  });
  const body = await response.text().catch(() => '');

  if (!response.ok) {
    console.warn('CallMeBot notification failed', response.status, body);
    return { ok: false, status: response.status, body: body.slice(0, 300) };
  }

  return { ok: true, status: response.status, body: body.slice(0, 300) };
}

async function trackAnalytics(request, env) {
  const body = await request.json().catch(() => ({}));
  const page = cleanPath(body.page || body.path || '');
  if (!page || page.startsWith('/admin') || page.startsWith('/api')) return json({ ok: true, skipped: true });

  const now = new Date();
  const userAgent = cleanText(request.headers.get('User-Agent') || body.userAgent || '').slice(0, 300);
  if (isLikelyBot(userAgent)) return json({ ok: true, skipped: true });

  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';
  const visitorId = await visitorHash(env, ip, now);
  const event = {
    id: Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
    type: cleanText(body.type || 'pageview').slice(0, 40),
    page,
    title: cleanText(body.title).slice(0, 160),
    referrer: cleanText(body.referrer).slice(0, 300),
    label: cleanText(body.label).slice(0, 160),
    href: cleanText(body.href).slice(0, 300),
    source: cleanText(body.source).slice(0, 160),
    visitorId,
    sessionId: cleanText(body.sessionId).slice(0, 80),
    country: cleanText(request.headers.get('CF-IPCountry') || '').slice(0, 8),
    city: cleanText(request.cf?.city || '').slice(0, 80),
    region: cleanText(request.cf?.region || '').slice(0, 80),
    colo: cleanText(request.cf?.colo || '').slice(0, 12),
    timezone: cleanText(request.cf?.timezone || body.timezone || '').slice(0, 80),
    language: cleanText(body.language).slice(0, 40),
    viewport: cleanText(body.viewport).slice(0, 32),
    screen: cleanText(body.screen).slice(0, 32),
    connection: cleanText(body.connection).slice(0, 60),
    utmSource: cleanText(body.utmSource).slice(0, 120),
    utmMedium: cleanText(body.utmMedium).slice(0, 120),
    utmCampaign: cleanText(body.utmCampaign).slice(0, 160),
    metrics: cleanMetrics(body.metrics),
    durationMs: cleanNumber(body.durationMs),
    scrollDepth: cleanNumber(body.scrollDepth),
    device: deviceType(userAgent),
    browser: browserName(userAgent),
    os: osName(userAgent),
    createdAt: now.toISOString(),
  };

  const list = await readStore(env, 'analytics');
  list.unshift(event);
  await writeStore(env, 'analytics', list.slice(0, 2500));
  return json({ ok: true });
}

function cleanMetrics(value) {
  const metrics = value && typeof value === 'object' ? value : {};
  return {
    loadMs: cleanNumber(metrics.loadMs),
    domMs: cleanNumber(metrics.domMs),
    ttfbMs: cleanNumber(metrics.ttfbMs),
    transferSize: cleanNumber(metrics.transferSize),
    encodedBodySize: cleanNumber(metrics.encodedBodySize),
  };
}

function cleanNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round(number);
}

function cleanPath(value) {
  const text = cleanText(value);
  if (!text) return '';
  try {
    const url = text.startsWith('http') ? new URL(text) : new URL(text, 'https://talkthetaste.com');
    return `${url.pathname}${url.search}`.slice(0, 300);
  } catch {
    return text.startsWith('/') ? text.slice(0, 300) : `/${text}`.slice(0, 300);
  }
}

async function visitorHash(env, ip, now) {
  const day = now.toISOString().slice(0, 10);
  if (!ip) return `anon_${day}`;
  const value = `${day}:${ip}`;
  const hash = await hmac(env, value);
  return hash.slice(0, 16);
}

function isLikelyBot(userAgent) {
  return /bot|crawler|spider|preview|facebookexternalhit|whatsapp|slackbot|discordbot|linkedinbot|twitterbot|telegrambot/i.test(userAgent || '');
}

function deviceType(userAgent) {
  if (/ipad|tablet/i.test(userAgent)) return 'Tablet';
  if (/mobi|iphone|android/i.test(userAgent)) return 'Mobile';
  return 'Desktop';
}

function browserName(userAgent) {
  if (/edg\//i.test(userAgent)) return 'Edge';
  if (/chrome|crios/i.test(userAgent) && !/edg\//i.test(userAgent)) return 'Chrome';
  if (/safari/i.test(userAgent) && !/chrome|crios|android/i.test(userAgent)) return 'Safari';
  if (/firefox|fxios/i.test(userAgent)) return 'Firefox';
  return 'Other';
}

function osName(userAgent) {
  if (/iphone|ipad|ios/i.test(userAgent)) return 'iOS';
  if (/android/i.test(userAgent)) return 'Android';
  if (/mac os x|macintosh/i.test(userAgent)) return 'macOS';
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/linux/i.test(userAgent)) return 'Linux';
  return 'Other';
}

function validateLead(body, phone) {
  const errors = [];
  if (!cleanText(body.fname)) errors.push('fname');
  if (!cleanText(body.lname)) errors.push('lname');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(body.email))) errors.push('email');
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) errors.push('phone');
  if (cleanText(body.message).length < 10) errors.push('message');
  return errors;
}

function normalizePhone(value) {
  const raw = cleanText(value);
  const hasPlus = raw.trim().startsWith('+');
  const digits = raw.replace(/\D/g, '');
  return digits ? `${hasPlus ? '+' : '+'}${digits}` : '';
}

function cleanText(value) {
  return String(value || '').trim().slice(0, 2000);
}

async function saveBody(request, env, key, fallback) {
  const body = await request.json().catch(() => fallback);
  await writeStore(env, key, body);
  return json({ ok: true });
}

async function publicSettings(env) {
  const settings = await readStore(env, 'settings');
  const { adminPass, ...safeSettings } = settings;
  return safeSettings;
}

async function requireAuth(request, env) {
  if (!(await isAuthed(request, env))) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
}

async function isAuthed(request, env) {
  const token = parseCookies(request.headers.get('Cookie') || '').ttt_admin;
  if (!token) return false;

  const [expiresText, signature] = token.split('.');
  const expiresAt = Number(expiresText);
  if (!expiresAt || !signature || Date.now() > expiresAt) return false;

  return signature === await hmac(env, expiresText);
}

async function signToken(env, expiresAt) {
  const payload = String(expiresAt);
  return `${payload}.${await hmac(env, payload)}`;
}

async function hmac(env, value) {
  const secret = env.SESSION_SECRET || env.ADMIN_PASSWORD || DEFAULT_SETTINGS.adminPass;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function readStore(env, key) {
  if (!env.TTT_DATA) return DEFAULTS[key];

  const value = await env.TTT_DATA.get(key, 'json');
  if (value !== null) {
    if (
      (key === 'projects' || key === 'posts') &&
      Array.isArray(value) &&
      (value.length === 0 || isOutdatedSeedData(key, value))
    ) {
      await env.TTT_DATA.put(key, JSON.stringify(DEFAULTS[key]));
      return DEFAULTS[key];
    }
    return value;
  }

  const fallback = DEFAULTS[key];
  await env.TTT_DATA.put(key, JSON.stringify(fallback));
  return fallback;
}

function isOutdatedSeedData(key, value) {
  if (key !== 'projects') return false;

  const seedIds = new Set(DEFAULT_PROJECTS.map((project) => project.id));
  return value.length > 0 &&
    value.every((project) => seedIds.has(project.id)) &&
    value.every((project) => !project.image);
}

function isPostLive(post, now = Date.now()) {
  if (!post) return false;
  if (post.status === 'draft') return false;
  if (post.status === 'scheduled') {
    return post.scheduledAt && new Date(post.scheduledAt).getTime() <= now;
  }
  return true;
}

async function writeStore(env, key, value) {
  if (!env.TTT_DATA) {
    throw new Error('Missing TTT_DATA KV binding');
  }

  await env.TTT_DATA.put(key, JSON.stringify(value));
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

function normalizePath(path) {
  if (Array.isArray(path)) return path.join('/');
  return path || '';
}

function json(data, status = 200, request = null, extraHeaders = {}) {
  return withCors(
    new Response(JSON.stringify(data), {
      status,
      headers: { ...JSON_HEADERS, ...extraHeaders },
    }),
    request,
  );
}

function portfolioJson(data, maxAge = 300) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=120`,
    },
  });
}

function cookieString(name, value, options = {}) {
  const parts = [`${name}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (options.secure) parts.push('Secure');
  if (Number.isFinite(options.maxAge)) parts.push(`Max-Age=${options.maxAge}`);
  return parts.join('; ');
}

function isHttps(request) {
  return new URL(request.url).protocol === 'https:';
}

function parseCookies(header) {
  return Object.fromEntries(
    header.split(';').map((part) => {
      const [name, ...value] = part.trim().split('=');
      return [name, value.join('=')];
    }).filter(([name]) => name),
  );
}

function withCors(response, request) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(request)).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function corsHeaders(request) {
  const origin = request && request.headers ? request.headers.get('Origin') : null;
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };
}
