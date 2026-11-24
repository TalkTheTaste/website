(function(){
 'use strict';
 function init(page){
  const root=document.getElementById('contact-page');if(!root)return;
  const on=page?.on?((t,e,h,o)=>page.on(t,e,h,o)):((t,e,h,o)=>t.addEventListener(e,h,o));
  const active=()=>!page||page.active;
  const value=id=>root.querySelector('#'+id).value.trim();
  const checked=id=>root.querySelector('#'+id).checked;
  const status=(id,message)=>{const el=root.querySelector('#'+id);el.textContent=message;el.hidden=!message;};
  function invalid(id,bad,errorId){const field=root.querySelector('#'+id);field.classList.toggle('invalid',bad);field.setAttribute('aria-invalid',String(bad));if(errorId){const error=root.querySelector('#'+errorId);error.hidden=!bad;field.setAttribute('aria-describedby',errorId);}}
  const data=window.TTT||(typeof TTT!=='undefined'?TTT:null);
  if(!window.TTTForms||!data?.saveLead){status('contactStatus','The form could not load. Please email hi@talkthetaste.com or use WhatsApp.');return;}
  TTTForms.initPhoneInputs(root,on);
  root.querySelectorAll('[data-contact-fields]').forEach(fieldset=>fieldset.disabled=false);
  const params=new URLSearchParams(location.search),requestedPackage=(params.get('package')||'').slice(0,120),requestedService=(params.get('service')||params.get('interest')||'').slice(0,120);
  if(requestedService){const select=root.querySelector('#service');const option=[...select.options].find(o=>o.text.toLowerCase().includes(requestedService.toLowerCase()));if(option)select.value=option.value;}
  if(requestedPackage)root.querySelector('#message').value=`I'm interested in the ${requestedPackage} package. Please recommend the best next step.`;
  if(requestedPackage||requestedService){const link=root.querySelector('.cp-booking a');const query=new URLSearchParams();if(requestedPackage)query.set('package',requestedPackage);if(requestedService)query.set('service',requestedService);link.href='/book-consultation?'+query.toString();}
  async function save(lead){try{const saved=data.saveLead(lead);return saved.remoteSaved?await saved.remoteSaved:false;}catch{return false;}}
  function leadDetails(){return {contactConsent:true,consentAt:new Date().toISOString(),page:location.pathname,status:'new'};}
  const form=root.querySelector('#contactForm');
  on(form,'submit',async event=>{
   event.preventDefault();const button=root.querySelector('#submitBtn');if(button.disabled)return;
   const fname=value('fname'),lname=value('lname'),email=value('email'),countryCode=value('countryCode')==='other'?'+'+root.querySelector('#phone').closest('[data-phone-field]').querySelector('[data-phone-code]').value:value('countryCode'),phoneRaw=value('phone'),phone=TTTForms.phoneValue(root.querySelector('#phone')),company=value('company'),service=value('service'),budget=value('budget'),message=value('message');
   const errors={fname:!fname,lname:!lname,email:!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),phone:!phone,message:message.length<10,consent:!checked('contactConsent')};
   for(const id of ['fname','lname','email','phone','message'])invalid(id,errors[id],id+'Error');invalid('countryCode',errors.phone);invalid('contactConsent',errors.consent,'consentError');status('contactStatus','');
   if(Object.values(errors).some(Boolean)){root.querySelector('#contactForm .invalid')?.focus();return;}
   const source=requestedPackage?'Pricing Package Form':'Contact Form';
   const lead={...leadDetails(),fname,lname,email,countryCode,phone,phoneRaw,company,service,budget,message,source,interest:service||requestedService,package:requestedPackage,consentText:'Lead consented to contact by email, WhatsApp, phone call, SMS/text, direct message or other provided methods for enquiry and related services.'};
   button.disabled=true;button.textContent='Sending…';const saved=await save(lead);if(!active())return;
   if(!saved){button.disabled=false;button.textContent='Send Message';status('contactStatus','Your message could not be sent. Please try again, email hi@talkthetaste.com or WhatsApp +971 56 539 0316.');return;}
   // Retain the existing optional email notification after the server accepts the lead.
   const key=data.getSettings?.().web3formsKey;
   if(key){const request=page?.fetch||window.fetch.bind(window);request('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({access_key:key,subject:`New Lead from ${fname} ${lname} - Talk The Taste`,from_name:`${fname} ${lname}`,email,phone,company,service,budget,message})}).catch(()=>{});}
   window.TTTConversion?.track('lead_submit',{source,interest:service,package:requestedPackage});form.hidden=true;const success=root.querySelector('#successMsg');success.hidden=false;success.focus();
  });
  const audit=root.querySelector('#auditForm');
  on(audit,'submit',async event=>{
   event.preventDefault();const button=audit.querySelector('button');if(button.disabled)return;
   const name=value('auditName'),phoneRaw=value('auditPhone'),phone=TTTForms.phoneValue(root.querySelector('#auditPhone')),url=value('auditUrl'),interest=value('auditInterest'),validUrl=TTTForms.validAuditUrl(url);
   const input=root.querySelector('#auditUrl');input.setCustomValidity(validUrl?'':'Enter a website URL or an Instagram handle such as @yourbrand.');
   invalid('auditName',!name);invalid('auditPhone',!phone);invalid('auditUrl',!validUrl);invalid('auditConsent',!checked('auditConsent'));status('auditStatus','');
   if(!name||!phone||!validUrl||!checked('auditConsent')){status('auditStatus','Add your name, a valid WhatsApp number, your website or Instagram, and permission to contact you.');audit.querySelector('.invalid')?.focus();if(!validUrl)input.reportValidity();return;}
   const lead={...leadDetails(),fname:name.split(' ')[0],lname:name.split(' ').slice(1).join(' ')||'-',email:'audit@talkthetaste.com',phone,phoneRaw,service:'Free Growth Audit',interest,source:'Free Growth Audit Form',auditUrl:url,message:`Free growth audit request\nWebsite/Instagram: ${url}\nGoal: ${interest}`,consentText:'Lead consented to contact by WhatsApp, phone, SMS/text, email or other provided methods for audit request and related services.'};
   button.disabled=true;button.textContent='Sending…';const saved=await save(lead);if(!active())return;button.disabled=false;button.textContent='Request free audit';
   if(!saved){status('auditStatus','Your audit request could not be sent. Please try again or WhatsApp +971 56 539 0316.');return;}
   window.TTTConversion?.track('lead_submit',{source:'Free Growth Audit Form',interest});audit.reset();root.querySelector('#auditSuccess').hidden=false;
  });
 }
 if(window.TTTPage?.run)window.TTTPage.run(init);else init();
})();
