(function(){
 'use strict';
 function init(page){
  const root=document.getElementById('work-page');if(!root)return;
  const on=page?.on?((target,event,handler,options)=>page.on(target,event,handler,options)):((target,event,handler,options)=>target.addEventListener(event,handler,options));
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduced&&'IntersectionObserver'in window){
   const Observer=page?.IntersectionObserver||window.IntersectionObserver;
   const observer=new Observer(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('wk-motion');observer.unobserve(entry.target);}}),{threshold:.08});
   root.querySelectorAll('.wk-card,.wk-figure').forEach(card=>observer.observe(card));
  }
  const cards=[...root.querySelectorAll('[data-work-card]')];
  root.querySelectorAll('[data-work-filter]').forEach(button=>on(button,'click',()=>{
   const filter=button.dataset.workFilter;let count=0;
   root.querySelectorAll('[data-work-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
   cards.forEach(card=>{card.hidden=filter!=='all'&&!card.dataset.types.split(' ').includes(filter);if(!card.hidden)count++;});
   root.querySelector('[data-work-grid]').dataset.activeFilter=filter;
   root.querySelector('[data-work-count]').textContent=count+' '+(count===1?'project':'projects');
  }));
  const dialog=document.querySelector('.wk-lightbox');if(!dialog||!dialog.showModal)return;
  const items=[...root.querySelectorAll('[data-work-media]')];const viewer=dialog.querySelector('[data-work-viewer]');let active=0,trigger=null,previousOverflow='';
  const show=index=>{
   active=(index+items.length)%items.length;const item=items[active];viewer.replaceChildren();
   const element=document.createElement(item.dataset.workMedia==='video'?'video':'img');
   element.src=item.href;
   if(element.tagName==='VIDEO'){element.controls=true;element.preload='metadata';element.poster=item.dataset.workPoster;element.setAttribute('playsinline','');}
   else element.alt=item.dataset.workCaption;
   viewer.appendChild(element);dialog.querySelector('[data-work-viewer-caption]').textContent=item.dataset.workCaption+' · '+(active+1)+' / '+items.length;
  };
  items.forEach((item,index)=>on(item,'click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();trigger=item;show(index);previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();}));
  on(dialog.querySelector('[data-work-close]'),'click',()=>dialog.close());
  on(dialog.querySelector('[data-work-prev]'),'click',()=>show(active-1));
  on(dialog.querySelector('[data-work-next]'),'click',()=>show(active+1));
  on(dialog,'keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();show(active-1);}if(event.key==='ArrowRight'){event.preventDefault();show(active+1);}});
  on(dialog,'close',()=>{viewer.replaceChildren();document.body.style.overflow=previousOverflow;trigger?.focus({preventScroll:true});});
  page?.signal?.addEventListener('abort',()=>{if(dialog.open)dialog.close();viewer.replaceChildren();document.body.style.overflow=previousOverflow;},{once:true});
 }
 if(window.TTTPage?.run)window.TTTPage.run(init);else init();
})();
