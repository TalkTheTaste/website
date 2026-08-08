'use strict';
const express = require('express');
const fs      = require('fs');
const path    = require('path');
const session = require('express-session');

const app  = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');

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
