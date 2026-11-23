'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),{enquiry,audit}=require('./contact-forms.cjs');
const SITE='https://talkthetaste.com';
const BOOKING='https://bookings.cloud.microsoft/book/BookaMeetingwithUs@talkthetaste.com/?ismsaljsauthenabled';
const e=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const version=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'css/contact.css'))).update(fs.readFileSync(path.join(root,'js/contact.js'))).update(fs.readFileSync(path.join(root,'js/consultation.js'))).digest('hex').slice(0,10);
const crumbs=(booking=false)=>`<nav aria-label="Breadcrumb"><ol class="cp-crumbs"><li><a href="/">Home</a></li>${booking?'<li><a href="/contact">Contact</a></li>':''}<li><span aria-current="page">${booking?'Free consultation':'Contact'}</span></li></ol></nav>`;
const button=(text,url='/book-consultation')=>`<a class="cp-button" href="${url}" data-track="consultation_cta_click">${text}</a>`;
const main=`<main id="main-content"><div id="contact-page">
<header class="cp-shell cp-hero">${crumbs()}<div class="cp-hero-grid"><div><span class="cp-label">Contact Talk The Taste</span><h1>Let’s talk about<br>your business.</h1></div><p>Book a free 30-minute consultation, or send us a brief. We’ll talk through your goals and the marketing support you need.</p></div></header>
<section class="cp-shell" aria-labelledby="contact-book-title"><div class="cp-booking"><div><span class="cp-label">Free · 30 minutes · Online</span><h2 id="contact-book-title">Book a free consultation.</h2><p>Tell us where your business is today and where you want it to go. Choose a time that works for you.</p></div>${button('Book your free consultation')}</div></section>
<div class="cp-shell cp-content"><aside class="cp-details" aria-label="Contact details"><div><span class="cp-label">A direct line</span><h2>Reach the team.</h2><p>Based in Dubai and Irvine. Working with businesses worldwide.</p></div><dl class="cp-contact-list"><div><dt>Email</dt><dd><a href="mailto:hi@talkthetaste.com">hi@talkthetaste.com</a></dd></div><div><dt>Call</dt><dd><a href="tel:+971565390316">+971 56 539 0316</a></dd></div><div><dt>WhatsApp</dt><dd><a href="https://wa.me/971565390316" target="_blank" rel="noopener">Message the team</a></dd></div></dl><div class="cp-office"><h3>Dubai</h3><p>3B 22nd St, Al Quoz Industrial 4,<br>Dubai, UAE</p></div><div class="cp-office"><h3>Irvine</h3><p>Park Place, 3349 Michelson Dr,<br>Irvine, CA 92612</p></div><div class="cp-other-links"><a class="cp-link" href="https://www.instagram.com/talkthetaste/" target="_blank" rel="noopener">Instagram</a><a class="cp-link" href="/TTTprofile.pdf">Company profile</a></div></aside>
<section class="cp-form-panel" aria-labelledby="enquiry-title"><h2 id="enquiry-title">Prefer to send a brief?</h2><p>Share what you have in mind. Fields marked * are required.</p>${enquiry}<p class="cp-form-error" id="contactStatus" role="alert" hidden></p><div class="cp-success" id="successMsg" role="status" tabindex="-1" hidden><h3>Thank you for your message.</h3><p>We’ve received your enquiry and will be in touch. You can also <a href="/book-consultation">book your free consultation</a> now.</p></div></section></div>
<section class="cp-audit" id="free-audit" aria-labelledby="audit-title"><div class="cp-shell cp-audit-grid"><div class="cp-audit-intro"><span class="cp-label">A closer look</span><h2 id="audit-title">Request a free growth audit.</h2><p>Share your website or Instagram profile. We’ll review it and suggest where to focus next.</p><p>Want to talk it through instead? <a href="/book-consultation" class="cp-link">Book a consultation</a>.</p></div><div>${audit}<p class="cp-form-error" id="auditStatus" role="alert" hidden></p></div></div></section>
</div></main>`;
const consultation=require('./consultation-view.cjs')({crumbs:crumbs(true),bookingURL:BOOKING});
function render(slug,title,description,content,booking=false){
 let html=fs.readFileSync(path.join(root,'about.html'),'utf8')
 .replace(/<style id="about-page-styles">[\s\S]*?<\/style>/,`<link rel="stylesheet" href="/css/contact.css?v=${version}">`)
 .replace(/<main id="main-content">[\s\S]*?<\/main>/,()=>content)
 .replace(/<a href="\/about" class="active">/g,'<a href="/about">')
 .replace(/<title>[\s\S]*?<\/title>/,()=>`<title>${e(title)}</title>`)
 .replace(/(<link rel="canonical" href=")[^"]*/,`$1${SITE}/${slug}`)
 .replace(/\s*<link\b[^>]*hreflang=[^>]+>/g,'');
 for(const[key,value]of Object.entries({description,'og:title':title,'twitter:title':title,'og:description':description,'twitter:description':description,'og:url':SITE+'/'+slug}))html=html.replace(new RegExp(`(<meta\\s+(?:name|property)="${key}"\\s+content=")[^"]*("[^>]*>)`),(_,a,b)=>a+e(value)+b);
 if(!booking)html=html.replace('</head>',`<link rel="alternate" hreflang="en-AE" href="${SITE}/contact"><link rel="alternate" hreflang="ar-AE" href="${SITE}/ar/contact/"><link rel="alternate" hreflang="x-default" href="${SITE}/contact"></head>`);
 html=html.replace('href="/ar/" class="ar-lang"','href="/ar/contact/" class="ar-lang"');
 const schema={'@context':'https://schema.org','@graph':[{'@type':booking?'WebPage':'ContactPage',name:title,url:SITE+'/'+slug,description,potentialAction:{'@type':'ScheduleAction',target:SITE+'/book-consultation'},...(booking?{mainEntity:{'@type':'Service',name:'Free Marketing Consultation',provider:{'@type':'Organization',name:'Talk The Taste',url:SITE},offers:{'@type':'Offer',price:'0',priceCurrency:'AED',url:SITE+'/book-consultation'}}}:{})},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:SITE+'/'},...booking?[{'@type':'ListItem',position:2,name:'Contact',item:SITE+'/contact'},{'@type':'ListItem',position:3,name:'Free consultation',item:SITE+'/'+slug}]:[{'@type':'ListItem',position:2,name:'Contact',item:SITE+'/contact'}]]}]};
 html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,()=>`<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>`);
 const scripts=booking?`<script src="/js/form-utils.bundle.js?v=20261108"></script><script src="/js/consultation.js?v=${version}" data-ttt-page></script>`:`<script src="/js/form-utils.bundle.js?v=20261108"></script><script src="/js/contact.js?v=${version}" data-ttt-page></script>`;
 html=html.replace('</body>',scripts+'</body>').replace(/\b(src|href)=(["'])(css\/|js\/|assets\/|images\/)/g,'$1=$2/$3');
 fs.writeFileSync(path.join(root,slug+'.html'),html);
}
render('contact','Contact | Book a Free Consultation | Talk The Taste','Book a free marketing consultation or send your project brief to Talk The Taste. Contact our team in Dubai and Irvine.',main);
render('book-consultation','Book Your Free Marketing Consultation | TalkTheTaste','Tell us about your business, explore our marketing solutions, and discover how TalkTheTaste can help you grow.',consultation,true);
console.log('Rendered Contact and the Microsoft Bookings consultation page.');
