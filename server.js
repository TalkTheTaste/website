'use strict';
const express = require('express');
const fs      = require('fs');
const path    = require('path');
const session = require('express-session');
const { Readable } = require('stream');

const app  = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const memoryCache = new Map();

// ── Bootstrap data directory ─────────────────────────────────
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

const FILES = {
    projects: path.join(DATA, 'projects.json'),
    posts:    path.join(DATA, 'posts.json'),
    settings: path.join(DATA, 'settings.json'),
    leads:    path.join(DATA, 'leads.json'),
};

const DEFAULT_SETTINGS = {
    siteName:    'Talk The Taste',
    tagline:     "Dubai's Full-Service Creative Agency",
    email:       'hi@talkthetaste.com',
    phone:       '+971565390316',
    instagram:   'https://www.instagram.com/talkthetaste/',
    linkedin:    'https://www.linkedin.com/company/ttt-mm/',
    tiktok:      '#',
    adminPass:   'ttt2025',
    web3formsKey: '',
};

// Init files if they don't exist
if (!fs.existsSync(FILES.projects)) fs.writeFileSync(FILES.projects, '[]');
if (!fs.existsSync(FILES.posts))    fs.writeFileSync(FILES.posts,    '[]');
if (!fs.existsSync(FILES.leads))    fs.writeFileSync(FILES.leads,    '[]');
if (!fs.existsSync(FILES.settings)) fs.writeFileSync(FILES.settings, JSON.stringify(DEFAULT_SETTINGS, null, 2));

// ── Helpers ──────────────────────────────────────────────────
function read(file)        { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return file === FILES.settings ? {} : []; } }
function write(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function isPostLive(post, now = Date.now()) {
    if (!post) return false;
    if (post.status === 'draft') return false;
    if (post.status === 'scheduled') return post.scheduledAt && new Date(post.scheduledAt).getTime() <= now;
    return true;
}

// ── Middleware ───────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'ttt-session-secret-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }, // 8 hours
}));

// Serve static files
app.use(express.static(ROOT, { index: 'index.html' }));

// Auth guard
const auth = (req, res, next) => req.session.admin ? next() : res.status(401).json({ error: 'Unauthorized' });

// ── AUTH ROUTES ──────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    const settings = read(FILES.settings);
    const pass = settings.adminPass || DEFAULT_SETTINGS.adminPass;
    if (password === pass) {
        req.session.admin = true;
        res.json({ ok: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/auth/check', (req, res) => {
    res.json({ loggedIn: !!req.session.admin });
});

// ── SYNC (admin init - loads everything at once) ─────────────
app.get('/api/sync', auth, (req, res) => {
    res.json({
        projects: read(FILES.projects),
        posts:    read(FILES.posts),
        settings: read(FILES.settings),
        leads:    read(FILES.leads),
    });
});

// ── PROJECTS ────────────────────────────────────────────────
app.get('/api/projects',       (req, res) => res.json(read(FILES.projects)));
app.post('/api/projects/save', auth, (req, res) => { write(FILES.projects, req.body); res.json({ ok: true }); });

// ── POSTS ────────────────────────────────────────────────────
app.get('/api/posts',       (req, res) => res.json(read(FILES.posts).filter(isPostLive)));
app.post('/api/posts/save', auth, (req, res) => { write(FILES.posts, req.body); res.json({ ok: true }); });

// ── SETTINGS ─────────────────────────────────────────────────
app.get('/api/settings',       (req, res) => res.json(read(FILES.settings)));
app.post('/api/settings/save', auth, (req, res) => {
    const current = read(FILES.settings);
    write(FILES.settings, { ...current, ...req.body });
    res.json({ ok: true });
});

// ── LEADS ─────────────────────────────────────────────────────
app.get('/api/leads',       auth, (req, res) => res.json(read(FILES.leads)));
app.post('/api/leads/save', auth, (req, res) => { write(FILES.leads, req.body); res.json({ ok: true }); });

// Public: submit a new lead from contact form
app.post('/api/leads/submit', (req, res) => {
    const list = read(FILES.leads);
    const lead = {
        id:        Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
        fname:     req.body.fname   || '',
        lname:     req.body.lname   || '',
        email:     req.body.email   || '',
        countryCode: req.body.countryCode || '',
        company:   req.body.company || '',
        phone:     req.body.phone || '',
        phoneRaw:  req.body.phoneRaw || '',
        service:   req.body.service || '',
        budget:    req.body.budget  || '',
        message:   req.body.message || '',
        source:    req.body.source  || '',
        interest:  req.body.interest || '',
        package:   req.body.package || '',
        page:      req.body.page    || '',
        status:    req.body.status  || 'new',
        date:      new Date().toISOString().slice(0, 10),
        createdAt: Date.now(),
        read:      false,
    };
    list.unshift(lead);
    write(FILES.leads, list);
    res.json({ ok: true, id: lead.id });
});

app.get(['/profile', '/profile/'], (req, res) => {
    res.type('application/pdf');
    res.set('Content-Disposition', 'inline; filename="TTTprofile.pdf"');
    res.sendFile(path.join(ROOT, 'TTTprofile.pdf'));
});

// Public: live portfolio from Microsoft OneDrive
app.get('/api/portfolio', async (req, res) => {
    try {
        if (!isOneDriveConfigured(process.env)) {
            res.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=120');
            return res.json({
                source: 'default',
                configured: false,
                env: oneDriveEnvStatus(process.env),
                projects: read(FILES.projects),
                message: 'OneDrive portfolio is not configured.',
            });
        }
        const token = await graphAccessToken(process.env);
        const clientsPath = process.env.ONEDRIVE_CLIENTS_PATH || 'TalkTheTaste/Work Portfolio/Clients';
        const clientFolders = (await graphChildren(process.env, token, clientsPath))
            .filter(item => item.folder)
            .sort((a, b) => a.name.localeCompare(b.name));

        const projects = await Promise.all(clientFolders.map(async client => {
            const categoryFolders = await graphChildrenByPath(process.env, token, `${clientsPath}/${client.name}`, 50).catch(() => []);
            const photographyFolder = categoryFolders.find(item => item.folder && /^photography$/i.test(item.name));
            const videographyFolder = categoryFolders.find(item => item.folder && /^videography$/i.test(item.name));
            const imageCount = photographyFolder?.folder?.childCount || 0;
            const videoCount = videographyFolder?.folder?.childCount || 0;
            const banner = await findBannerMedia(process.env, token, categoryFolders).catch(() => null);
            const firstImage = !banner && photographyFolder ? await firstMediaFromFolder(process.env, token, photographyFolder.id, 'Photography') : null;
            const firstVideo = !banner && !firstImage && videographyFolder ? await firstMediaFromFolder(process.env, token, videographyFolder.id, 'Videography') : null;
            const hero = banner || firstImage || firstVideo || null;
            const tags = [imageCount ? 'Photography' : '', videoCount ? 'Videography' : ''].filter(Boolean);
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
        res.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=120');
        res.json({ source: 'onedrive', configured: true, projects: projects.filter(project => project.mediaCount) });
    } catch (error) {
        res.status(502).json({ error: error.message || 'Portfolio request failed' });
    }
});

app.get('/api/portfolio/client', async (req, res) => {
    try {
        if (!isOneDriveConfigured(process.env)) return res.status(503).json({ error: 'OneDrive portfolio is not configured' });
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'Missing client id' });
        const cacheKey = `portfolio_client:${id}:v3`;
        const cached = readMemoryCache(cacheKey);
        if (cached) {
            res.set('Cache-Control', 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=120');
            return res.json({ ...cached, cached: true });
        }
        const token = await graphAccessToken(process.env);
        const client = await graphJson(`${graphDriveBase(process.env)}/items/${encodeURIComponent(id)}?$select=id,name,lastModifiedDateTime`, token);
        const children = await graphChildrenById(process.env, token, id, 50);
        const photographyFolder = children.find(item => item.folder && /^photography$/i.test(item.name));
        const videographyFolder = children.find(item => item.folder && /^videography$/i.test(item.name));
        const [banner, photography, videography] = await Promise.all([
            findBannerMedia(process.env, token, children).catch(() => null),
            photographyFolder ? graphChildrenById(process.env, token, photographyFolder.id, 120) : [],
            videographyFolder ? graphChildrenById(process.env, token, videographyFolder.id, 120) : [],
        ]);
        const images = photography.filter(isImageItem).map(item => mediaSummary(item, 'Photography'));
        const videos = videography.filter(isVideoItem).map(item => mediaSummary(item, 'Videography'));
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
        writeMemoryCache(cacheKey, payload, 30 * 60 * 1000);
        res.set('Cache-Control', 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=120');
        res.json(payload);
    } catch (error) {
        res.status(502).json({ error: error.message || 'Client portfolio request failed' });
    }
});

app.get('/api/portfolio/media', (req, res) => graphMediaRedirect(req, res, 'content'));
app.get('/api/portfolio/thumb', (req, res) => graphMediaRedirect(req, res, 'thumbnail'));

// ── CATCH-ALL: serve HTML pages ──────────────────────────────
app.get('*', (req, res) => {
    const filePath = path.join(ROOT, req.path);
    const htmlPath = path.join(ROOT, `${req.path}.html`);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.sendFile(filePath);
    } else if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
        res.sendFile(htmlPath);
    } else {
        res.status(404).sendFile(path.join(ROOT, 'index.html'));
    }
});

app.listen(PORT, () => console.log(`TTT running → http://localhost:${PORT}`));

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
    if (!response.ok) throw new Error(data.error_description || 'Microsoft Graph token request failed');
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
    if (!response.ok) throw new Error(data.error?.message || `Microsoft Graph request failed: ${response.status}`);
    return data;
}

function graphDriveBase(env) {
    return `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(env.ONEDRIVE_USER)}/drive`;
}

async function graphMediaRedirect(req, res, mode) {
    try {
        if (!isOneDriveConfigured(process.env)) return res.status(503).json({ error: 'OneDrive portfolio is not configured' });
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'Missing media id' });
        const token = await graphAccessToken(process.env);
        const endpoint = mode === 'thumbnail'
            ? `${graphDriveBase(process.env)}/items/${encodeURIComponent(id)}/thumbnails/0/large/content`
            : `${graphDriveBase(process.env)}/items/${encodeURIComponent(id)}/content`;
        const response = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
            redirect: 'manual',
        });
        const location = response.headers.get('Location');
        if (location) {
            res.set('Cache-Control', 'public, max-age=1800');
            return res.redirect(302, location);
        }
        if (!response.ok) return res.status(response.status).json({ error: `Microsoft Graph media request failed: ${response.status}` });
        res.set('Cache-Control', 'public, max-age=1800');
        res.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
        return Readable.fromWeb(response.body).pipe(res);
    } catch (error) {
        return res.status(502).json({ error: error.message || 'Media request failed' });
    }
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
    const bannerFile = children.find(item => item.file && bannerName(item.name) && (isImageItem(item) || isVideoItem(item)));
    if (bannerFile) return mediaSummary(bannerFile, isVideoItem(bannerFile) ? 'Videography' : 'Photography');
    const bannerFolder = children.find(item => item.folder && bannerName(item.name));
    if (!bannerFolder) return null;
    const files = await graphChildrenById(env, token, bannerFolder.id, 20);
    const item = files.find(file => isImageItem(file) || isVideoItem(file));
    return item ? mediaSummary(item, isVideoItem(item) ? 'Videography' : 'Photography') : null;
}

async function firstMediaFromFolder(env, token, folderId, type) {
    const items = await graphChildrenById(env, token, folderId, 12);
    const item = items.find(file => type === 'Photography' ? isImageItem(file) : isVideoItem(file));
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

function readMemoryCache(key) {
    const entry = memoryCache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
        memoryCache.delete(key);
        return null;
    }
    return entry.value;
}

function writeMemoryCache(key, value, ttlMs) {
    memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}
