(function () {
  const path = window.location.pathname.replace(/\/index\.html$/, '/');
  const clean = path.length > 1 ? path.replace(/\/$/, '') : '/';

  const toArabic = {
    '/': '/ar/',
    '/services': '/ar/services/',
    '/about': '/ar/about/',
    '/contact': '/ar/contact/',
    '/restaurant-marketing-dubai': '/ar/restaurant-marketing-dubai/',
    '/food-photography-dubai': '/ar/services/#food-photography',
    '/restaurant-launch-marketing-dubai': '/ar/restaurant-marketing-dubai/#launch',
    '/social-media-marketing-dubai': '/ar/services/#social-media',
    '/web-design-dubai': '/ar/services/#web-design',
    '/branding-agency-dubai': '/ar/services/#branding',
    '/video-production-dubai': '/ar/services/#video',
    '/mobile-app-development-dubai': '/ar/services/#apps',
    '/custom-software-development-dubai': '/ar/services/#software',
    '/marketing-strategy-dubai': '/ar/services/#strategy',
    '/content-creation-dubai': '/ar/services/#content',
    '/pricing': '/ar/services/#pricing',
    '/blog': '/ar/blog/restaurant-marketing-dubai/',
  };

  const toEnglish = {
    '/ar': '/',
    '/ar/services': '/services',
    '/ar/about': '/about',
    '/ar/contact': '/contact',
    '/ar/restaurant-marketing-dubai': '/restaurant-marketing-dubai',
    '/ar/blog/restaurant-marketing-dubai': '/blog',
  };

  const isArabic = clean === '/ar' || clean.startsWith('/ar/');
  const target = isArabic ? (toEnglish[clean] || '/') : (toArabic[clean] || '/ar/services/');
  const label = isArabic ? 'English' : 'العربية';
  const lang = isArabic ? 'en' : 'ar';
  const dir = isArabic ? 'ltr' : 'rtl';

  document.documentElement.dataset.languageTarget = target;

  function addFloatingSwitcher() {
    if (document.querySelector('.language-float')) return;
    const floating = document.createElement('a');
    floating.className = 'language-float';
    floating.href = target;
    floating.textContent = label;
    floating.lang = lang;
    floating.dir = dir;
    floating.rel = 'alternate';
    floating.hreflang = lang;
    floating.setAttribute('aria-label', isArabic ? 'Switch to English' : 'التبديل إلى العربية');
    document.body.appendChild(floating);
  }

  function applySwitcher() {
    const existing = document.querySelector('.ar-lang, .lang-switch');
    if (existing) {
      existing.href = target;
      existing.textContent = label;
      existing.lang = lang;
      existing.dir = dir;
      existing.rel = 'alternate';
      existing.hreflang = lang;
      existing.setAttribute('aria-label', isArabic ? 'Switch to English' : 'التبديل إلى العربية');
      addFloatingSwitcher();
      return;
    }

    const navRight = document.querySelector('.nav-right');
    if (!navRight) {
      addFloatingSwitcher();
      return;
    }

    const link = document.createElement('a');
    link.className = 'ar-lang';
    link.href = target;
    link.textContent = label;
    link.lang = lang;
    link.dir = dir;
    link.rel = 'alternate';
    link.hreflang = lang;
    link.setAttribute('aria-label', isArabic ? 'Switch to English' : 'التبديل إلى العربية');
    navRight.insertBefore(link, navRight.firstChild);
    addFloatingSwitcher();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySwitcher);
  } else {
    applySwitcher();
  }
})();
