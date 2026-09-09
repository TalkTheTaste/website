(function () {
  const STORAGE_KEY = 'ttt-language';
  const RTL_CLASS = 'i18n-ar';
  const SKIP_SELECTOR = 'script, style, noscript, svg, path, code, pre, textarea, input, select';

  const dictionary = {
    'Home': 'الرئيسية',
    'Services': 'الخدمات',
    'Work': 'الأعمال',
    'Pricing': 'الأسعار',
    'Journal': 'المدونة',
    'About': 'عن الوكالة',
    'Contact': 'تواصل معنا',
    'WhatsApp ↗': 'واتساب ↗',
    'Free Audit': 'تدقيق مجاني',
    "Let's Talk →": 'ابدأ الحديث →',
    'Get Free Audit': 'احصل على تدقيق مجاني',
    'Request free audit →': 'اطلب تدقيقا مجانيا →',
    'Get free website audit →': 'اطلب تدقيقا مجانيا للموقع →',
    'Get free social audit →': 'اطلب تدقيقا مجانيا للسوشيال →',
    'Get free restaurant audit →': 'اطلب تدقيقا مجانيا للمطعم →',
    'WhatsApp us': 'راسلنا على واتساب',
    'See packages': 'استعرض الباقات',
    'View work': 'استعرض الأعمال',
    'See full pricing →': 'شاهد الأسعار كاملة →',
    'Send a Message →': 'أرسل رسالة →',
    'Start Website →': 'ابدأ الموقع →',
    'Build Store →': 'ابن المتجر →',
    'Get Audit →': 'احصل على التدقيق →',
    'Start SEO →': 'ابدأ SEO →',
    'Choose Gold →': 'اختر الباقة الذهبية →',
    'Choose Platinum →': 'اختر الباقة البلاتينية →',
    'Start Now →': 'ابدأ الآن →',
    'Get Quote →': 'اطلب عرض سعر →',
    'Read More': 'اقرأ المزيد',
    'View company profile →': 'استعرض ملف الشركة →',
    'See more of our work →': 'شاهد المزيد من أعمالنا →',
    'Dubai, UAE · Irvine, CA': 'دبي، الإمارات العربية المتحدة · إيرفاين، كاليفورنيا',
    "Dubai's creative agency. Marketing, branding, web, apps, and video, all under one roof.": 'وكالة إبداعية في دبي للتسويق، الهوية، المواقع، التطبيقات والفيديو، كلها تحت سقف واحد.',
    'Company': 'الشركة',
    'Our Work': 'أعمالنا',
    'Privacy Policy': 'سياسة الخصوصية',
    'Terms & Conditions': 'الشروط والأحكام',
    'Restaurant Marketing': 'تسويق المطاعم',
    'Social Media Marketing': 'تسويق وسائل التواصل',
    'Web Design': 'تصميم المواقع',
    'Branding': 'الهوية التجارية',
    'Video Production': 'إنتاج الفيديو',
    'Mobile App Development': 'تطوير تطبيقات الجوال',
    'Custom Software': 'برمجيات مخصصة',
    'Marketing Strategy': 'استراتيجية التسويق',
    'Content Creation': 'صناعة المحتوى',
    'Food Photography': 'تصوير الطعام',
    'What We Do': 'ماذا نقدم',
    'Everything you need.': 'كل ما تحتاجه.',
    'One roof.': 'تحت سقف واحد.',
    'Everything you need.One roof.': 'كل ما تحتاجه. تحت سقف واحد.',
    'From the very first idea to a fully launched campaign, product, or platform, we handle every step of your creative and digital journey. No outsourcing. No middlemen. Just results.': 'من الفكرة الأولى إلى إطلاق الحملة أو المنتج أو المنصة، نتولى كل خطوة في رحلتك الإبداعية والرقمية. بلا تعهيد خارجي. بلا وسطاء. فقط تنفيذ ونتائج.',
    'Marketing Strategy & Management': 'استراتيجية وإدارة التسويق',
    'Data-driven strategies that put your brand in front of the right people at exactly the right moment, including restaurant launch planning, local SEO, content calendars and paid media.': 'استراتيجيات مبنية على البيانات تضع علامتك أمام الجمهور المناسب في الوقت المناسب، وتشمل تخطيط إطلاق المطاعم، SEO المحلي، تقاويم المحتوى والإعلانات المدفوعة.',
    'Full marketing audits & competitor analysis': 'تدقيق تسويقي كامل وتحليل المنافسين',
    'Campaign planning & budget allocation': 'تخطيط الحملات وتوزيع الميزانية',
    'Performance tracking & monthly reporting': 'تتبع الأداء وتقارير شهرية',
    'Email marketing & funnel optimization': 'التسويق بالبريد وتحسين مسار التحويل',
    'Full social media management in Dubai: content calendars, community management, paid ads and growth across Instagram, TikTok, LinkedIn and more.': 'إدارة كاملة لوسائل التواصل في دبي: تقاويم محتوى، إدارة المجتمع، إعلانات مدفوعة ونمو عبر إنستغرام وتيك توك ولينكدإن وغيرها.',
    'Content calendar creation & execution': 'إنشاء وتنفيذ تقويم المحتوى',
    'Community management & DM handling': 'إدارة التعليقات والرسائل',
    'Paid ad campaigns (Meta, TikTok, LinkedIn)': 'حملات إعلانية مدفوعة على ميتا وتيك توك ولينكدإن',
    'Monthly analytics & growth reporting': 'تحليلات شهرية وتقارير نمو',
    'Videography & Visual Production': 'الفيديو والإنتاج البصري',
    'Cinematic brand films, product shoots, reels, and commercial content that tells your story in a way that moves people, and moves product.': 'أفلام للعلامة، تصوير منتجات، ريلز ومحتوى تجاري يروي قصتك بطريقة تحرك الجمهور وتدفع المبيعات.',
    'Brand films & commercials': 'أفلام العلامة والإعلانات',
    'Food photography Dubai': 'تصوير الطعام في دبي',
    'Social media reels & short-form video': 'ريلز وفيديوهات قصيرة للسوشيال',
    'Full post-production & colour grade': 'مونتاج كامل وتصحيح ألوان',
    'Web Design & Development': 'تصميم وتطوير المواقع',
    'Web design and website development in Dubai for fast, conversion-focused websites, landing pages, booking flows and e-commerce stores.': 'تصميم وتطوير مواقع في دبي لمواقع سريعة تركز على التحويل، صفحات هبوط، مسارات حجز ومتاجر إلكترونية.',
    'Custom UI/UX design & prototyping': 'تصميم واجهات وتجربة مستخدم ونماذج أولية',
    'Full-stack development (React, Next.js, etc.)': 'تطوير كامل باستخدام React وNext.js وغيرها',
    'E-commerce & booking integrations': 'تكامل المتاجر الإلكترونية والحجوزات',
    'Speed optimization & SEO setup': 'تحسين السرعة وإعداد SEO',
    'Choose the fastest path to more leads.': 'اختر أسرع مسار لزيادة الاستفسارات.',
    'Growth Paths': 'مسارات النمو',
    'Social Media Marketing Dubai': 'تسويق وسائل التواصل في دبي',
    'Web Design Dubai': 'تصميم المواقع في دبي',
    'Branding Agency Dubai': 'وكالة هوية تجارية في دبي',
    'Restaurant Marketing Dubai': 'تسويق المطاعم في دبي',
    'Restaurant Launch Marketing Dubai': 'تسويق إطلاق المطاعم في دبي',
    'Food Photography Dubai': 'تصوير الطعام في دبي',
    'Transparent Pricing': 'أسعار واضحة',
    'Packages for': 'باقات',
    'clear scopes.': 'بنطاق واضح.',
    'Packages forclear scopes.': 'باقات بنطاق واضح.',
    'No hidden fees. No surprises. We work with brands worldwide, send secure payment links, and keep everything clear before you start.': 'لا رسوم مخفية ولا مفاجآت. نعمل مع علامات حول العالم، ونرسل روابط دفع آمنة، ونوضح كل شيء قبل البدء.',
    'Worldwide clients welcome': 'نرحب بالعملاء عالميا',
    'Credit card, Apple Pay & Samsung Pay': 'بطاقات ائتمان، Apple Pay وSamsung Pay',
    'Bank transfer available': 'التحويل البنكي متاح',
    'Quick Answers': 'إجابات سريعة',
    'How much do marketing and website services cost in Dubai?': 'كم تكلفة خدمات التسويق والمواقع في دبي؟',
    'Social media management starts at AED 4,000 per month, SEO starts at AED 1,500 per month, onsite shoots start at AED 450, ecommerce websites start at AED 5,500, and the basic 5-page website is currently free as a limited offer.': 'تبدأ إدارة وسائل التواصل من 4,000 درهم شهريا، ويبدأ SEO من 1,500 درهم شهريا، وتبدأ جلسات التصوير من 450 درهما، وتبدأ المتاجر الإلكترونية من 5,500 درهم، والموقع الأساسي من 5 صفحات مجاني حاليا كعرض محدود.',
    'Monthly Packages': 'باقات شهرية',
    'Shoot Packages': 'باقات التصوير',
    'Websites Built To Convert': 'مواقع مبنية للتحويل',
    'SEO, AEO & GEO Packages': 'باقات SEO وAEO وGEO',
    'Basic 5 Page Website': 'موقع أساسي من 5 صفحات',
    'Free': 'مجاني',
    'limited offer': 'عرض محدود',
    'Basic speed and SEO setup': 'إعداد أساسي للسرعة وSEO',
    'Pricing FAQ': 'أسئلة الأسعار',
    'Questions before choosing a package.': 'أسئلة قبل اختيار الباقة.',
    'Is the basic 5-page website free?': 'هل الموقع الأساسي من 5 صفحات مجاني؟',
    'Yes. The basic 5-page website package is currently free as a limited offer. Larger website, ecommerce, booking and integration scopes are quoted separately.': 'نعم. باقة الموقع الأساسي من 5 صفحات مجانية حاليا كعرض محدود. المواقع الأكبر، المتاجر الإلكترونية، الحجوزات والتكاملات يتم تسعيرها بشكل منفصل.',
    'Restaurant marketing agency in Dubai that fills tables.': 'وكالة تسويق مطاعم في دبي تساعد على زيادة الحجوزات.',
    'Talk The Taste is a restaurant marketing agency in Dubai helping restaurants, cafes, cloud kitchens and hotel F&B outlets turn social media, food photography, delivery listings and launch campaigns into bookings, calls and orders. No juniors, no outsourcing — you work directly with the team running your account.': 'Talk The Taste وكالة تسويق مطاعم في دبي تساعد المطاعم والمقاهي والمطابخ السحابية ومنافذ الفنادق على تحويل وسائل التواصل، تصوير الطعام، قوائم منصات التوصيل وحملات الإطلاق إلى حجوزات ومكالمات وطلبات. بلا مبتدئين وبلا تعهيد خارجي، تعمل مباشرة مع الفريق الذي يدير حسابك.',
    "What's Included": 'ما الذي يشمله العمل',
    'Content, campaigns and conversion, run by one team.': 'محتوى وحملات وتحويل يديرها فريق واحد.',
    'Food Photography & Reels': 'تصوير الطعام والريلز',
    'Delivery Platform Optimization': 'تحسين منصات التوصيل',
    'Google Maps & Reviews': 'خرائط جوجل والمراجعات',
    'Paid Social Campaigns': 'حملات سوشيال مدفوعة',
    'Website & Booking Flow': 'الموقع ومسار الحجز',
    'How We Work': 'كيف نعمل',
    'Who This Is For': 'لمن هذه الخدمة',
    'Dubai F&B Market': 'سوق المطاعم في دبي',
    'Case Study': 'دراسة حالة',
    'Areas We Serve': 'المناطق التي نخدمها',
    'Restaurant Marketing FAQ': 'أسئلة تسويق المطاعم',
    'Questions Dubai restaurants ask before hiring us.': 'أسئلة تسألها مطاعم دبي قبل التعاقد معنا.',
    'Send us your restaurant page.': 'أرسل لنا صفحة مطعمك.',
    "We'll show you what's costing attention, trust and bookings — free, no obligation.": 'سنوضح لك ما يضعف الانتباه والثقة والحجوزات، مجانا وبدون التزام.',
    'Content that turns attention into leads.': 'محتوى يحول الانتباه إلى استفسارات.',
    'Talk The Taste is a social media agency in Dubai that plans, shoots, edits and manages social media for brands that need stronger visibility, better reels, cleaner campaigns and more enquiries — with direct access to the team running your account, not an account manager relaying to someone else.': 'Talk The Taste وكالة سوشيال ميديا في دبي تخطط وتصور وتحرر وتدير وسائل التواصل للعلامات التي تحتاج ظهورا أقوى، ريلز أفضل، حملات أوضح واستفسارات أكثر، مع وصول مباشر للفريق الذي يدير حسابك.',
    'What You Get': 'ما الذي تحصل عليه',
    'Strategy, content, posting and performance.': 'استراتيجية ومحتوى ونشر وأداء.',
    'Content Strategy': 'استراتيجية المحتوى',
    'Reels & Shoots': 'ريلز وجلسات تصوير',
    'Community Management': 'إدارة المجتمع',
    'Paid Campaigns': 'حملات مدفوعة',
    'Platform Strategy': 'استراتيجية المنصات',
    'Monthly Reporting': 'تقارير شهرية',
    'Platform Approach': 'منهجية المنصات',
    'Social Media FAQ': 'أسئلة السوشيال ميديا',
    'Questions Dubai brands ask before hiring us.': 'أسئلة تسألها علامات دبي قبل التعاقد معنا.',
    'Send us your Instagram.': 'أرسل لنا حساب إنستغرام.',
    "We'll show you what's blocking growth and what to fix first — free, no obligation.": 'سنوضح لك ما يعيق النمو وما يجب إصلاحه أولا، مجانا وبدون التزام.',
    'A website that sells before you speak.': 'موقع يبيع قبل أن تتحدث.',
    'Talk The Taste is a web design company in Dubai designing and building fast, premium websites, landing pages and website development projects for Dubai businesses — brochure sites, booking-integrated sites and full e-commerce builds engineered to turn visitors into WhatsApp messages, calls and form submissions.': 'Talk The Taste شركة تصميم مواقع في دبي تصمم وتبني مواقع سريعة وراقية وصفحات هبوط ومشاريع تطوير مواقع للشركات في دبي، من المواقع التعريفية إلى مواقع الحجز والمتاجر الإلكترونية المصممة لتحويل الزوار إلى رسائل واتساب ومكالمات ونماذج.',
    'Built for clarity, speed and action.': 'مصمم للوضوح والسرعة واتخاذ الإجراء.',
    'Website Types': 'أنواع المواقع',
    'Technical Standards': 'المعايير التقنية',
    'Web Design FAQ': 'أسئلة تصميم المواقع',
    'Questions Dubai businesses ask before hiring us.': 'أسئلة تسألها شركات دبي قبل التعاقد معنا.',
    'Send us your website.': 'أرسل لنا موقعك.',
    "We'll point out the fastest changes to improve conversions — free, no obligation.": 'سنوضح أسرع التغييرات لتحسين التحويلات، مجانا وبدون التزام.',
    'Ready to start your project?': 'جاهز لبدء مشروعك؟',
    'Every service starts with a clear plan. Tell us what you need and we will suggest the right scope.': 'كل خدمة تبدأ بخطة واضحة. أخبرنا بما تحتاجه وسنقترح النطاق المناسب.',
    'Not sure which plan?': 'غير متأكد من الباقة؟',
    "Let's Figure It": 'لنحددها',
    'Out Together.': 'معا.',
    "Let's Figure ItOut Together.": 'لنحددها معا.',
    'Message us on WhatsApp or send us a note. Wherever you are, we will recommend the right package for your budget and goals.': 'راسلنا على واتساب أو أرسل لنا رسالة. أينما كنت، سنقترح الباقة المناسبة لميزانيتك وأهدافك.'
  };

  function normalize(value) {
    return value.replace(/\s+/g, ' ').trim();
  }

  function storageKeyForAttr(attr) {
    return `original${attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`;
  }

  function translated(value) {
    return dictionary[normalize(value)] || value;
  }

  function ensureArabicFont() {
    if (document.getElementById('ttt-arabic-font')) return;
    const link = document.createElement('link');
    link.id = 'ttt-arabic-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  function walkTextNodes(root, callback) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
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

  function rememberOriginals() {
    walkTextNodes(document.body, (node) => {
      if (node.parentElement && node.parentElement.classList.contains('ar-lang')) return;
      if (!node.__tttOriginalText) node.__tttOriginalText = node.nodeValue;
    });

    document.querySelectorAll('[placeholder], [aria-label], [title]').forEach((el) => {
      ['placeholder', 'aria-label', 'title'].forEach((attr) => {
        const key = storageKeyForAttr(attr);
        if (el.hasAttribute(attr) && !el.dataset[key]) el.dataset[key] = el.getAttribute(attr);
      });
    });
  }

  function translateTextNodes(toArabic) {
    walkTextNodes(document.body, (node) => {
      if (node.parentElement && node.parentElement.classList.contains('ar-lang')) return;
      const original = node.__tttOriginalText || node.nodeValue;
      node.nodeValue = toArabic ? translated(original) : original;
    });
  }

  function translateAttributes(toArabic) {
    document.querySelectorAll('[placeholder], [aria-label], [title]').forEach((el) => {
      ['placeholder', 'aria-label', 'title'].forEach((attr) => {
        const original = el.dataset[storageKeyForAttr(attr)];
        if (!original) return;
        el.setAttribute(attr, toArabic ? translated(original) : original);
      });
    });
  }

  function keepInternalLinksOnEnglishTemplates() {
    document.querySelectorAll('a[href^="/ar"]').forEach((link) => {
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

  function updateSwitcher(link, toArabic) {
    link.textContent = toArabic ? 'English' : 'العربية';
    link.lang = toArabic ? 'en' : 'ar';
    link.dir = toArabic ? 'ltr' : 'rtl';
    link.href = '#';
    link.removeAttribute('rel');
    link.removeAttribute('hreflang');
    link.setAttribute('aria-label', toArabic ? 'Switch to English' : 'التبديل إلى العربية');
  }

  function applyLanguage(language) {
    const toArabic = language === 'ar';
    rememberOriginals();
    if (toArabic) ensureArabicFont();
    document.documentElement.lang = toArabic ? 'ar' : 'en';
    document.documentElement.dir = 'ltr';
    document.body.classList.toggle(RTL_CLASS, toArabic);
    translateTextNodes(toArabic);
    translateAttributes(toArabic);
    keepInternalLinksOnEnglishTemplates();
    document.querySelectorAll('.ar-lang, .lang-switch, .language-float').forEach((link) => updateSwitcher(link, toArabic));
    localStorage.setItem(STORAGE_KEY, language);
  }

  function addFloatingSwitcher() {
    if (document.querySelector('.language-float')) return;
    const floating = document.createElement('a');
    floating.className = 'language-float';
    floating.href = '#';
    document.body.appendChild(floating);
  }

  function bindSwitcher() {
    let existing = document.querySelector('.ar-lang, .lang-switch');
    if (!existing) {
      const navRight = document.querySelector('.nav-right');
      if (navRight) {
        existing = document.createElement('a');
        existing.className = 'ar-lang';
        existing.href = '#';
        navRight.insertBefore(existing, navRight.firstChild);
      }
    }

    addFloatingSwitcher();

    document.querySelectorAll('.ar-lang, .lang-switch, .language-float').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const next = localStorage.getItem(STORAGE_KEY) === 'ar' ? 'en' : 'ar';
        applyLanguage(next);
      });
    });

    applyLanguage(localStorage.getItem(STORAGE_KEY) === 'ar' ? 'ar' : 'en');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSwitcher);
  } else {
    bindSwitcher();
  }
})();
