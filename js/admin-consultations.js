(() => {
  'use strict';
  const list = document.getElementById('consultationList');
  const status = document.getElementById('consultationStatus');
  const filter = document.getElementById('consultationFilter');
  const search = document.getElementById('consultationSearch');
  const more = document.getElementById('moreConsultations');
  const dialog=document.getElementById('cancelConsultationDialog');
  const cancelForm=document.getElementById('cancelConsultationForm');
  const reason=document.getElementById('cancelConsultationReason');
  const cancelError=document.getElementById('cancelConsultationError');
  const submitCancel=document.getElementById('confirmCancelConsultation');
  const keepMeeting=document.getElementById('keepConsultation');
  const sharedConfirm=document.getElementById('cancelSharedConfirm');
  const meetingViews=new Map();let selectedMeeting=null,cancelling=false;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const states = {confirmed:'Confirmed at booking', pending:'Confirmation pending', uncertain:'Needs checking', cancelled:'Cancelled', rejected:'Not booked'};
  const notifications = {queued:'Queued by CallMeBot', pending:'Waiting for confirmation', sending:'Delivery checking', unconfirmed:'Delivery unconfirmed', not_configured:'CallMeBot not configured', legacy:'Not recorded for older requests'};
  const date = value => value ? new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Dubai', dateStyle:'medium', timeStyle:'short'}).format(new Date(value)) : 'Time not recorded';
  let controller, generation = 0, nextOffset = null, timer;
  function card(item) {
    const c = item.contact;
    const contact = [c.email && `<a href="mailto:${escape(encodeURIComponent(c.email))}">${escape(c.email)}</a>`, c.phone && `<a href="tel:${escape(encodeURIComponent(c.phone))}">${escape(c.phone)}</a>`].filter(Boolean).join('');
    return `<details class="consultation-card" data-reference="${escape(item.reference)}"><summary><span><strong>${escape(c.name || 'Older website request')}</strong><span>${escape(c.company || c.service || 'Free Marketing Consultation')}</span></span><span class="consultation-when">${escape(date(item.start))}<small>Dubai, UAE</small></span><span class="consultation-state state-${escape(item.state)}">${escape(states[item.state] || item.state)}</span></summary><div class="consultation-details"><div class="consultation-contact">${contact || '<span>Contact details were not stored for this older request.</span>'}</div><dl><div><dt>Reference</dt><dd>${escape(item.reference)}</dd></div><div><dt>WhatsApp alert</dt><dd>${escape(notifications[item.notification] || 'Not recorded')}</dd></div><div><dt>Submitted</dt><dd>${escape(date(item.createdAt))} · Dubai</dd></div>${c.company ? `<div><dt>Company / business</dt><dd>${escape(c.company)}</dd></div>` : ''}${c.context ? `<div><dt>Interest</dt><dd>${escape(c.context)}</dd></div>` : ''}<div><dt>Visitor’s time zone</dt><dd>${escape(item.timeZone || c.requested?.timeZone || 'Not recorded')}</dd></div><div><dt>Contact permission recorded</dt><dd>${c.consentAt ? escape(date(c.consentAt))+' · Dubai' : 'Not recorded for this older request'}</dd></div>${(c.answers || []).map(a => `<div><dt>${escape(a.question)}</dt><dd>${escape(a.answer || 'Not provided')}</dd></div>`).join('')}<div><dt>Message / discussion topics</dt><dd>${escape(c.notes || 'Not provided')}</dd></div></dl><div class="consultation-live" data-meeting-details><p role="status">Loading latest meeting details…</p></div></div></details>`;
  }
  async function api(path,body){
    const response=await fetch('/api/consultations/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(45000),headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json();if(!response.ok)throw Error(data.message||'Unable to reach the meeting calendar.');return data;
  }
  function liveHTML(view){
    const c=view.contact||{};
    return `<h3>Latest meeting details</h3><dl><div><dt>Name</dt><dd>${escape(c.name||'Not recorded')}</dd></div><div><dt>Email</dt><dd>${escape(c.email||'Not recorded')}</dd></div><div><dt>Phone</dt><dd>${escape(c.phone||'Not recorded')}</dd></div><div><dt>Company / business</dt><dd>${escape(c.company||'Not provided')}</dd></div><div><dt>Meeting time · Dubai, UAE</dt><dd>${escape(date(view.start))} – ${escape(date(view.end))}</dd></div><div><dt>Service</dt><dd>${escape(view.service||c.service||'Free Marketing Consultation')}</dd></div>${(c.answers||[]).map(a=>`<div><dt>${escape(a.question)}</dt><dd>${escape(a.answer||'Not provided')}</dd></div>`).join('')}${view.microsoftNotes?`<div class="consultation-full"><dt>Microsoft booking notes</dt><dd>${escape(view.microsoftNotes)}</dd></div>`:''}${view.cancellation?`<div class="consultation-full"><dt>Cancellation · ${escape(view.cancellation.state)}</dt><dd>${escape(view.cancellation.reason)}<br>${escape(date(view.cancellation.updatedAt))} · Dubai</dd></div>`:''}</dl>
    ${view.attendeeCount>1?`<p class="consultation-shared-notice">Shared meeting · ${escape(view.attendeeCount)} customers attached. Cancelling it will notify everyone.</p>`:''}
    ${view.permissionRequired?'<p>Cancellation requires the Microsoft Bookings.ReadWrite.All application permission and admin consent.</p>':''}
    ${['sending','uncertain'].includes(view.cancellation?.state)?'<p role="status">Cancellation is unconfirmed. Check Microsoft Bookings before trying again; this request will not be sent twice automatically.</p>':''}
    <div class="consultation-meeting-actions">${view.joinUrl&&view.state==='confirmed'&&!['sending','uncertain','cancelled'].includes(view.cancellation?.state)?`<a class="btn-primary" data-join-meeting href="${escape(view.joinUrl)}" target="_blank" rel="noopener noreferrer">Join meeting <span aria-hidden="true">↗</span></a>`:view.state==='confirmed'?'<span>No active meeting link is available yet.</span>':''}<button class="btn-secondary" data-action="refresh-meeting" type="button">Refresh meeting details</button>${view.canCancel?'<button class="btn-secondary consultation-cancel-link" data-action="cancel-meeting" type="button">Cancel meeting</button>':''}</div>`;
  }
  async function loadMeeting(card){
    const target=card.querySelector('[data-meeting-details]'),id=card.dataset.reference;
    target.setAttribute('aria-busy','true');
    try{const view=await api(id);if(!card.isConnected)return;meetingViews.set(id,view);target.innerHTML=liveHTML(view);card.querySelector('.consultation-state').textContent=states[view.state]||view.state;card.querySelector('.consultation-when').innerHTML=escape(date(view.start))+'<small>Dubai, UAE</small>';}
    catch(error){target.replaceChildren();const message=document.createElement('p');message.setAttribute('role','alert');message.textContent=error.message;const retry=document.createElement('button');retry.type='button';retry.className='btn-secondary';retry.dataset.action='refresh-meeting';retry.textContent='Retry meeting details';target.append(message,retry);}
    finally{target.setAttribute('aria-busy','false');}
  }
  list.addEventListener('toggle',event=>{const card=event.target;if(card.matches('.consultation-card')&&card.open&&!meetingViews.has(card.dataset.reference))loadMeeting(card);},true);
  list.addEventListener('click',event=>{
    const action=event.target.closest('[data-action]');if(!action)return;const card=action.closest('.consultation-card');
    if(action.dataset.action==='refresh-meeting'){loadMeeting(card);return;}
    selectedMeeting=meetingViews.get(card.dataset.reference);if(!selectedMeeting?.canCancel)return;
    cancelForm.reset();cancelError.textContent='';
    document.getElementById('cancelConsultationSummary').textContent=(selectedMeeting.contact?.name||'Consultation')+' · '+date(selectedMeeting.start)+' · Dubai, UAE';
    const shared=selectedMeeting.attendeeCount>1;document.getElementById('cancelSharedWarning').hidden=!shared;sharedConfirm.required=shared;
    submitCancel.disabled=false;submitCancel.textContent='Cancel meeting and notify';dialog.showModal();reason.focus();
  });
  keepMeeting.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('cancel',event=>{if(cancelling)event.preventDefault();});
  cancelForm.addEventListener('submit',async event=>{
    event.preventDefault();if(cancelling||!selectedMeeting||!cancelForm.reportValidity())return;
    cancelling=true;submitCancel.disabled=true;keepMeeting.disabled=true;reason.disabled=true;sharedConfirm.disabled=true;submitCancel.textContent='Cancelling meeting…';cancelError.textContent='';
    const id=selectedMeeting.reference;
    try{
      const result=await api(id+'/cancel',{reason:reason.value,version:selectedMeeting.version,confirm:true,confirmShared:sharedConfirm.checked});
      dialog.close();const card=list.querySelector(`[data-reference="${id}"]`);
      if(result.state==='cancelled'){status.textContent='Meeting cancelled. Microsoft accepted the cancellation and notification reason.';if(card){card.querySelector('.consultation-state').textContent='Cancelled';card.querySelector('.consultation-state').className='consultation-state state-cancelled';}if(card)await loadMeeting(card);try{const counts=await fetch('/api/consultations?filter=upcoming',{credentials:'same-origin',cache:'no-store'});if(counts.ok){const data=await counts.json();document.getElementById('dash-consultations').textContent=data.upcoming;document.getElementById('consultationsCount').textContent=data.upcoming;}}catch{}}
      else{status.textContent=result.message||'Cancellation is unconfirmed. Check Microsoft Bookings before trying again.';if(card)await loadMeeting(card);}
    }catch(error){cancelError.textContent=['TimeoutError','AbortError','TypeError'].includes(error.name)?'We could not confirm the cancellation. Close this dialog and refresh meeting details before trying again.':error.message;submitCancel.textContent='Cancel meeting and notify';}
    finally{cancelling=false;submitCancel.disabled=false;keepMeeting.disabled=false;reason.disabled=false;sharedConfirm.disabled=false;}
  });
  async function refresh(append = false) {
    controller?.abort(); controller = new AbortController(); const current = ++generation;
    list.setAttribute('aria-busy', 'true'); more.disabled = true;
    status.textContent = 'Loading consultation requests…';
    const params = new URLSearchParams({filter:filter.value, search:search.value, offset:String(append ? nextOffset || 0 : 0)});
    try {
      const response = await fetch('/api/consultations?' + params, {credentials:'same-origin', cache:'no-store', signal:controller.signal});
      if (!response.ok) throw Error(response.status === 401 ? 'Your session has expired. Sign in again to view consultations.' : 'Unable to load consultations. Please refresh.');
      const data = await response.json(); if (current !== generation) return;
      if (!data.available) throw Error('Consultation storage is not configured for this preview.');
      if (!append) {list.innerHTML = '';meetingViews.clear();}
      list.insertAdjacentHTML('beforeend', data.items.map(card).join(''));
      if (!list.children.length) list.innerHTML = '<div class="consultation-empty">No consultation requests match this view. New website bookings will appear here.</div>';
      document.getElementById('dash-consultations').textContent = data.upcoming;
      document.getElementById('consultationsCount').textContent = data.upcoming;
      nextOffset = data.nextOffset; more.hidden = nextOffset === null;
      status.textContent = `${data.total} request${data.total === 1 ? '' : 's'} in this view.`;
    } catch (error) {
      if (current !== generation || error.name === 'AbortError') return;
      status.textContent = error.message; if (!append) list.replaceChildren(); more.hidden = true;
    } finally { if (current === generation) { list.setAttribute('aria-busy', 'false'); more.disabled = false; } }
  }
  document.getElementById('refreshConsultations').addEventListener('click', () => refresh());
  filter.addEventListener('change', () => refresh());
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => refresh(), 300); });
  more.addEventListener('click', () => refresh(true));
  window.TTTConsultations = {refresh};
})();
