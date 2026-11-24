(() => {
  'use strict';
  const list = document.getElementById('consultationList');
  const status = document.getElementById('consultationStatus');
  const filter = document.getElementById('consultationFilter');
  const search = document.getElementById('consultationSearch');
  const more = document.getElementById('moreConsultations');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const states = {confirmed:'Confirmed at booking', pending:'Confirmation pending', uncertain:'Needs checking', cancelled:'Cancelled', rejected:'Not booked'};
  const notifications = {queued:'Queued by CallMeBot', pending:'Waiting for confirmation', sending:'Delivery checking', unconfirmed:'Delivery unconfirmed', not_configured:'CallMeBot not configured', legacy:'Not recorded for older requests'};
  const date = value => value ? new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Dubai', dateStyle:'medium', timeStyle:'short'}).format(new Date(value)) : 'Time not recorded';
  let controller, generation = 0, nextOffset = null, timer;
  function card(item) {
    const c = item.contact;
    const contact = [c.email && `<a href="mailto:${escape(encodeURIComponent(c.email))}">${escape(c.email)}</a>`, c.phone && `<a href="tel:${escape(encodeURIComponent(c.phone))}">${escape(c.phone)}</a>`].filter(Boolean).join('');
    return `<details class="consultation-card"><summary><span><strong>${escape(c.name || 'Older website request')}</strong><span>${escape(c.company || c.service || 'Free Marketing Consultation')}</span></span><span class="consultation-when">${escape(date(item.start))}<small>Dubai, UAE</small></span><span class="consultation-state state-${escape(item.state)}">${escape(states[item.state] || item.state)}</span></summary><div class="consultation-details"><div class="consultation-contact">${contact || '<span>Contact details were not stored for this older request.</span>'}</div><dl><div><dt>Reference</dt><dd>${escape(item.reference)}</dd></div><div><dt>WhatsApp alert</dt><dd>${escape(notifications[item.notification] || 'Not recorded')}</dd></div><div><dt>Submitted</dt><dd>${escape(date(item.createdAt))} · Dubai</dd></div>${c.context ? `<div><dt>Interest</dt><dd>${escape(c.context)}</dd></div>` : ''}${(c.answers || []).filter(a => a.answer).map(a => `<div><dt>${escape(a.question)}</dt><dd>${escape(a.answer)}</dd></div>`).join('')}${c.notes ? `<div><dt>Message</dt><dd>${escape(c.notes)}</dd></div>` : ''}</dl></div></details>`;
  }
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
      if (!append) list.innerHTML = '';
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
