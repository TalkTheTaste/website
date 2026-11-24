'use strict';
module.exports=function initPhoneInputs(root,on=(el,type,fn)=>el.addEventListener(type,fn)){
 const {normalizePhone}=window.TTTForms;
 root.querySelectorAll('[data-phone-field]').forEach(wrap=>{
  const country=wrap.querySelector('[data-phone-country]'),other=wrap.querySelector('[data-phone-other]'),code=wrap.querySelector('[data-phone-code]'),number=wrap.querySelector('[data-phone-number]'),preview=wrap.querySelector('[data-phone-preview]');
  const update=()=>{const custom=country.value==='other';wrap.dataset.other=String(custom);other.hidden=!custom;code.disabled=!custom;code.required=custom;number.setCustomValidity('');code.setCustomValidity('');const normalized=normalizePhone(number.value,custom?'+'+code.value:country.value);preview.textContent=normalized?'Number: '+normalized:'';number.placeholder=custom?'Phone number':country.value==='+971'?'052 997 2923':'Phone number';};
  on(country,'change',()=>{update();if(country.value==='other')code.focus();});on(code,'input',()=>{code.value=code.value.replace(/[^0-9]/g,'').slice(0,4);update();});on(number,'input',update);on(number.form,'reset',()=>setTimeout(update,0));update();
 });
};
