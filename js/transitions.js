/**
 * TTT Page Transitions
 * Smooth fade between pages. Preloader shown once per session (index.html only).
 */
(function() {
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
        document.addEventListener('DOMContentLoaded', initMobileMenu);
    } else {
        initMobileMenu();
    }

    function initMotionSystem() {
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
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(updateParallax);
        }, { passive: true });
        updateParallax();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMotionSystem);
    } else {
        initMotionSystem();
    }

    const overlay = document.createElement('div');
    overlay.id = 'pt';
    overlay.style.cssText = 'position:fixed;inset:0;background:#060606;z-index:99998;opacity:1;pointer-events:all;transition:opacity .32s ease;';
    document.body.appendChild(overlay);

    const revealPage = () => {
        overlay.style.transition = 'none';
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        requestAnimationFrame(() => {
            overlay.style.transition = 'opacity .32s ease';
        });
    };

    requestAnimationFrame(() => requestAnimationFrame(revealPage));

    // Browsers restore the covered overlay from the back-forward cache.
    window.addEventListener('pageshow', revealPage);

    document.addEventListener('click', function(e) {
        const link = e.target.closest('a[href]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href) return;
        if (
            href.startsWith('#') ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:') ||
            href.startsWith('javascript:') ||
            href.startsWith('http://') ||
            href.startsWith('https://') ||
            href.startsWith('//') ||
            link.target === '_blank'
        ) return;
        e.preventDefault();
        overlay.style.transition = 'opacity .22s ease';
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'all';
        setTimeout(() => { location.href = href; }, 230);
    });
})();
