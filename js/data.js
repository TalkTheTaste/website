/**
 * TTT Data Layer - localStorage-based CMS
 * All site content (projects, blog posts, leads, settings, analytics) is stored
 * in localStorage and read dynamically by each page.
 */

const TTT = {

    // ── VERSION ──────────────────────────────────────────────────
    // Bump this number to force a clean reseed of posts/projects on next load
    DATA_VERSION: '5',

    // ── KEYS ────────────────────────────────────────────────────
    KEYS: {
        projects: 'ttt_projects',
        posts:    'ttt_posts',
        settings: 'ttt_settings',
        auth:     'ttt_auth',
        leads:    'ttt_leads',
        analytics:'ttt_analytics',
        version:  'ttt_data_version',
    },

    // ── SETTINGS ────────────────────────────────────────────────
    getSettings() {
        const defaults = {
            siteName:      'Talk The Taste',
            tagline:       'Dubai\'s Full-Service Creative Agency',
            email:         'hi@talkthetaste.com',
            phone:         '+971 56 539 0316',
            instagram:     'https://www.instagram.com/talkthetaste',
            linkedin:      '#',
            tiktok:        '#',
            adminPass:     'ttt2025',
            web3formsKey:  '',
        };
        try {
            const saved = JSON.parse(localStorage.getItem(this.KEYS.settings) || '{}');
            return { ...defaults, ...saved };
        } catch { return defaults; }
    },
    saveSettings(data) {
        try { localStorage.setItem(this.KEYS.settings, JSON.stringify(data)); } catch(e) {}
    },

    // ── AUTH ─────────────────────────────────────────────────────
    isLoggedIn() {
        return sessionStorage.getItem(this.KEYS.auth) === 'true';
    },
    login(pass) {
        const s = this.getSettings();
        if (pass === s.adminPass) {
            sessionStorage.setItem(this.KEYS.auth, 'true');
            return true;
        }
        return false;
    },
    logout() {
        sessionStorage.removeItem(this.KEYS.auth);
    },

    // ── PROJECTS ─────────────────────────────────────────────────
    getProjects() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.projects) || '[]');
        } catch { return []; }
    },
    saveProjects(list) {
        try {
            localStorage.setItem(this.KEYS.projects, JSON.stringify(list));
            return true;
        } catch(e) {
            return 'QUOTA: ' + (e.message || e.name || 'Storage full');
        }
    },
    getProject(id) {
        if (!id) return null;
        return this.getProjects().find(p => p.id === id) || null;
    },
    addProject(data) {
        const list = this.getProjects();
        const project = {
            id:          this._uid(),
            title:       data.title || 'Untitled Project',
            category:    data.category || 'Branding',
            tags:        data.tags || [],
            description: data.description || '',
            fullDesc:    data.fullDesc || '',
            image:       data.image || '',
            color1:      data.color1 || '#0c0c24',
            color2:      data.color2 || '#18103c',
            featured:    data.featured || false,
            date:        data.date || new Date().toISOString().slice(0,10),
            createdAt:   Date.now(),
        };
        list.unshift(project);
        const err = this.saveProjects(list);
        return err === true ? project : { _error: err };
    },
    updateProject(id, data) {
        const list = this.getProjects();
        const idx = list.findIndex(p => p.id === id);
        if (idx === -1) return null;
        list[idx] = { ...list[idx], ...data, id, updatedAt: Date.now() };
        const err = this.saveProjects(list);
        return err === true ? list[idx] : { _error: err };
    },
    deleteProject(id) {
        const list = this.getProjects().filter(p => p.id !== id);
        this.saveProjects(list);
    },
    getFeaturedProjects(limit = 3) {
        const all = this.getProjects();
        const featured = all.filter(p => p.featured);
        return featured.length ? featured.slice(0, limit) : all.slice(0, limit);
    },

    // ── BLOG POSTS ───────────────────────────────────────────────
    getPosts(options = {}) {
        try {
            const posts = JSON.parse(localStorage.getItem(this.KEYS.posts) || '[]');
            return options.includeScheduled ? posts : posts.filter(post => this.isPostLive(post));
        } catch { return []; }
    },
    getAllPosts() {
        return this.getPosts({ includeScheduled: true });
    },
    isPostLive(post, now = new Date()) {
        if (!post) return false;
        if (post.status === 'draft') return false;
        if (post.status === 'scheduled') {
            if (!post.scheduledAt) return false;
            return new Date(post.scheduledAt).getTime() <= now.getTime();
        }
        return true;
    },
    savePosts(list) {
        try {
            localStorage.setItem(this.KEYS.posts, JSON.stringify(list));
            return true;
        } catch(e) {
            return 'QUOTA: ' + (e.message || e.name || 'Storage full');
        }
    },
    getPost(id, options = {}) {
        if (!id) return null;
        const posts = options.includeScheduled ? this.getAllPosts() : this.getPosts();
        // Try slug first (stable), then fall back to ID
        return posts.find(p => p.slug === id) || posts.find(p => p.id === id) || null;
    },
    getPostBySlug(slug) {
        if (!slug) return null;
        return this.getPosts().find(p => p.slug === slug) || null;
    },
    addPost(data) {
        const list = this.getAllPosts();
        // Ensure slug is unique
        let slug = data.slug || this._slug(data.title || 'untitled');
        if (!slug) slug = 'post';
        let base = slug, n = 2;
        while (list.some(p => p.slug === slug)) { slug = base + '-' + n++; }
        const post = {
            id:        this._uid(),
            title:     data.title || 'Untitled Post',
            slug:      slug,
            excerpt:   data.excerpt || '',
            content:   data.content || '',
            thumbnail: data.thumbnail || '',
            category:  data.category || 'Marketing',
            author:    data.author || 'TTT Team',
            featured:  data.featured || false,
            status:    data.status || 'published',
            scheduledAt: data.scheduledAt || '',
            scheduledTimezone: data.scheduledTimezone || 'Asia/Dubai',
            layout:    data.layout || 'standard',
            date:      data.date || new Date().toISOString().slice(0,10),
            createdAt: Date.now(),
        };
        list.unshift(post);
        const err = this.savePosts(list);
        return err === true ? post : { _error: err };
    },
    updatePost(id, data) {
        const list = this.getAllPosts();
        const idx = list.findIndex(p => p.id === id);
        if (idx === -1) return null;
        list[idx] = { ...list[idx], ...data, id, updatedAt: Date.now() };
        const err = this.savePosts(list);
        return err === true ? list[idx] : { _error: err };
    },
    deletePost(id) {
        const list = this.getAllPosts().filter(p => p.id !== id);
        this.savePosts(list);
    },
    getFeaturedPosts(limit = 3) {
        const all = this.getPosts();
        const featured = all.filter(p => p.featured);
        return featured.length ? featured.slice(0, limit) : all.slice(0, limit);
    },

    // ── LEADS ─────────────────────────────────────────────────────
    getLeads() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.leads) || '[]');
        } catch { return []; }
    },
    saveLead(data) {
        const list = this.getLeads();
        const lead = {
            id:        this._uid(),
            fname:     data.fname || '',
            lname:     data.lname || '',
            email:     data.email || '',
            countryCode: data.countryCode || '',
            phone:     data.phone || '',
            phoneRaw:  data.phoneRaw || '',
            company:   data.company || '',
            service:   data.service || '',
            budget:    data.budget || '',
            message:   data.message || '',
            contactConsent: !!data.contactConsent,
            consentText: data.consentText || '',
            consentAt: data.consentAt || '',
            source:    data.source || '',
            interest:  data.interest || '',
            package:   data.package || '',
            page:      data.page || (typeof location !== 'undefined' ? location.pathname : ''),
            status:    data.status || 'new',
            date:      new Date().toISOString().slice(0,10),
            createdAt: Date.now(),
            read:      false,
        };
        list.unshift(lead);
        try { localStorage.setItem(this.KEYS.leads, JSON.stringify(list)); } catch(e) {}
        return lead;
    },
    markLeadRead(id) {
        const list = this.getLeads();
        const idx = list.findIndex(l => l.id === id);
        if (idx !== -1) { list[idx].read = true; try { localStorage.setItem(this.KEYS.leads, JSON.stringify(list)); } catch(e) {} }
    },
    deleteLead(id) {
        const list = this.getLeads().filter(l => l.id !== id);
        try { localStorage.setItem(this.KEYS.leads, JSON.stringify(list)); } catch(e) {}
    },

    // ── ANALYTICS ────────────────────────────────────────────────
    getAnalytics() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.analytics) || '[]');
        } catch { return []; }
    },

    // ── SEED DEMO DATA ────────────────────────────────────────────
    seedIfEmpty() {
        if (this.getProjects().length === 0) {
            const demos = [
                { title:'Full Brand Launch - Dubai Restaurant Group', category:'Branding', tags:['Branding','Web','Strategy'], description:'Complete brand identity, website, and go-to-market strategy for a Dubai F&B group.', fullDesc:'<p>We partnered with this Dubai restaurant group from concept to launch - developing the visual identity, brand guidelines, website, social media presence, and marketing strategy that positioned them as one of the city\'s most talked-about dining destinations.</p><p>The project included logo design, color system, typography, interior signage, menu design, a custom website with online booking, and a 90-day social media launch campaign.</p>', image:'assets/site/restaurant-brand-launch.jpg', color1:'#0c0c24', color2:'#18103c', featured:true, date:'2024-11-10' },
                { title:'Social Growth Campaign - F&B Brand', category:'Social Media', tags:['Social Media','Content','Ads'], description:'3x engagement growth in 90 days through strategic content and paid advertising.', fullDesc:'<p>This F&B brand came to us struggling with flat social media engagement. Within 90 days of our social media management, we tripled their engagement rate and doubled their follower count through strategic content creation, community management, and targeted paid campaigns.</p>', image:'assets/site/social-growth-campaign.jpg', color1:'#1a0800', color2:'#2d1500', featured:true, date:'2024-10-05' },
                { title:'On-Demand Delivery App', category:'Mobile App', tags:['Mobile App','iOS','Android'], description:'Native iOS and Android on-demand delivery platform built from MVP to full launch.', fullDesc:'<p>We designed and built a full-featured on-demand delivery platform from the ground up - native iOS and Android apps, a web-based merchant dashboard, and a driver app. The platform launched with 12 restaurant partners and processed over 1,000 orders in its first month.</p>', image:'assets/site/delivery-web-app.jpg', color1:'#001508', color2:'#002912', featured:true, date:'2024-09-20' },
            ];
            demos.forEach(d => this.addProject(d));
        }
    },

    // ── HELPERS ───────────────────────────────────────────────────
    _uid() {
        return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,9);
    },
    _slug(str) {
        return str.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    },
    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr + 'T00:00:00');
            return d.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
        } catch { return dateStr; }
    },

    // ── IMAGE UTILS ───────────────────────────────────────────────
    // Resizes image and returns the smallest viable base64.
    // Uses WebP where supported (60-80% smaller than JPEG).
    // maxW/maxH: hard cap preserving aspect ratio (never upscales).
    resizeImage(file, maxW, maxH, quality, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let w = img.width, h = img.height;
                // Never upscale; only shrink
                const ratio = Math.min(maxW / w, maxH / h, 1);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                // Try WebP first (much smaller), fall back to JPEG
                const q = quality || 0.72;
                let result = canvas.toDataURL('image/webp', q);
                // If browser returns PNG (no WebP support), retry as JPEG
                if (result.startsWith('data:image/png') || result.startsWith('data:image/webp') === false) {
                    result = canvas.toDataURL('image/jpeg', q);
                }
                callback(result);
            };
            img.onerror = () => callback(null);
            img.src = e.target.result;
        };
        reader.onerror = () => callback(null);
        reader.readAsDataURL(file);
    },
};

// ── BOOT ─────────────────────────────────────────────────────────────────────
// If data version doesn't match (old/corrupt data), wipe posts+projects and reseed.
// Settings and leads are preserved across resets.
(function boot() {
    try {
        const storedVersion = localStorage.getItem(TTT.KEYS.version);
        if (storedVersion !== TTT.DATA_VERSION) {
            // Clear content data only (preserve settings + leads)
            localStorage.removeItem(TTT.KEYS.projects);
            localStorage.removeItem(TTT.KEYS.posts);
            localStorage.setItem(TTT.KEYS.version, TTT.DATA_VERSION);
        }
    } catch(e) {}
    TTT.seedIfEmpty();
})();

// ═══════════════════════════════════════════════════════════════
//  SERVER SYNC LAYER - Added for Node.js/Express deployment
//  All existing localStorage methods stay intact as local cache.
//  These methods sync the cache with the server.
// ═══════════════════════════════════════════════════════════════

TTT.API = {

    // ── Low-level fetch helpers ──────────────────────────────
    async get(url) {
        const r = await fetch(url, { credentials: 'include' });
        if (!r.ok) throw new Error(r.status);
        return r.json();
    },
    async post(url, body) {
        const r = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(r.status);
        return r.json();
    },

    // ── Auth ─────────────────────────────────────────────────
    async login(password) {
        try {
            const r = await this.post('/api/auth/login', { password });
            return r.ok === true;
        } catch { return false; }
    },
    async logout() {
        try { await this.post('/api/auth/logout', {}); } catch {}
    },
    async checkSession() {
        try {
            const r = await this.get('/api/auth/check');
            return r.loggedIn === true;
        } catch { return false; }
    },

    // ── Init: pull all server data into localStorage ─────────
    async init() {
        try {
            const data = await this.get('/api/sync');
            if (Array.isArray(data.projects) && data.projects.length > 0) {
                localStorage.setItem(TTT.KEYS.projects, JSON.stringify(data.projects));
            }
            if (Array.isArray(data.posts) && data.posts.length > 0) {
                localStorage.setItem(TTT.KEYS.posts, JSON.stringify(data.posts));
            }
            if (data.settings && typeof data.settings === 'object') {
                localStorage.setItem(TTT.KEYS.settings, JSON.stringify(data.settings));
            }
            if (Array.isArray(data.leads)) {
                localStorage.setItem(TTT.KEYS.leads, JSON.stringify(data.leads));
            }
            if (Array.isArray(data.analytics)) {
                localStorage.setItem(TTT.KEYS.analytics, JSON.stringify(data.analytics));
            }
            return true;
        } catch(e) {
            console.warn('Server sync failed, using localStorage only:', e.message);
            return false;
        }
    },
    async initPublic() {
        try {
            const [projects, posts, settings] = await Promise.all([
                this.get('/api/projects'),
                this.get('/api/posts'),
                this.get('/api/settings'),
            ]);
            if (Array.isArray(projects)) {
                localStorage.setItem(TTT.KEYS.projects, JSON.stringify(projects));
            }
            if (Array.isArray(posts)) {
                localStorage.setItem(TTT.KEYS.posts, JSON.stringify(posts));
            }
            if (settings && typeof settings === 'object') {
                localStorage.setItem(TTT.KEYS.settings, JSON.stringify({ ...TTT.getSettings(), ...settings }));
            }
            document.dispatchEvent(new CustomEvent('ttt:data:ready'));
            return true;
        } catch(e) {
            console.warn('Public server sync failed, using localStorage only:', e.message);
            return false;
        }
    },

    // ── Push saves to server in background ───────────────────
    async saveProjects(list) {
        try { await this.post('/api/projects/save', list); } catch(e) { console.warn('Project sync failed', e.message); }
    },
    async savePosts(list) {
        try { await this.post('/api/posts/save', list); } catch(e) { console.warn('Post sync failed', e.message); }
    },
    async saveSettings(obj) {
        try { await this.post('/api/settings/save', obj); } catch(e) { console.warn('Settings sync failed', e.message); }
    },
    async saveLeads(list) {
        try { await this.post('/api/leads/save', list); } catch(e) { console.warn('Lead sync failed', e.message); }
    },
    async refreshAnalytics() {
        try {
            const analytics = await this.get('/api/analytics');
            if (Array.isArray(analytics)) localStorage.setItem(TTT.KEYS.analytics, JSON.stringify(analytics));
            return analytics;
        } catch(e) {
            console.warn('Analytics sync failed', e.message);
            return TTT.getAnalytics();
        }
    },
    async clearAnalytics() {
        try {
            await this.post('/api/analytics/clear', {});
            localStorage.setItem(TTT.KEYS.analytics, '[]');
            return true;
        } catch(e) {
            console.warn('Analytics clear failed', e.message);
            return false;
        }
    },
    async submitLead(lead) {
        try {
            const response = await this.post('/api/leads/submit', lead);
            return response.ok === true;
        } catch(e) {
            console.warn('Lead submit failed', e.message);
            return false;
        }
    },
};

// ── Patch existing save methods to also push to server ───────
(function patchSaves() {
    const _saveProjects = TTT.saveProjects.bind(TTT);
    TTT.saveProjects = function(list) {
        const result = _saveProjects(list);
        TTT.API.saveProjects(list);
        return result;
    };

    const _savePosts = TTT.savePosts.bind(TTT);
    TTT.savePosts = function(list) {
        const result = _savePosts(list);
        TTT.API.savePosts(list);
        return result;
    };

    const _saveSettings = TTT.saveSettings.bind(TTT);
    TTT.saveSettings = function(data) {
        _saveSettings(data);
        TTT.API.saveSettings(data);
    };

    // Patch lead mutations to sync leads list after each change
    const _saveLead = TTT.saveLead.bind(TTT);
    TTT.saveLead = function(data) {
        const result = _saveLead(data);
        result.remoteSaved = TTT.API.submitLead(data);
        return result;
    };

    const _markLeadRead = TTT.markLeadRead.bind(TTT);
    TTT.markLeadRead = function(id) {
        _markLeadRead(id);
        TTT.API.saveLeads(TTT.getLeads());
    };

    const _deleteLead = TTT.deleteLead.bind(TTT);
    TTT.deleteLead = function(id) {
        _deleteLead(id);
        TTT.API.saveLeads(TTT.getLeads());
    };
})();

if (!new URLSearchParams(location.search).has('preview')) {
    TTT.API.initPublic();
}
