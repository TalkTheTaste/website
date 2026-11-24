# Custom consultation booking

`npm run build:contact` renders Contact and `/book-consultation`. The booking page uses our own calendar, time-zone picker and form. It contains no Microsoft iframe. Microsoft Graph v1.0 supplies service details, custom questions, availability and appointment creation. The public Microsoft scheduling link remains a secondary fallback.

## Microsoft administrator setup

The application needs Microsoft Graph **application permissions** `Bookings.Read.All` and `BookingsAppointment.ReadWrite.All`, with tenant administrator consent. OneDrive permissions alone do not enable Bookings. In Microsoft Entra admin center: App registrations → the website's application → API permissions → Add a permission → Microsoft Graph → Application permissions. Add both permissions and select Grant admin consent.

The backend reuses Cloudflare's existing `MS_TENANT_ID`, `MS_CLIENT_ID` and `MS_CLIENT_SECRET`. For a separate app, set server secrets `BOOKINGS_TENANT_ID`, `BOOKINGS_CLIENT_ID` and `BOOKINGS_CLIENT_SECRET`. Never put secrets in browser code, Git or chat.

Defaults: business `BookaMeetingwithUs@talkthetaste.com`, service name `Free Marketing Consultation`, business time zone `Asia/Riyadh` (verified against the Microsoft calendar’s Arab Standard Time setting). Verify the time zone against the business's working hours in Microsoft. `BOOKING_SERVICE_ID` can pin the consultation's GUID. Only a published, visible, free 30-minute service with assigned staff is supported. The configured capacity is preserved, including the current two-customer service. Multi-customer appointments find or create a Microsoft customer record, include its valid customer ID, and verify that the customer was actually attached. Joining an existing appointment preserves all existing customer details and rechecks remaining capacity before updating it. Unknown configurations or time zones fail closed. Common Windows and IANA staff time zones are supported. A blank staff time zone inherits the business time zone, matching Microsoft’s calendar behavior.

The existing `SESSION_SECRET` signs short-lived selected times; `BOOKING_SIGNING_SECRET` may provide a separate 32+ character key. Cloudflare D1 binding `BOOKING_DB` stores request fingerprints, opaque references, confirmation state/timestamps, locks and rate limits. The private `booking_contacts` table now stores consented submitted contact details, answers, requested time and alert state for the requested admin consultation history. These are never included in public booking responses or public data assets. Node previews use private SQLite files under `DATA_DIR` and require Node 22.13+.

## Endpoints and safeguards

- `GET /api/booking/config`: public service details and assigned custom questions.
- `GET /api/booking/availability?date=YYYY-MM-DD&timeZone=Asia/Dubai`: signed selections calculated using business/staff hours, availability overrides, lead times, intervals, buffers and busy periods.
- `POST /api/booking/appointments`: validates contact permission and required answers, serializes creation with a database lock, rechecks availability and creates the appointment with the service settings/reminders. It records the website reference and consent time in Microsoft's private booking notes.
- `GET /api/booking/status?id=UUID`: minimal confirmation state without customer contact details.

Repeated request references cannot create twice. If Microsoft's response is lost, the website keeps an uncertain state across reloads and directs the visitor to contact the team rather than assuming success or automatically creating again. External Microsoft booking channels can still change availability between the final check and creation; our database cannot lock those external channels.

Requests have same-origin checks, size limits, signed selections, a spam field and database rate limits. A failed API connection disables confirmation and offers contact/direct scheduling. Package context is included in booking notes and preserved in contact links. Existing project enquiries and audits continue to work.

## Validation

Backend tests cover scheduling policy/buffers, occupied/tampered/expired times, consent/custom answers, replay protection, uncertain outcomes, concurrent requests, origin checks, DST and Microsoft's documented response shape. Twelve browser tests in Chrome and WebKit cover native booking, conflicts, pending reloads, time-zone changes, keyboard dates, six responsive widths, accessibility, contact forms and failure fallbacks. Tests use mocked/intercepted Microsoft responses and never create a real appointment or send a notification.

Official contracts: [creation](https://learn.microsoft.com/en-us/graph/api/bookingbusiness-post-appointments), [availability](https://learn.microsoft.com/en-us/graph/api/bookingbusiness-getstaffavailability), [business rules](https://learn.microsoft.com/en-us/graph/bookingsbusiness-business-rules).

The visitor calendar defaults to `Asia/Dubai` (Dubai, UAE); staff hours continue to use the Microsoft business calendar's configured Riyadh zone. Country selectors include the six GCC states and Other. Other accepts a separate 1–4 digit international dial prefix; phone numbers are validated and canonicalized with libphonenumber numbering metadata, including countries that retain a leading zero.

Appointment attempts persist intended time, service, customer ID and appointment ID as available; submitted contact details are stored separately in `booking_contacts` for the admin. Uncertain submissions never automatically repeat an appointment write. A status check may reconcile an existing Microsoft appointment by customer ID and exact service/time, or the original private booking reference for older attempts. Group responses are read back if the create response does not yet contain the customer. The terminal state has a read-only “Check confirmation” action. Private diagnostics include stage/status/code and counts only, never customer details or tokens.

## Admin consultations and internal WhatsApp alerts

`GET /api/consultations` requires the existing administrator session on both Node and Cloudflare. It supports `filter=upcoming|all|attention`, text search and paged results (50 per page). Dates are displayed in Dubai. Older attempts are listed without fabricated contact information. Status is the website's last known confirmation state; this is not a live Microsoft calendar sync and does not import appointments created outside the website.

Confirmed appointments send an internal notification to the existing `CALLMEBOT_PHONE`, using `CALLMEBOT_APIKEY`, through the shared CallMeBot sender used by contact forms. The message includes the submitted contact details, answers, Dubai time and website reference. It is never sent to the visitor. Cloudflare uses `waitUntil` so the provider does not delay booking confirmation. A database claim prevents concurrent sends. Recovered confirmations follow the same path. Pending, uncertain, rejected and cancelled attempts do not send a booked alert. Failures never change a confirmed booking. Provider acceptance is labelled queued, not delivered; ambiguous failures are not retried automatically to avoid duplicate messages. Missing configuration is visible in the private admin record.

No notification tests send a real WhatsApp message. All provider and Microsoft writes are mocked. Anonymous visitor analytics remain separate from submitted contacts; no identity enrichment or contact extraction is implemented.

Public build preparation replaces decorative Unicode arrow text nodes with inline SVGs, including the saved page shells. Shared CSS provides consistent native select controls with SVG chevrons, focus styling, touch targets and RTL support.

Appointment writes use `startDateTime` and `endDateTime`, each typed as `#microsoft.graph.dateTimeTimeZone`. These names come from the live v1.0 Graph `$metadata` (captured in `tests/fixtures/booking-appointment-schema.json`), despite the reference documentation still showing `start` and `end`. Reads accept both shapes for compatibility. Do not substitute the website's public `start`/`end` response fields directly into the Microsoft request.

A status check can reject a stale ambiguous attempt only after a successful calendar read finds zero entries across the exact stored appointment window, at least five minutes after the attempt and with no known appointment ID. It never retries the external appointment write. Rejected attempts restore time selection; existing form details are retained when checking without reloading. Failure stage, Microsoft status/code/request ID are persisted privately with the recovery metadata.

Microsoft can return an appointment customer ID that differs from its directory customer ID. Creation therefore verifies either the expected ID or the submitted attendee's nonempty, case-insensitive email. Recovery checks exact service/time and uses the directory customer's email when the returned ID differs; unrelated attendees and empty groups remain unconfirmed. No recovery operation creates an appointment.

The submit interaction has separate form, loading, confirmed and pending-confirmation views on the same URL. Loading uses an inline SVG animation with reduced-motion support. Uncertain responses get bounded, read-only status checks before showing recovery; they never trigger another write. The phone country selector sits beside the number, including at 320px; Other reveals the separate dial prefix within the number row.

Cancellation recovery: when an appointment ID no longer resolves, search calendarView and then the complete bounded appointment collection before giving up on the ID. A known, previously created appointment becomes cancelled only if its ID is 404, both successful collection reads are empty, and at least five minutes have passed. API errors and recent propagation delays stay pending. Cancelled attempts restore the form with a clear notice and never recreate themselves. This handles bookings cancelled outside the website without leaving the visitor stuck on confirmation pending.
