/**
 * TTT Page Transitions
 * Smooth fade between pages. Preloader shown once per session (index.html only).
 */
(function() {
    function initMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const mobileMenu = document.getElementById('mobileMenu');
        if (!hamburger || !mobileMenu || hamburger.dataset.menuBound === 'true') return;

        const closeMenu = () => {
            hamburger.classList.remove('open');
            mobileMenu.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
            mobileMenu.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        };

        hamburger.dataset.menuBound = 'true';
        hamburger.addEventListener('click', () => {
            const isOpen = hamburger.classList.toggle('open');
            mobileMenu.classList.toggle('open', isOpen);
            hamburger.setAttribute('aria-expanded', String(isOpen));
            mobileMenu.setAttribute('aria-hidden', String(!isOpen));
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });
        mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

        const closeBtn = document.getElementById('mobileMenuClose');
        if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileMenu);
    } else {
        initMobileMenu();
    }

    const overlay = document.createElement('div');
    overlay.id = 'pt';
    overlay.style.cssText = 'position:fixed;inset:0;background:#060606;z-index:99998;opacity:1;pointer-events:all;transition:opacity .32s ease;';
    document.body.appendChild(overlay);

    requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
    }));

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
