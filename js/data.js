/**
 * TTT Data Layer - localStorage-based CMS
 * All site content (projects, blog posts, leads, settings) is stored
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
        version:  'ttt_data_version',
    },

    // ── SETTINGS ────────────────────────────────────────────────
    getSettings() {
        const defaults = {
            siteName:      'Talk The Taste',
            tagline:       'Dubai\'s Full-Service Creative Agency',
            email:         'hi@talkthetaste.com',
            phone:         '+971 52 997 2969',
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
    getPosts() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.posts) || '[]');
        } catch { return []; }
    },
    savePosts(list) {
        try {
            localStorage.setItem(this.KEYS.posts, JSON.stringify(list));
            return true;
        } catch(e) {
            return 'QUOTA: ' + (e.message || e.name || 'Storage full');
        }
    },
    getPost(id) {
        if (!id) return null;
        const posts = this.getPosts();
        // Try slug first (stable), then fall back to ID
        return posts.find(p => p.slug === id) || posts.find(p => p.id === id) || null;
    },
    getPostBySlug(slug) {
        if (!slug) return null;
        return this.getPosts().find(p => p.slug === slug) || null;
    },
    addPost(data) {
        const list = this.getPosts();
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
            date:      data.date || new Date().toISOString().slice(0,10),
            createdAt: Date.now(),
        };
        list.unshift(post);
        const err = this.savePosts(list);
        return err === true ? post : { _error: err };
    },
    updatePost(id, data) {
        const list = this.getPosts();
        const idx = list.findIndex(p => p.id === id);
        if (idx === -1) return null;
        list[idx] = { ...list[idx], ...data, id, updatedAt: Date.now() };
        const err = this.savePosts(list);
        return err === true ? list[idx] : { _error: err };
    },
    deletePost(id) {
        const list = this.getPosts().filter(p => p.id !== id);
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
        if (this.getPosts().length === 0) {
            const p1id = this._uid();
            const p2id = this._uid();
            const p3id = this._uid();
            const demos = [
                { id:p1id, title:'Why Your Brand Needs a Social Media Strategy in 2025', slug:'social-media-strategy-2025', excerpt:'Most brands post without a plan. Here\'s why that\'s costing you and what a real social media strategy looks like.', content:'<h2>The Problem With Posting Without a Plan</h2><p>Most brands treat social media like a bulletin board - they post when they remember, share what feels relevant, and hope for engagement. But in 2025, the algorithm doesn\'t reward randomness. It rewards consistency, quality, and strategic intent.</p><h2>What a Real Strategy Looks Like</h2><p>A genuine social media strategy starts with your audience. Who are they? What do they care about? When are they online? Only after answering these questions should you think about content.</p><p>From there, you need a content mix: educational posts, behind-the-scenes content, social proof, and direct calls to action. Not every post should sell - but every post should serve.</p><h2>The TTT Framework</h2><p>At Talk The Taste, we use a 4-pillar content framework: <strong>Educate, Inspire, Entertain, Convert</strong>. Each piece of content serves one of these purposes, and we balance them across the month to keep audiences engaged without burning them out with sales messaging.</p><p>The result? Brands that consistently out-perform their competitors, build genuine communities, and see social media become a real revenue channel - not just a vanity metric.</p>', thumbnail:'assets/site/social-growth-campaign.jpg', category:'Social Media', author:'TTT Team', featured:true, date:'2025-03-15' },
                { id:p2id, title:'The 5 Elements of a Website That Actually Converts', slug:'website-conversion-elements', excerpt:'A beautiful website that doesn\'t convert is just expensive art. Here\'s what separates the top performers from the rest.', content:'<h2>Conversion Starts Before Design</h2><p>Before a single pixel is placed, a converting website requires a clear understanding of its visitor\'s intent. What are they looking for? What problem do they need solved? The design, copy, and structure should all serve the answer to these questions.</p><h2>1. A Magnetic Hero Section</h2><p>You have roughly 3 seconds. Your hero section needs to communicate clearly: what you do, who you do it for, and why you\'re the best choice. Vague taglines kill conversions.</p><h2>2. Social Proof Above the Fold</h2><p>Trust indicators - client logos, review counts, specific results - should appear early. Users are skeptical; social proof is the fastest way to earn credibility.</p><h2>3. Clear Primary CTAs</h2><p>One primary call to action per page. Not three. Not five. One. Make it impossible to miss and irresistible to click.</p><h2>4. Speed</h2><p>A one-second delay in page load time can reduce conversions by 7%. Speed is not a nice-to-have - it\'s table stakes.</p><h2>5. Mobile-First Everything</h2><p>Over 60% of web traffic is mobile. If your mobile experience is an afterthought, so are the majority of your potential customers.</p>', thumbnail:'assets/site/delivery-web-app.jpg', category:'Web Design', author:'TTT Team', featured:true, date:'2025-02-28' },
                { id:p3id, title:'How to Brief a Creative Agency (And Get Amazing Results)', slug:'how-to-brief-a-creative-agency', excerpt:'The quality of what you get from a creative agency is directly proportional to the quality of the brief you give them.', content:'<h2>Why the Brief Matters</h2><p>Creative agencies don\'t produce great work in a vacuum - they produce great work in response to clear direction. The brief is the foundation. A weak brief produces generic output. A strong brief produces work that genuinely moves your business forward.</p><h2>What to Include</h2><p><strong>Business context:</strong> What does your company do? Who is your customer? What\'s your current market position?</p><p><strong>The problem:</strong> What specific challenge is this project solving? Be honest - if sales are down, say so.</p><p><strong>The audience:</strong> Who exactly are you speaking to? Age, location, income, values, pain points.</p><p><strong>Success metrics:</strong> How will you know if this worked? Be specific - "more engagement" is not a metric.</p><p><strong>Constraints:</strong> Budget, timeline, brand guidelines, legal restrictions, technical limitations.</p><h2>What Not to Do</h2><p>Don\'t design by committee, don\'t over-specify the solution (brief the problem, not the answer), and don\'t skip the feedback rounds - they exist for a reason.</p>', thumbnail:'assets/site/restaurant-brand-launch.jpg', category:'Marketing', author:'TTT Team', featured:false, date:'2025-01-20' },
            ];
            // Add directly to avoid re-generating IDs
            const list = [];
            demos.forEach(d => {
                list.push({
                    id:        d.id,
                    title:     d.title,
                    slug:      d.slug,
                    excerpt:   d.excerpt,
                    content:   d.content,
                    thumbnail: d.thumbnail || '',
                    category:  d.category,
                    author:    d.author,
                    featured:  d.featured,
                    date:      d.date,
                    createdAt: Date.now(),
                });
            });
            this.savePosts(list);
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
    async submitLead(lead) {
        try {
            const response = await this.post('/api/leads/submit', lead);
            return response.ok === true && response.notification && response.notification.ok === true;
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

TTT.API.initPublic();
