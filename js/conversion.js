(function() {
    'use strict';

    const pageStartedAt = Date.now();
    let maxScrollDepth = 0;
    let pageviewSent = false;

    const TTTConversion = {
        track(eventName, data = {}) {
            const sessionId = getSessionId();
            const params = new URLSearchParams(location.search);
            const payload = {
                event: eventName,
                type: eventName,
                page: `${location.pathname}${location.search}`,
                title: document.title || '',
                referrer: document.referrer || '',
                timestamp: new Date().toISOString(),
                sessionId,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
                language: navigator.language || '',
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                screen: `${screen.width}x${screen.height}`,
                connection: connectionType(),
                utmSource: params.get('utm_source') || '',
                utmMedium: params.get('utm_medium') || '',
                utmCampaign: params.get('utm_campaign') || '',
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
            sendToServer(payload);
            window.dispatchEvent(new CustomEvent('ttt:conversion', { detail: payload }));
        },
        whatsappUrl(message, source = 'Website') {
            const text = encodeURIComponent(`${message}\n\nSource: ${source}\nPage: ${location.href}`);
            return `https://wa.me/971565390316?text=${text}`;
        },
    };

    window.TTTConversion = TTTConversion;

    function getSessionId() {
        try {
            const key = 'ttt_session_id';
            let id = sessionStorage.getItem(key);
            if (!id) {
                id = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
                sessionStorage.setItem(key, id);
            }
            return id;
        } catch(e) {
            return '';
        }
    }

    function sendToServer(payload) {
        if (location.pathname.startsWith('/admin')) return;
        if (navigator.doNotTrack === '1') return;
        const body = JSON.stringify(payload);
        if (navigator.sendBeacon) {
            try {
                const blob = new Blob([body], { type: 'application/json' });
                if (navigator.sendBeacon('/api/analytics/track', blob)) return;
            } catch(e) {}
        }
        fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
        }).catch(() => {});
    }

    if (!location.pathname.startsWith('/admin')) {
        window.addEventListener('load', () => {
            pageviewSent = true;
            TTTConversion.track('pageview', {
                metrics: pageMetrics(),
            });
        }, { once:true });
        window.addEventListener('scroll', updateScrollDepth, { passive:true });
        window.addEventListener('pagehide', () => {
            TTTConversion.track('engagement', {
                durationMs: Date.now() - pageStartedAt,
                scrollDepth: maxScrollDepth,
                metrics: pageviewSent ? undefined : pageMetrics(),
            });
        });
        window.addEventListener('error', event => {
            const target = event.target;
            if (target && target !== window && (target.src || target.href)) {
                TTTConversion.track('resource_error', {
                    label: target.tagName || 'resource',
                    href: target.src || target.href || '',
                });
                return;
            }
            TTTConversion.track('js_error', {
                label: event.message || 'JavaScript error',
                source: `${event.filename || ''}:${event.lineno || 0}`,
            });
        }, true);
        window.addEventListener('unhandledrejection', event => {
            TTTConversion.track('js_error', {
                label: String(event.reason?.message || event.reason || 'Unhandled promise rejection').slice(0, 160),
            });
        });
    }

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

    function pageMetrics() {
        const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
        if (!nav) {
            const timing = performance.timing;
            if (!timing || !timing.navigationStart) return {};
            return {
                loadMs: Math.max(0, timing.loadEventEnd - timing.navigationStart),
                domMs: Math.max(0, timing.domContentLoadedEventEnd - timing.navigationStart),
                ttfbMs: Math.max(0, timing.responseStart - timing.requestStart),
            };
        }
        return {
            loadMs: Math.round(nav.loadEventEnd || nav.duration || 0),
            domMs: Math.round(nav.domContentLoadedEventEnd || 0),
            ttfbMs: Math.round(nav.responseStart || 0),
            transferSize: nav.transferSize || 0,
            encodedBodySize: nav.encodedBodySize || 0,
        };
    }

    function updateScrollDepth() {
        const doc = document.documentElement;
        const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
        const depth = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
        if (depth > maxScrollDepth) maxScrollDepth = depth;
    }

    function connectionType() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!conn) return '';
        return [conn.effectiveType, conn.saveData ? 'save-data' : ''].filter(Boolean).join(' ');
    }
})();
