(function () {
  const STORAGE_KEY = 'ttt-language';
  const SCRIPT_ID = 'ttt-google-translate-script';
  const WIDGET_ID = 'ttt-google-translate';
  const ARABIC_FONT_ID = 'ttt-arabic-font';
  const RTL_CLASS = 'i18n-ar';
  const SKIP_SELECTOR = 'script, style, noscript, svg, path, code, pre, textarea, input, select, #ttt-google-translate, .skiptranslate';

  let translateReady;
  let isSwitching = false;
  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();
  const originalMarkup = new WeakMap();

  function ensureArabicFont() {
    if (document.getElementById(ARABIC_FONT_ID)) return;
    const link = document.createElement('link');
    link.id = ARABIC_FONT_ID;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  function ensureWidgetContainer() {
    let container = document.getElementById(WIDGET_ID);
    if (container) return container;

    container = document.createElement('div');
    container.id = WIDGET_ID;
    container.setAttribute('aria-hidden', 'true');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);
    return container;
  }

  function loadTranslate() {
    if (translateReady) return translateReady;

    translateReady = new Promise((resolve, reject) => {
      ensureWidgetContainer();

      window.googleTranslateElementInit = function () {
        /* global google */
        new google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'ar,en',
          autoDisplay: false,
          multilanguagePage: true
        }, WIDGET_ID);
        resolve();
      };

      if (window.google && window.google.translate && window.google.translate.TranslateElement) {
        window.googleTranslateElementInit();
        return;
      }

      const existing = document.getElementById(SCRIPT_ID);
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return translateReady;
  }

  function findTranslateSelect() {
    return document.querySelector('.goog-te-combo');
  }

  function normalize(value) {
    return value.replace(/\s+/g, ' ').trim();
  }

  function walkTextNodes(callback) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !normalize(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(callback);
  }

  function snapshotOriginalPage() {
    document.querySelectorAll('h1, h2, h3, h4, p, li, summary, button, a, span, .eyebrow, .svc-title, .svc-desc, .pkg-name, .pkg-tagline, .pricing-sec-title, .pricing-sec-sub, .footer-heading, .footer-brand-desc').forEach((el) => {
      if (el.closest(SKIP_SELECTOR) || el.classList.contains('ar-lang') || el.classList.contains('language-float')) return;
      if (!normalize(el.textContent || '')) return;
      if (!originalMarkup.has(el)) originalMarkup.set(el, el.innerHTML);
    });

    walkTextNodes((node) => {
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    });

    document.querySelectorAll('[placeholder], [aria-label], [title]').forEach((el) => {
      if (el.closest(SKIP_SELECTOR)) return;
      if (!originalAttrs.has(el)) {
        originalAttrs.set(el, {
          placeholder: el.getAttribute('placeholder'),
          ariaLabel: el.getAttribute('aria-label'),
          title: el.getAttribute('title')
        });
      }
    });
  }

  function restoreOriginalPage() {
    document.querySelectorAll('h1, h2, h3, h4, p, li, summary, button, a, span, .eyebrow, .svc-title, .svc-desc, .pkg-name, .pkg-tagline, .pricing-sec-title, .pricing-sec-sub, .footer-heading, .footer-brand-desc').forEach((el) => {
      if (el.closest(SKIP_SELECTOR) || el.classList.contains('ar-lang') || el.classList.contains('language-float')) return;
      if (originalMarkup.has(el)) el.innerHTML = originalMarkup.get(el);
    });

    walkTextNodes((node) => {
      if (originalText.has(node)) node.nodeValue = originalText.get(node);
    });

    document.querySelectorAll('[placeholder], [aria-label], [title]').forEach((el) => {
      const attrs = originalAttrs.get(el);
      if (!attrs) return;
      if (attrs.placeholder === null) el.removeAttribute('placeholder');
      else el.setAttribute('placeholder', attrs.placeholder);
      if (attrs.ariaLabel === null) el.removeAttribute('aria-label');
      else el.setAttribute('aria-label', attrs.ariaLabel);
      if (attrs.title === null) el.removeAttribute('title');
      else el.setAttribute('title', attrs.title);
    });
  }

  function expireGoogleTranslateCookie() {
    const hostParts = window.location.hostname.split('.');
    const domains = ['', window.location.hostname];
    if (hostParts.length > 2) domains.push(`.${hostParts.slice(-2).join('.')}`);

    domains.forEach((domain) => {
      const domainPart = domain ? `;domain=${domain}` : '';
      document.cookie = `googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/${domainPart}`;
      document.cookie = `googtrans=/en/en;path=/${domainPart}`;
    });
  }

  function dispatchNativeChange(select) {
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setTranslateLanguage(language) {
    return loadTranslate().then(() => new Promise((resolve) => {
      let attempts = 0;
      const timer = window.setInterval(() => {
        const select = findTranslateSelect();
        attempts += 1;
        if (select) {
          select.value = language === 'ar' ? 'ar' : 'en';
          if (language !== 'ar') select.value = '';
          dispatchNativeChange(select);
          window.clearInterval(timer);
          window.setTimeout(resolve, 350);
        } else if (attempts > 40) {
          window.clearInterval(timer);
          resolve();
        }
      }, 100);
    }));
  }

  function keepCurrentPageLinks() {
    document.querySelectorAll('a[href^="/ar"], a[href="/ar"]').forEach((link) => {
      const path = new URL(link.getAttribute('href'), window.location.origin).pathname;
      const englishPath = path
        .replace(/^\/ar\/blog\/restaurant-marketing-dubai\/?$/, '/blog')
        .replace(/^\/ar\/restaurant-marketing-dubai\/?$/, '/restaurant-marketing-dubai')
        .replace(/^\/ar\/services\/?$/, '/services')
        .replace(/^\/ar\/about\/?$/, '/about')
        .replace(/^\/ar\/contact\/?$/, '/contact')
        .replace(/^\/ar\/?$/, '/');
      link.setAttribute('href', englishPath);
    });
  }

  function updateSwitcher(link, language) {
    const isArabic = language === 'ar';
    link.classList.add('notranslate');
    link.setAttribute('translate', 'no');
    link.textContent = isArabic ? 'English' : 'العربية';
    link.lang = isArabic ? 'en' : 'ar';
    link.dir = isArabic ? 'ltr' : 'rtl';
    link.href = '#';
    link.removeAttribute('rel');
    link.removeAttribute('hreflang');
    link.setAttribute('aria-label', isArabic ? 'Switch to English' : 'التبديل إلى العربية');
  }

  function updatePageState(language) {
    const isArabic = language === 'ar';
    document.documentElement.lang = isArabic ? 'ar' : 'en';
    document.documentElement.dir = 'ltr';
    document.body.classList.toggle(RTL_CLASS, isArabic);
    document.querySelectorAll('.ar-lang, .lang-switch, .language-float').forEach((link) => updateSwitcher(link, language));
    localStorage.setItem(STORAGE_KEY, language);
  }

  function applyLanguage(language) {
    if (isSwitching) return Promise.resolve();
    isSwitching = true;
    keepCurrentPageLinks();
    updatePageState(language);
    if (language !== 'ar') {
      expireGoogleTranslateCookie();
      restoreOriginalPage();
      window.setTimeout(restoreOriginalPage, 150);
      window.setTimeout(restoreOriginalPage, 700);
      return setTranslateLanguage('en').finally(() => {
        restoreOriginalPage();
        updatePageState('en');
        isSwitching = false;
      });
    }

    snapshotOriginalPage();
    ensureArabicFont();
    return setTranslateLanguage('ar').finally(() => {
      updatePageState('ar');
      isSwitching = false;
    });
  }

  function addFloatingSwitcher() {
    if (document.querySelector('.language-float')) return;
    const floating = document.createElement('a');
    floating.className = 'language-float';
    floating.href = '#';
    document.body.appendChild(floating);
  }

  function ensureMainSwitcher() {
    let switcher = document.querySelector('.ar-lang, .lang-switch');
    if (switcher) return switcher;

    const navRight = document.querySelector('.nav-right');
    if (!navRight) return null;

    switcher = document.createElement('a');
    switcher.className = 'ar-lang';
    switcher.href = '#';
    navRight.insertBefore(switcher, navRight.firstChild);
    return switcher;
  }

  function bindSwitcher() {
    ensureMainSwitcher();
    addFloatingSwitcher();
    keepCurrentPageLinks();

    document.querySelectorAll('.ar-lang, .lang-switch, .language-float').forEach((link) => {
      updateSwitcher(link, localStorage.getItem(STORAGE_KEY) === 'ar' ? 'ar' : 'en');
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const next = localStorage.getItem(STORAGE_KEY) === 'ar' ? 'en' : 'ar';
        applyLanguage(next);
      });
    });

    if (localStorage.getItem(STORAGE_KEY) === 'ar') applyLanguage('ar');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSwitcher);
  } else {
    bindSwitcher();
  }
})();
