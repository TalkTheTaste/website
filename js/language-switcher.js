(function () {
  const routes = {
    '/': '/ar/', '/about': '/ar/about/', '/services': '/ar/services/',
    '/contact': '/ar/contact/', '/restaurant-marketing-dubai': '/ar/restaurant-marketing-dubai/',
    '/blog': '/ar/blog/restaurant-marketing-dubai/'
  };
  const pathname = location.pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/';
  const isArabic = pathname === '/ar' || pathname.startsWith('/ar/');
  document.documentElement.lang = isArabic ? 'ar' : 'en';
  document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
  // Each language link opens a complete translated page. Specialized English pages
  // without an Arabic counterpart explicitly link to the Arabic services overview.
  const matchingArabic = routes[pathname];
  const matchingEnglish = Object.entries(routes).find(([, ar]) => ar.replace(/\/$/, '') === pathname)?.[0];
  const destination = isArabic ? (matchingEnglish || '/') : (matchingArabic || '/ar/services/');
  function bindSwitcher() {
    ensureMobileWhatsapp();
    addFloatingWhatsapp();
    let main = document.querySelector('.ar-lang, .lang-switch');
    const navRight = document.querySelector('.nav-right');
    if (!main && navRight) {
      main = document.createElement('a');
      main.className = 'ar-lang';
      navRight.prepend(main);
    }
    if (!document.querySelector('.language-float')) {
      const floating = document.createElement('a');
      floating.className = 'language-float';
      document.body.appendChild(floating);
    }
    document.querySelectorAll('.ar-lang, .lang-switch, .language-float').forEach(link => {
      link.href = destination;
      link.textContent = isArabic ? 'English' : 'العربية';
      link.lang = isArabic ? 'en' : 'ar';
      link.dir = isArabic ? 'ltr' : 'rtl';
      link.hreflang = link.lang;
      const label = isArabic ? 'View this site in English' : matchingArabic ? 'عرض هذه الصفحة بالعربية' : 'عرض خدماتنا باللغة العربية';
      link.title = label;
      link.setAttribute('aria-label', link.textContent + ' — ' + label);
    });
  }
  function addFloatingWhatsapp() {
    if (document.querySelector('.whatsapp-float')) return;
    const link = document.createElement('a');
    link.className = 'whatsapp-float';
    link.href = 'https://wa.me/971565390316';
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', 'Contact Talk The Taste on WhatsApp');
    link.setAttribute('data-track', 'whatsapp_click');
    link.setAttribute('data-track-label', 'Floating WhatsApp');
    link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path></svg>';
    document.body.appendChild(link);
  }

  function ensureMobileWhatsapp() {
    const nav = document.getElementById('nav');
    if (!nav || nav.querySelector('.nav-wa-mobile')) return;
    const link = document.createElement('a');
    link.className = 'nav-wa-mobile';
    link.href = 'https://wa.me/971565390316';
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', 'Contact Talk The Taste on WhatsApp');
    link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path></svg>';
    nav.insertBefore(link, nav.firstChild);
  }


  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindSwitcher);
  else bindSwitcher();
})();
