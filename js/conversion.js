(function() {
    'use strict';

    const TTTConversion = {
        track(eventName, data = {}) {
            const payload = {
                event: eventName,
                page: location.pathname,
                referrer: document.referrer || '',
                timestamp: new Date().toISOString(),
                ...data,
            };
            try {
                const key = 'ttt_conversion_events';
                const events = JSON.parse(localStorage.getItem(key) || '[]').slice(-99);
                events.push(payload);
                localStorage.setItem(key, JSON.stringify(events));
            } catch(e) {}
            if (typeof window.gtag === 'function') window.gtag('event', eventName, payload);
            if (typeof window.fbq === 'function') window.fbq('trackCustom', eventName, payload);
            if (typeof window.ttq !== 'undefined' && window.ttq.track) window.ttq.track(eventName, payload);
            window.dispatchEvent(new CustomEvent('ttt:conversion', { detail: payload }));
        },
        whatsappUrl(message, source = 'Website') {
            const text = encodeURIComponent(`${message}\n\nSource: ${source}\nPage: ${location.href}`);
            return `https://wa.me/971565390316?text=${text}`;
        },
    };

    window.TTTConversion = TTTConversion;

    document.addEventListener('click', event => {
        const target = event.target.closest('[data-track], a[href*="wa.me"]');
        if (!target) return;
        const isWhatsApp = target.href && target.href.includes('wa.me');
        TTTConversion.track(target.dataset.track || (isWhatsApp ? 'whatsapp_click' : 'cta_click'), {
            label: target.dataset.trackLabel || target.textContent.trim().slice(0, 80),
            href: target.href || '',
            source: target.dataset.source || '',
        });
    });
})();
