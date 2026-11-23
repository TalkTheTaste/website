(function(){
 'use strict';
 function init(page){
  const root=document.getElementById('journal-page');if(!root)return;
  const on=page?.on?((t,e,h,o)=>page.on(t,e,h,o)):((t,e,h,o)=>t.addEventListener(e,h,o));
  const form=root.querySelector('#journal-search');
  if(form){const input=form.querySelector('[data-journal-search]');const items=[...root.querySelectorAll('[data-journal-item]')];let topic=root.querySelector('[data-journal-topic][aria-pressed="true"]')?.dataset.journalTopic||'all';
   const filter=()=>{const q=input.value.trim().toLocaleLowerCase();let count=0;items.forEach(item=>{item.hidden=!(topic==='all'||item.dataset.category===topic)||!item.dataset.search.includes(q);if(!item.hidden)count++;});root.querySelector('[data-journal-count]').textContent=count+' '+(count===1?'article':'articles');root.querySelector('[data-journal-empty]').hidden=count!==0;};
   on(form,'submit',e=>{e.preventDefault();filter();});on(input,'input',filter);root.querySelectorAll('[data-journal-topic]').forEach(button=>on(button,'click',e=>{e.preventDefault();topic=button.dataset.journalTopic;root.querySelectorAll('[data-journal-topic]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));form.querySelector('[name="category"]').value=topic;filter();}));
  }
  const copy=root.querySelector('[data-journal-copy]');if(copy){on(copy,'click',async()=>{const fallback=root.querySelector('[data-journal-share-fallback]'),status=root.querySelector('[data-journal-share-status]');try{if(!navigator.clipboard?.writeText)throw Error('Unavailable');await navigator.clipboard.writeText(copy.dataset.url);if(page&&!page.active)return;fallback.hidden=true;status.textContent='Article link copied.';}catch{if(page&&!page.active)return;fallback.hidden=false;const input=fallback.querySelector('input');input.focus();input.select();status.textContent='The article link is selected below. Copy it to share.';}});}
  const prose=root.querySelector('[data-journal-prose]'),progress=document.querySelector('[data-journal-progress]');if(prose&&progress){const update=()=>{const r=prose.getBoundingClientRect();const start=scrollY+r.top,end=start+r.height-innerHeight;const fraction=Math.max(0,Math.min(1,(scrollY-start)/Math.max(1,end-start)));progress.style.transform='scaleX('+fraction+')';};on(window,'scroll',update,{passive:true});on(window,'resize',update);update();}
 }
 if(window.TTTPage?.run)window.TTTPage.run(init);else init();
})();
