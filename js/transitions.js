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
