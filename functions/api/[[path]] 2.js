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
    fullDesc: '<p>We designed and built a full-featured on-demand delivery platform from the ground up — native iOS and Android apps, a web-based merchant dashboard, and a driver app. The platform launched with 12 restaurant partners and processed over 1,000 orders in its first month.</p>',
    image: 'assets/site/delivery-web-app.jpg',
    color1: '#001508',
    color2: '#002912',
    featured: true,
    date: '2024-09-20',
    createdAt: 1775625745474,
  },
  {
    id: 'mnplq1qa_tmzomjg',
    title: 'Social Growth Campaign — F&B Brand',
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
    title: 'Full Brand Launch — Dubai Restaurant Group',
    category: 'Branding',
    tags: ['Branding', 'Web', 'Strategy'],
    description: 'Complete brand identity, website, and go-to-market strategy for a Dubai F&B group.',
    fullDesc: "<p>We partnered with this Dubai restaurant group from concept to launch — developing the visual identity, brand guidelines, website, social media presence, and marketing strategy that positioned them as one of the city's most talked-about dining destinations.</p><p>The project included logo design, color system, typography, interior signage, menu design, a custom website with online booking, and a 90-day social media launch campaign.</p>",
    image: 'assets/site/restaurant-brand-launch.jpg',
    color1: '#0c0c24',
    color2: '#18103c',
    featured: true,
    date: '2024-11-10',
    createdAt: 1775625745474,
  },
];

const DEFAULT_POSTS = [
  {
    id: 'seed-social-strategy',
    title: 'Why Your Brand Needs a Social Media Strategy in 2025',
    slug: 'social-media-strategy-2025',
    excerpt: "Most brands post without a plan. Here's why that's costing you and what a real social media strategy looks like.",
    content: "<h2>The Problem With Posting Without a Plan</h2><p>Most brands treat social media like a bulletin board — they post when they remember, share what feels relevant, and hope for engagement. But in 2025, the algorithm doesn't reward randomness. It rewards consistency, quality, and strategic intent.</p><h2>What a Real Strategy Looks Like</h2><p>A genuine social media strategy starts with your audience. Who are they? What do they care about? When are they online? Only after answering these questions should you think about content.</p><p>From there, you need a content mix: educational posts, behind-the-scenes content, social proof, and direct calls to action. Not every post should sell — but every post should serve.</p>",
    thumbnail: 'assets/site/social-growth-campaign.jpg',
    category: 'Social Media',
    author: 'TTT Team',
    featured: true,
    date: '2025-03-15',
    createdAt: 1775625745474,
  },
  {
    id: 'seed-website-conversion',
    title: 'The 5 Elements of a Website That Actually Converts',
    slug: 'website-conversion-elements',
    excerpt: "A beautiful website that doesn't convert is just expensive art. Here's what separates the top performers from the rest.",
    content: "<h2>Conversion Starts Before Design</h2><p>Before a single pixel is placed, a converting website requires a clear understanding of its visitor's intent. What are they looking for? What problem do they need solved? The design, copy, and structure should all serve the answer to these questions.</p><h2>1. A Magnetic Hero Section</h2><p>You have roughly 3 seconds. Your hero section needs to communicate clearly: what you do, who you're serving, and why you're the best choice.</p><h2>2. Speed and Mobile Fit</h2><p>Over 60% of web traffic is mobile. A conversion-focused website needs to load fast, scan cleanly, and make the next action obvious.</p>",
    thumbnail: 'assets/site/delivery-web-app.jpg',
    category: 'Web Design',
    author: 'TTT Team',
    featured: true,
    date: '2025-02-28',
    createdAt: 1775625745474,
  },
  {
    id: 'seed-creative-brief',
    title: 'How to Brief a Creative Agency (And Get Amazing Results)',
    slug: 'how-to-brief-a-creative-agency',
    excerpt: 'The quality of what you get from a creative agency is directly proportional to the quality of the brief you give them.',
    content: "<h2>Why the Brief Matters</h2><p>Creative agencies don't produce great work in a vacuum — they produce great work in response to clear direction. The brief is the foundation. A weak brief produces generic output. A strong brief produces work that genuinely moves your business forward.</p><h2>What to Include</h2><p>Include business context, the specific problem, the audience, success metrics, and constraints. Brief the problem clearly, then let the creative team solve it.</p>",
    thumbnail: 'assets/site/restaurant-brand-launch.jpg',
    category: 'Marketing',
    author: 'TTT Team',
    featured: false,
    date: '2025-01-20',
    createdAt: 1775625745474,
  },
];

const DEFAULTS = {
  projects: DEFAULT_PROJECTS,
  posts: DEFAULT_POSTS,
  settings: DEFAULT_SETTINGS,
  leads: [],
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
    });
  }

  if (path === '/projects' && request.method === 'GET') return json(await readStore(env, 'projects'));
  if (path === '/projects/save' && request.method === 'POST') {
    await requireAuth(request, env);
    return saveBody(request, env, 'projects', []);
  }

  if (path === '/posts' && request.method === 'GET') return json(await readStore(env, 'posts'));
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

  return json({ error: 'Not found' }, 404);
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
  const list = await readStore(env, 'leads');
  const lead = {
    id: Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
    fname: body.fname || '',
    lname: body.lname || '',
    email: body.email || '',
    company: body.company || '',
    service: body.service || '',
    budget: body.budget || '',
    message: body.message || '',
    date: new Date().toISOString().slice(0, 10),
    createdAt: Date.now(),
    read: false,
  };
  list.unshift(lead);
  await writeStore(env, 'leads', list);
  await notifyCallMeBot(env, lead);
  return json({ ok: true, id: lead.id });
}

async function notifyCallMeBot(env, lead) {
  const phone = env.CALLMEBOT_PHONE;
  const apikey = env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return;

  const text = [
    'New Talk The Taste lead',
    `Name: ${[lead.fname, lead.lname].filter(Boolean).join(' ') || '-'}`,
    `Email: ${lead.email || '-'}`,
    `Company: ${lead.company || '-'}`,
    `Service: ${lead.service || '-'}`,
    `Budget: ${lead.budget || '-'}`,
    `Message: ${lead.message || '-'}`,
  ].join('\n');

  const url = new URL('https://api.callmebot.com/whatsapp.php');
  url.searchParams.set('phone', phone);
  url.searchParams.set('text', text);
  url.searchParams.set('apikey', apikey);

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': 'talkthetaste-cloudflare-pages' },
  });

  if (!response.ok) {
    console.warn('CallMeBot notification failed', response.status);
  }
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

async function writeStore(env, key, value) {
  if (!env.TTT_DATA) {
    throw new Error('Missing TTT_DATA KV binding');
  }

  await env.TTT_DATA.put(key, JSON.stringify(value));
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
