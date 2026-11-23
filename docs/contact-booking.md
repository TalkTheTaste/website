# Custom consultation booking

`npm run build:contact` renders Contact and `/book-consultation`. The booking page uses our own calendar, time-zone picker and form. It contains no Microsoft iframe. Microsoft Graph v1.0 supplies service details, custom questions, availability and appointment creation. The public Microsoft scheduling link remains a secondary fallback.

## Microsoft administrator setup

The application needs Microsoft Graph **application permissions** `Bookings.Read.All` and `BookingsAppointment.ReadWrite.All`, with tenant administrator consent. OneDrive permissions alone do not enable Bookings. In Microsoft Entra admin center: App registrations → the website's application → API permissions → Add a permission → Microsoft Graph → Application permissions. Add both permissions and select Grant admin consent.

The backend reuses Cloudflare's existing `MS_TENANT_ID`, `MS_CLIENT_ID` and `MS_CLIENT_SECRET`. For a separate app, set server secrets `BOOKINGS_TENANT_ID`, `BOOKINGS_CLIENT_ID` and `BOOKINGS_CLIENT_SECRET`. Never put secrets in browser code, Git or chat.

Defaults: business `BookaMeetingwithUs@talkthetaste.com`, service name `Free Marketing Consultation`, business time zone `Asia/Riyadh` (verified against the Microsoft calendar’s Arab Standard Time setting). Verify the time zone against the business's working hours in Microsoft. `BOOKING_SERVICE_ID` can pin the consultation's GUID. Only a published, visible, free 30-minute service with assigned staff is supported. The configured capacity is preserved, including the current two-customer service. Multi-customer appointments find or create a Microsoft customer record, include its valid customer ID, and verify that the customer was actually attached. Joining an existing appointment preserves all existing customer details and rechecks remaining capacity before updating it. Unknown configurations or time zones fail closed. Common Windows and IANA staff time zones are supported. A blank staff time zone inherits the business time zone, matching Microsoft’s calendar behavior.

The existing `SESSION_SECRET` signs short-lived selected times; `BOOKING_SIGNING_SECRET` may provide a separate 32+ character key. Cloudflare D1 binding `BOOKING_DB` stores request fingerprints, opaque references, confirmation state/timestamps, locks and rate limits. Plaintext customer contact details and answers go to Microsoft rather than this database. Node previews use private SQLite files under `DATA_DIR` and require Node 22.13+.

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
