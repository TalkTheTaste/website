(function(){
 'use strict';
 function init(page){
  const button=document.querySelector('[data-copy-package]');if(!button)return;
  const on=page?.on?((target,event,handler)=>page.on(target,event,handler)):((target,event,handler)=>target.addEventListener(event,handler));
  const text=document.getElementById('pp-package-text');const status=document.querySelector('[data-copy-status]');const fallback=document.querySelector('[data-copy-fallback]');
  on(button,'click',async()=>{
   try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(text.value);if(page&&!page.active)return;fallback.hidden=true;status.textContent='Package details copied.';}
   catch{if(page&&!page.active)return;fallback.hidden=false;text.focus();text.select();status.textContent='The package details are selected below. Copy them to share.';}
  });
 }
 if(window.TTTPage?.run)window.TTTPage.run(init);else init();
})();
