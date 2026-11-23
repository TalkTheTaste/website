# Contact and consultation

`npm run build:contact` renders `contact.html` and `book-consultation.html` from the existing About shell. It runs in the normal production build. Edit `scripts/render-contact.cjs`, `scripts/contact-forms.cjs`, `css/contact.css`, `js/contact.js` and `js/consultation.js` rather than generated HTML.

Contact makes a free 30-minute consultation the primary action. Existing project enquiries, free growth audits, phone normalization, explicit contact consent, server lead submission and optional email notifications remain supported. Errors stay on the page and allow retry; success appears only after the server accepts the lead. Automated submissions use intercepted test responses and never send actual enquiries.

The new `/book-consultation` page uses the supplied headline and subheading, the existing brand share image, its own canonical URL, structured data, a sitemap entry and an accessible Microsoft Bookings iframe. The `Schedule online` link always opens the same public calendar directly as a fallback. Meeting availability, time zones, custom questions and confirmation are managed in Microsoft Bookings; the website does not invent slots or intercept bookings.

Public calendar: https://bookings.cloud.microsoft/book/BookaMeetingwithUs@talkthetaste.com/?ismsaljsauthenabled

Microsoft's iframe response requires HTTPS ancestors (`frame-ancestors https:`). Use an HTTPS preview to test the real embed; ordinary HTTP localhost is blocked by Microsoft. The production site already uses HTTPS. Do not commit local preview certificates or disable the provider's security policy.

Pricing consultation buttons and copied Social Essentials details link to the new page. Package/service query parameters are displayed as plain text reminders and preserved in the contact link. They are not assumed to prefill Microsoft's custom fields. Other package enquiry buttons retain the contact-form route.

Validated 23 November 2026: production build, Cloudflare Functions bundle and existing Node checks; six browser tests in Chrome and WebKit for consultation routing, package context, consent/phone validation, failed submission/retry, audits, script-free fallback, accessible layouts, responsive widths and mobile menus. Real Microsoft calendars were checked separately through HTTPS in both engines without submitting an appointment. Local AJAX page lifecycle remains compatible and is excluded from the production release.
