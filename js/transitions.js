/**
 * TTT Page Transitions
 * Smooth fade between pages. Preloader shown once per session (index.html only).
 */
(function() {
    const softNavState = {
        isNavigating: false,
        motionCleanup: null,
        loadedPersistentScripts: new Set()
    };

    function scriptKey(src) {
        if (!src) return '';
        const path = new URL(src, window.location.href).pathname;
        const match = path.match(/\/js\/(data|conversion)(\.min)?\.js$/i);
        return match ? match[1].toLowerCase() : '';
    }

    function getTransitionOverlay() {
        let overlay = document.getElementById('pt');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'pt';
        overlay.style.cssText = [
            'position:fixed',
            'inset:0',
            'background:#060606',
            'z-index:99998',
            'opacity:0',
            'pointer-events:none',
            'transition:opacity .28s cubic-bezier(.16,1,.3,1)'
        ].join(';');
        document.body.appendChild(overlay);
        return overlay;
    }

    function showOverlay() {
        const overlay = getTransitionOverlay();
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'all';
        return new Promise(resolve => setTimeout(resolve, 210));
    }

    function hideOverlay() {
        const overlay = getTransitionOverlay();
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
    }

    function isSoftNavLink(link) {
        const href = link.getAttribute('href');
        if (!href || link.target === '_blank' || link.hasAttribute('download')) return false;
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return false;

        const nextUrl = new URL(href, window.location.href);
        if (nextUrl.origin !== window.location.origin) return false;
        if (nextUrl.pathname.startsWith('/ar/') || nextUrl.pathname.startsWith('/admin') || nextUrl.pathname.startsWith('/api/')) return false;
        if (nextUrl.pathname.match(/\.(pdf|jpg|jpeg|png|webp|gif|svg|zip)$/i)) return false;

        const current = window.location.pathname.replace(/\/$/, '') || '/';
        const next = nextUrl.pathname.replace(/\/$/, '') || '/';
        return current !== next || window.location.search !== nextUrl.search;
    }

    function syncHead(nextDoc) {
        document.title = nextDoc.title;

        const keepSelectors = [
            'meta[charset]',
            'meta[name="viewport"]',
            'meta[name="robots"]',
            'meta[name="author"]',
            'meta[name="geo.region"]',
            'meta[name="geo.placename"]',
            'meta[name="description"]',
            'meta[name="keywords"]',
            'meta[property^="og:"]',
            'meta[name^="twitter:"]',
            'link[rel="canonical"]',
            'link[rel="alternate"]',
            'script[type="application/ld+json"]'
        ].join(',');

        document.head.querySelectorAll(keepSelectors).forEach(node => node.remove());
        nextDoc.head.querySelectorAll(keepSelectors).forEach(node => document.head.appendChild(node.cloneNode(true)));

        document.head.querySelectorAll('style, link[rel="stylesheet"], link[rel="preconnect"], link[rel="preload"]').forEach(node => node.remove());
        nextDoc.head.querySelectorAll('style, link[rel="stylesheet"], link[rel="preconnect"], link[rel="preload"]').forEach(node => {
            const clone = node.cloneNode(true);
            document.head.appendChild(clone);
        });
    }

    function executePageScripts(nextDoc) {
        const routerPattern = /\/?transitions(\.min)?\.js/i;
        nextDoc.body.querySelectorAll('script').forEach(oldScript => {
            const src = oldScript.getAttribute('src') || '';
            if (src && routerPattern.test(src)) return;

            const persistentKey = scriptKey(src);
            if (persistentKey && softNavState.loadedPersistentScripts.has(persistentKey)) return;
            if (persistentKey) softNavState.loadedPersistentScripts.add(persistentKey);

            const script = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => script.setAttribute(attr.name, attr.value));
            script.textContent = oldScript.textContent;
            document.body.appendChild(script);
        });
    }

    function reinitPage() {
        document.body.classList.remove('ttt-page-in');
        void document.body.offsetWidth;
        document.body.classList.add('ttt-page-in');
        initActiveNav();
        initMobileMenu();
        initMotionSystem();
        hideOverlay();
        window.dispatchEvent(new Event('ttt:page-ready'));
    }

    async function softNavigate(url, shouldPushState = true) {
        if (softNavState.isNavigating) return;
        softNavState.isNavigating = true;

        const nextUrl = new URL(url, window.location.href);
        try {
            await showOverlay();
            const response = await fetch(nextUrl.href, {
                headers: { 'X-Requested-With': 'TTT-Soft-Navigation' }
            });
            if (!response.ok) throw new Error(`Navigation failed: ${response.status}`);

            const html = await response.text();
            const nextDoc = new DOMParser().parseFromString(html, 'text/html');
            if (!nextDoc.body || !nextDoc.querySelector('nav#nav')) throw new Error('Invalid page response');

            if (softNavState.motionCleanup) {
                softNavState.motionCleanup();
                softNavState.motionCleanup = null;
            }

            syncHead(nextDoc);
            document.body.innerHTML = nextDoc.body.innerHTML;
            document.documentElement.lang = nextDoc.documentElement.lang || 'en';
            document.documentElement.dir = nextDoc.documentElement.dir || 'ltr';
            document.body.style.overflow = '';

            if (shouldPushState) history.pushState({ softNav: true }, '', nextUrl.href);
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

            executePageScripts(nextDoc);
            requestAnimationFrame(reinitPage);
        } catch (error) {
            window.location.href = nextUrl.href;
        } finally {
            softNavState.isNavigating = false;
        }
    }

    function initActiveNav() {
        const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
        document.querySelectorAll('#nav .nav-menu a, .mobile-menu-links a').forEach(link => {
            const linkPath = new URL(link.getAttribute('href'), window.location.origin).pathname.replace(/\/$/, '') || '/';
            const isActive = currentPath === linkPath || (linkPath !== '/' && currentPath.startsWith(linkPath + '/'));
            link.classList.toggle('active', isActive);
            if (isActive) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
    }

    function initMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const mobileMenu = document.getElementById('mobileMenu');
        if (!hamburger || !mobileMenu || hamburger.dataset.menuBound === 'true') return;

        const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
        let lastFocusedBeforeOpen = null;

        const setMenuState = (isOpen, restoreFocus = false) => {
            hamburger.classList.remove('open');
            hamburger.classList.toggle('open', isOpen);
            mobileMenu.classList.toggle('open', isOpen);
            hamburger.setAttribute('aria-expanded', String(isOpen));
            mobileMenu.setAttribute('aria-hidden', String(!isOpen));
            mobileMenu.inert = !isOpen;
            document.body.style.overflow = isOpen ? 'hidden' : '';

            if (isOpen) {
                lastFocusedBeforeOpen = document.activeElement;
                const firstFocusable = mobileMenu.querySelector(focusableSelector);
                if (firstFocusable) firstFocusable.focus({ preventScroll: true });
            } else if (restoreFocus && lastFocusedBeforeOpen && typeof lastFocusedBeforeOpen.focus === 'function') {
                lastFocusedBeforeOpen.focus({ preventScroll: true });
            }
        };

        const closeMenu = (restoreFocus = false) => {
            setMenuState(false, restoreFocus);
        };

        hamburger.dataset.menuBound = 'true';
        mobileMenu.inert = true;
        hamburger.addEventListener('click', () => {
            const isOpen = hamburger.getAttribute('aria-expanded') !== 'true';
            setMenuState(isOpen, true);
        });
        mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => closeMenu(false)));

        const closeBtn = document.getElementById('mobileMenuClose');
        if (closeBtn) closeBtn.addEventListener('click', () => closeMenu(true));

        document.addEventListener('keydown', event => {
            if (hamburger.getAttribute('aria-expanded') !== 'true') return;

            if (event.key === 'Escape') {
                event.preventDefault();
                closeMenu(true);
                return;
            }

            if (event.key !== 'Tab') return;
            const focusableItems = Array.from(mobileMenu.querySelectorAll(focusableSelector))
                .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
            if (!focusableItems.length) return;

            const first = focusableItems[0];
            const last = focusableItems[focusableItems.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('script[src]').forEach(script => {
                const key = scriptKey(script.getAttribute('src') || '');
                if (key) softNavState.loadedPersistentScripts.add(key);
            });
            document.body.classList.add('ttt-page-in');
            initActiveNav();
            initMobileMenu();
        });
    } else {
        document.querySelectorAll('script[src]').forEach(script => {
            const key = scriptKey(script.getAttribute('src') || '');
            if (key) softNavState.loadedPersistentScripts.add(key);
        });
        document.body.classList.add('ttt-page-in');
        initActiveNav();
        initMobileMenu();
    }

    function initMotionSystem() {
        if (softNavState.motionCleanup) {
            softNavState.motionCleanup();
            softNavState.motionCleanup = null;
        }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        document.documentElement.classList.add('motion-enabled');

        const headings = document.querySelectorAll(
            '.sec-title, .landing-hero h1, .page-hero h1, .post-title, .about-hero h1, .landing-band h2'
        );
        headings.forEach(heading => heading.classList.add('motion-heading'));

        const cardGroups = document.querySelectorAll(
            '.landing-grid, .growth-links, .faq-grid, .values-grid, .svc-grid'
        );
        cardGroups.forEach(group => {
            const cards = group.querySelectorAll('.landing-card, .growth-link, .faq-item, .value-card, .svc-card');
            cards.forEach((card, index) => {
                card.classList.add('motion-card');
                card.style.setProperty('--motion-delay', `${Math.min(index % 4, 3) * 70}ms`);
            });
        });

        const media = document.querySelectorAll(
            '.landing-media, .featured-work-media, .founder-photo, .post-hero-img'
        );
        media.forEach(item => {
            item.classList.add('motion-media');
            if (!item.querySelector('.motion-pixel-layer')) {
                const pixels = document.createElement('span');
                pixels.className = 'motion-pixel-layer';
                pixels.setAttribute('aria-hidden', 'true');
                for (let index = 0; index < 18; index += 1) {
                    const pixel = document.createElement('span');
                    pixel.style.setProperty('--pixel-index', String((index * 7) % 18));
                    pixels.appendChild(pixel);
                }
                item.appendChild(pixels);
            }
        });

        const animated = document.querySelectorAll('.motion-heading, .motion-card, .motion-media');
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('motion-in');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
        animated.forEach(item => {
            const rect = item.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
                requestAnimationFrame(() => item.classList.add('motion-in'));
            } else {
                observer.observe(item);
            }
        });

        const magneticItems = document.querySelectorAll(
            '.btn-primary, .btn-gold, .nav-cta, .cta-btn-gold, .btn-outline-white'
        );
        magneticItems.forEach(item => {
            item.classList.add('motion-magnetic');
            item.addEventListener('pointermove', event => {
                const rect = item.getBoundingClientRect();
                const x = (event.clientX - rect.left - rect.width / 2) * 0.12;
                const y = (event.clientY - rect.top - rect.height / 2) * 0.16;
                item.style.setProperty('--magnetic-x', `${x}px`);
                item.style.setProperty('--magnetic-y', `${y}px`);
            });
            item.addEventListener('pointerleave', () => {
                item.style.setProperty('--magnetic-x', '0px');
                item.style.setProperty('--magnetic-y', '0px');
            });
        });

        let ticking = false;
        const updateParallax = () => {
            const viewportCenter = window.innerHeight / 2;
            media.forEach(item => {
                if (!item.classList.contains('motion-in')) return;
                const rect = item.getBoundingClientRect();
                if (rect.bottom < 0 || rect.top > window.innerHeight) return;
                const offset = Math.max(-14, Math.min(14, (rect.top + rect.height / 2 - viewportCenter) * -0.025));
                item.style.setProperty('--motion-parallax', `${offset}px`);
            });
            ticking = false;
        };
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(updateParallax);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        updateParallax();
        softNavState.motionCleanup = () => {
            observer.disconnect();
            window.removeEventListener('scroll', onScroll);
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMotionSystem);
    } else {
        initMotionSystem();
    }

    const revealPage = () => hideOverlay();

    requestAnimationFrame(() => requestAnimationFrame(revealPage));

    // Browsers restore the covered overlay from the back-forward cache.
    window.addEventListener('pageshow', revealPage);

    document.addEventListener('click', function(e) {
        const link = e.target.closest('a[href]');
        if (!link || !isSoftNavLink(link)) return;
        e.preventDefault();
        softNavigate(link.href);
    });

    window.addEventListener('popstate', () => {
        softNavigate(window.location.href, false);
    });
})();
