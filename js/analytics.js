(function () {
    'use strict';
    if (window.__tttAnalyticsScheduled) return;
    window.__tttAnalyticsScheduled = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', 'G-7B481RG9KT');

    let loaded = false;
    function load() {
        if (loaded || navigator.doNotTrack === '1') return;
        loaded = true;
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=G-7B481RG9KT';
        document.head.appendChild(script);
        window.removeEventListener('pointerdown', load);
        window.removeEventListener('keydown', load);
    }
    // Queue conversion events immediately; download the SDK after critical paint.
    window.addEventListener('pointerdown', load, { once: true, passive: true });
    window.addEventListener('keydown', load, { once: true });
    function schedule() {
        window.setTimeout(() => {
            if (window.requestIdleCallback) window.requestIdleCallback(load, { timeout: 1000 });
            else load();
        }, 2500);
    }
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
})();
