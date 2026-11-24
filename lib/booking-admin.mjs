import {initStore} from './booking-store.mjs';
import {sendWhatsApp} from './callmebot.mjs';

export async function saveBookingContact(db, id, input, service, context, now, requested = {}) {
  const details = {name: input.name, email: input.email, phone: input.phone, company: input.company,
    notes: input.notes, answers: input.answers.map(a => ({question: a.question, answer: a.answer || a.selectedOptions.join(', ')})),
    service, context, consentAt: new Date(now).toISOString(), requested};
  await db.prepare("INSERT OR IGNORE INTO booking_contacts (id,details,notification) VALUES (?,?,'pending')").bind(id, JSON.stringify(details)).run();
}

export async function notifyConfirmedBooking(db, id, env, options = {}) {
  // A database claim prevents repeated status checks and concurrent requests from sending twice.
  // Failed/ambiguous deliveries are recorded for the admin, never automatically retried.
  try {
    const row = await db.prepare("SELECT a.state,a.result,c.details,c.notification FROM booking_attempts a JOIN booking_contacts c ON c.id=a.id WHERE a.id=?").bind(id).first();
    if (!row || row.state !== 'confirmed' || !['pending', 'not_configured'].includes(row.notification)) return;
    if (!env.CALLMEBOT_PHONE || !env.CALLMEBOT_APIKEY) {
      await db.prepare("UPDATE booking_contacts SET notification='not_configured' WHERE id=? AND notification='pending'").bind(id).run();
      return;
    }
    const claim = await db.prepare("UPDATE booking_contacts SET notification='sending' WHERE id=? AND notification IN ('pending','not_configured')").bind(id).run();
    if (claim.meta.changes !== 1) return;
    const contact = JSON.parse(row.details), result = JSON.parse(row.result);
    const when = new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Dubai', dateStyle: 'full', timeStyle: 'short'}).format(new Date(result.start));
    const text = ['New Talk The Taste consultation booked', `${contact.service || 'Free Marketing Consultation'}`,
      `When: ${when} (Dubai, UAE · UTC+4)`, `Name: ${contact.name}`, `Email: ${contact.email}`, `Phone: ${contact.phone}`,
      contact.company && `Company: ${contact.company}`, contact.context && `Interest: ${contact.context}`,
      ...contact.answers.filter(a => a.answer).map(a => `${a.question}: ${a.answer}`),
      contact.notes && `Notes: ${contact.notes.slice(0, 500)}`, `Reference: ${id}`].filter(Boolean).join('\n');
    const sent = await sendWhatsApp(env, text, options);
    await db.prepare('UPDATE booking_contacts SET notification=? WHERE id=?').bind(sent.ok ? 'queued' : 'unconfirmed', id).run();
  } catch { console.error('booking_notification_unavailable'); }
}

export async function listConsultations(db, url, now = Date.now()) {
  if (!db) return {available: false, items: [], total: 0, nextOffset: null};
  await initStore(db);
  const filter = url.searchParams.get('filter') || 'upcoming';
  const offset = Math.max(0, Math.min(100000, Math.floor(Number(url.searchParams.get('offset')) || 0)));
  const search = String(url.searchParams.get('search') || '').trim().slice(0, 160);
  let where = '1=1';
  const args = [];
  if (filter === 'upcoming') { where = "a.state='confirmed' AND COALESCE(json_extract(a.result,'$.end'),json_extract(a.result,'$.start')) >= ?"; args.push(new Date(now).toISOString()); }
  if (filter === 'attention') where = "a.state IN ('pending','uncertain')";
  if (search) { where += " AND (instr(lower(COALESCE(c.details,'')),lower(?))>0 OR instr(lower(a.id),lower(?))>0)"; args.push(search, search); }
  const total = await db.prepare(`SELECT count(*) AS total FROM booking_attempts a LEFT JOIN booking_contacts c ON c.id=a.id WHERE ${where}`).bind(...args).first();
  const upcoming = await db.prepare("SELECT count(*) AS total FROM booking_attempts WHERE state='confirmed' AND COALESCE(json_extract(result,'$.end'),json_extract(result,'$.start')) >= ?").bind(new Date(now).toISOString()).first();
  const rows = await db.prepare(`SELECT a.id,a.state,a.result,a.created,c.details,c.notification FROM booking_attempts a LEFT JOIN booking_contacts c ON c.id=a.id WHERE ${where} ORDER BY a.created DESC,a.id LIMIT 51 OFFSET ?`).bind(...args, offset).all();
  const items = rows.results.slice(0, 50).map(row => {
    const result = JSON.parse(row.result || '{}'), contact = JSON.parse(row.details || '{}');
    return {reference: row.id, state: row.state, createdAt: new Date(row.created).toISOString(),
      start: result.start || contact.requested?.start || null, end: result.end || contact.requested?.end || null, timeZone: result.timeZone || contact.requested?.timeZone || 'Asia/Dubai',
      contact, notification: row.notification || 'legacy'};
  });
  return {available: true, items, total: total.total, upcoming: upcoming.total, nextOffset: rows.results.length > 50 ? offset + 50 : null};
}
