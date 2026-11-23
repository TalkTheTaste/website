(function(){
 'use strict';
 function init(){
  const root=document.getElementById('consultation-page');if(!root)return;
  const params=new URLSearchParams(location.search),packageName=(params.get('package')||'').slice(0,120),service=(params.get('service')||params.get('interest')||'').slice(0,120);
  if(packageName||service){const context=root.querySelector('[data-booking-context]');context.textContent='Interested in '+(packageName?packageName+' package':service)+'? Mention it when adding your booking details.';context.hidden=false;
   const link=root.querySelector('a[href="/contact#contactForm"]'),query=new URLSearchParams();if(packageName)query.set('package',packageName);if(service)query.set('service',service);link.href='/contact?'+query.toString()+'#contactForm';}
 }
 if(window.TTTPage?.run)window.TTTPage.run(init);else init();
})();
