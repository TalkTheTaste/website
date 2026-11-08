# Website audit — 7 November 2026
Remediation was implemented on 8 November 2026. See the [fixes and verification report](../website-fixes-2026-11-08/report.md) for current status and deployment requirements. The findings below preserve the original audit.

33 findings: 3 critical, 10 high, 17 medium, 3 low. Severity is an audit prioritization; dependency severities come from the registry. Configuration-dependent risks are marked individually.

The highest priorities are public data/credential exposure, stored XSS, the broken return to Home, and the fixed-position layout bug that makes mobile menus blank. Findings were established against isolated copies of this repository, not the live production deployment.

## Coverage and limits

- 29 main routes × 11 screen sizes = **319 Chrome browser page/viewport checks**. Each page was loaded, scrolled, checked for runtime errors, broken loaded images, HTTP failures and overflow; shared mobile menus were exercised where present.
- Screen sizes: 320×568, 360×800, 390×844, 430×932, 844×390, 768×1024, 1024×768, 1366×768, 1920×1080, 2560×1440 and 3840×2160. These represent narrow/large phones, landscape phones, tablets, laptops, PCs, ultrawide displays and 4K TV-sized layouts.
- Chrome **156.0.8078.80**, driven through Playwright, with touch/mobile emulation at representative widths. Browser viewport emulation does not reproduce every physical-device behavior.
- **58 follow-up accessibility scans**: all 29 routes at 390 and 1920 pixels, with reduced motion and a settling delay to avoid counting transient reveal-animation colors. There were **259 failing element instances** across these scans; repeated instances are grouped into findings below. The earlier matrix scans are preliminary; use accessibility.json for the settled results.
- Supplementary browser tests covered a rendered article, 404 page, admin login, actual contact/audit submission, quote prefilling, Arabic switching, repeated navigation, portfolio client views and keyboard behavior.
- Node preview: http://localhost:3199. Cloudflare Pages preview: http://localhost:8799. The Pages runtime was run locally with compatibility date 2025-08-07 supported by the installed tooling; the repository config declares 2026-08-07. Deployment-only differences remain possible.
- 51 unique same-origin link destinations were checked from the static page crawl, then dynamic portfolio/article URLs were tested separately. Their results are not combined into a misleading all-links-pass claim.
- Production build passed; regenerated minified files matched the originals. npm audit completed and reported eight affected packages.
- Existing data/analytics.json changes were preserved. All test leads, login sessions and security markers were created only in /tmp/ttt-website-audit/site or its local KV storage. Google Analytics requests were blocked in the automated browser contexts. External WhatsApp, form, payment and notification delivery were not exercised.
- No production credentials, production admin sessions, Microsoft/OneDrive integration or external edge security settings were tested.
- Safari/WebKit, Firefox, physical iOS/Android devices, Windows, actual TV browsers/remotes, screen-reader output, browser zoom, offline behavior and a full load test remain **unverified**. Additional browser installation was attempted but did not finish; no cross-engine pass is claimed. This is a detailed sampled audit, not a guarantee that every possible device or error is covered.

## Findings

### 01. Private data and server source are publicly downloadable

**Critical · Reproduced**

Affected: All devices; Node and Cloudflare previews.

Unauthenticated GET /data/settings.json, /data/leads.json, /data/analytics.json and /server.js returns 200. Settings include an admin-password field. Both local admin logins succeeded using the password obtained from the public file. Cloudflare KV data is separate from these static JSON files, but the checked-in data is still exposed. A configured production ADMIN_PASSWORD may differ.

Suggested fix: Publish only public assets; move credentials/data outside the public directory and exclude server/config files from the Pages output. Rotate any exposed credentials.

Source: [server.js:67](../../server.js#L67), [DEPLOY.md:25](../../DEPLOY.md#L25). Evidence: endpoints.json, security.json.

### 02. Node settings API discloses the admin password

**Critical · Reproduced**

Affected: All devices; Node server.

GET /api/settings without a session returns adminPass. Authenticated endpoints returning 401 do not protect this separate endpoint. The Cloudflare API strips the field correctly, but its static settings file remains exposed under finding 1.

Suggested fix: Return an explicit allowlist of public settings; never return the password.

Source: [server.js:114](../../server.js#L114). Evidence: endpoints.json.

### 03. Stored cross-site scripting in the admin lead table

**Critical · Reproduced**

Affected: All devices; both backends.

A public lead submission with harmless HTML in fname was accepted. On local admin login, an image onerror handler set window.__auditXssExecuted=true. Both backends reproduced execution. No information was sent outside the local preview. Several lead fields are interpolated into innerHTML without escaping.

Suggested fix: Render lead values as text, escape all interpolated fields, and validate input on the server.

Source: [admin.html:1768](../../admin.html#L1768). Evidence: security.json.

### 04. Returning to Home can leave the site completely covered

**High · Reproduced**

Affected: All devices; shared page navigation.

Open Home, click About, then Home. The browser throws Identifier statObs has already been declared. The homepage script stops before dismissing #preloader; the screen remains dark and the overlay accepts pointer events.

Suggested fix: Scope page scripts, clean up previous page state, and make overlay cleanup run even when a page script fails.

Source: [index.html:2546](../../index.html#L2546), [js/transitions.js:88](../../js/transitions.js#L88). Evidence: repro.json; screenshots/home-return-error.png.

### 05. Fixed menus, navigation and floating actions use the full document as their viewport

**High · Reproduced**

Affected: Phones, tablets, desktop and TV layouts.

body.ttt-page-in retains transform: matrix(1,0,0,1,0,0) after its animation because of fill-mode both. Fixed descendants then use the body as their containing block. On a 390×844 homepage, opening the menu shows a blank screen with its links far below the viewport. After scrolling 1000 pixels, nav.top was -1000 and the floating WhatsApp button was around y=9044. The same animation remains active with reduced-motion enabled.

Suggested fix: Remove the retained body transform or animate an inner content wrapper that does not contain fixed UI. Retest menus, overlays and floating buttons after scrolling.

Source: [css/main.css:506](../../css/main.css#L506), [css/main.css:923](../../css/main.css#L923). Evidence: menu.json, layout.json; screenshots/home-menu-broken.png.

### 06. Portfolio links fail when opened directly or refreshed in fallback mode

**High · Reproduced; configuration dependent**

Affected: All devices; Cloudflare without OneDrive configuration.

The Work page renders three fallback projects and opens them in its client view, updating the URL. Opening those same /work/<slug>/ URLs directly returns 404. The route requires OneDrive credentials even when the listing uses local projects.

Suggested fix: Render fallback projects through the detail route, or use URLs that the server supports in fallback mode.

Source: [functions/work/[slug].js:12](../../functions/work/[slug].js#L12), [assets/pages/portfolio-source.txt:365](../../assets/pages/portfolio-source.txt#L365). Evidence: dynamic.json, extra.json, flows.json.

### 07. Node server does not implement published article or portfolio detail routes

**High · Reproduced**

Affected: All devices; npm start / npm run dev.

The four article URLs from /api/posts return 404 and the homepage body. Portfolio detail paths also return 404. Cloudflare article routes return 200, so local Node behavior differs substantially from the documented deployment.

Suggested fix: Implement equivalent detail routes or standardize local development on the Cloudflare runtime.

Source: [server.js:348](../../server.js#L348). Evidence: dynamic.json.

### 08. Arabic pages lose their language and right-to-left direction

**High · Reproduced**

Affected: All devices; all six /ar/ pages.

In a fresh browser context, every Arabic page finishes with html lang=en and dir=ltr. The language switcher uses the saved preference or English instead of the page language, always sets direction to ltr, and rewrites Arabic navigation URLs to English routes. An Arabic toggle also leaves dir=ltr.

Suggested fix: Derive the initial language from the page/URL, set dir=rtl for Arabic, and preserve Arabic navigation destinations.

Source: [js/language-switcher.js:656](../../js/language-switcher.js#L656), [js/language-switcher.js:681](../../js/language-switcher.js#L681). Evidence: matrix.json, flows.json.

### 09. Arabic toggle leaves major English content untranslated

**Medium · Reproduced**

Affected: All devices; translated English templates.

Switch the homepage to Arabic. The heading into inquiry., introductory paragraph, case-study copy and several FAQ answers remain English while other sections translate. Controls inside select elements are also excluded from translation.

Suggested fix: Use complete translations for whole pages, including headings, paragraphs and select options.

Source: [js/language-switcher.js:5](../../js/language-switcher.js#L5), [js/language-switcher.js:642](../../js/language-switcher.js#L642). Evidence: flows.json.

### 10. Contact form stores malformed UAE phone numbers

**High · Reproduced**

Affected: All devices; contact form.

Select UAE +971 and enter a normal local number 0501234567. The submission succeeds and stores +9710501234567 instead of +971501234567. A pasted international number can also receive the selected country code a second time.

Suggested fix: Parse and validate national/international phone numbers before storing them; strip the appropriate national trunk prefix.

Source: [contact.html:716](../../contact.html#L716). Evidence: flows.json.

### 11. Pricing quote links do not scroll to the target form

**Medium · Reproduced**

Affected: All devices; soft navigation.

Click the first Get Quote button on Pricing. The contact URL includes #free-audit and the package message is prefilled, but scrollY stays 0 and the target is about 1880 pixels below the top in the tested phone viewport. The router unconditionally scrolls to the page top.

Suggested fix: After rendering the destination, resolve its URL hash and scroll to the target with a suitable header offset.

Source: [js/transitions.js:151](../../js/transitions.js#L151). Evidence: flows.json.

### 12. Server-rendered blog articles throw a JavaScript exception

**Medium · Reproduced**

Affected: All devices; Cloudflare article page.

Open /blog/how-to-market-a-restaurant-in-dubai/. The browser throws Cannot set properties of null (setting textContent). Server rendering replaces <title id=pageTitle> with a title without that ID; the client then writes to #pageTitle. The initial article HTML remains available, but the rest of that render function stops.

Suggested fix: Preserve the title ID or update document.title only; verify the remaining article behavior executes.

Source: [functions/blog/[slug].js:227](../../functions/blog/[slug].js#L227), [post-template.asset:496](../../post-template.asset#L496). Evidence: extra.json.

### 13. Text and CTA contrast fails across the site

**High · Reproduced**

Affected: All screen sizes; all 29 main routes.

The follow-up scans found contrast violations on every tested main route. White text on #e3d134 yellow measures about 1.56:1 against an expected 4.5:1 for this text size. Affected elements include nav CTAs, primary buttons, contact submit buttons, labels and testimonial footers. Supplementary article, 404 and admin-login scans also found contrast issues.

Suggested fix: Use sufficiently dark text on yellow or darken backgrounds; retest each text/background combination.

Source: [css/main.css:24](../../css/main.css#L24), [css/main.css:189](../../css/main.css#L189). Evidence: accessibility.json, extra.json.

### 14. Country-code selector has no accessible name

**Medium · Reproduced**

Affected: All devices; screen readers on /contact.

The #countryCode select has no associated label, aria-label or aria-labelledby. The visible Phone / WhatsApp label is attached to the phone input only.

Suggested fix: Give the country-code selector a distinct accessible label.

Source: [contact.html:427](../../contact.html#L427). Evidence: accessibility.json.

### 15. Legal-page mobile menus do not manage keyboard focus or close on Escape

**Medium · Reproduced**

Affected: Phones, tablets and keyboard users.

On /privacy-policy and /terms-and-conditions, opening the menu leaves focus on the hamburger. Escape leaves aria-expanded=true and the menu open. These pages use separate minimal menu handlers instead of the shared focus/keyboard implementation.

Suggested fix: Use the shared menu logic, move focus into the menu, trap it while open and restore it on close.

Source: [privacy-policy.html:508](../../privacy-policy.html#L508), [terms-and-conditions.html:601](../../terms-and-conditions.html#L601). Evidence: matrix.json, repro.json.

### 16. Portfolio client view lacks dialog semantics and focus management

**Medium · Reproduced**

Affected: All devices; keyboard and screen-reader users.

Open a project. #clientView is visually open, has no dialog role, and keyboard focus stays outside on the card behind it. Background navigation remains reachable.

Suggested fix: Use a dialog with an accessible name; move and contain focus and restore it when closing.

Source: [assets/pages/portfolio-source.txt:404](../../assets/pages/portfolio-source.txt#L404). Evidence: repro.json.

### 17. Privacy-policy contact links have undersized, crowded touch targets

**Medium · Reproduced**

Affected: Phone layout; /privacy-policy.

The email and telephone targets are about 125×16 and 109×16 pixels, and their surrounding spacing does not provide the required 24-pixel target area. These were actual axe target-size failures; other small inline links were not automatically counted as failures.

Suggested fix: Increase hit areas and spacing around these contact links.

Source: [privacy-policy.html:475](../../privacy-policy.html#L475). Evidence: accessibility.json.

### 18. Custom-software FAQ heading overflows at 320 pixels

**Medium · Reproduced**

Affected: Small phones and narrow reflow layouts.

At 320 pixels, the page scroll width is roughly 328–332 pixels. The FAQ heading containing commissioning overflows its 272-pixel text area. overflow-x:hidden can hide the excess instead of fixing the text layout.

Suggested fix: Allow long words to wrap or reduce heading size at narrow widths; verify at 320 pixels.

Source: [custom-software-development-dubai.html:273](../../custom-software-development-dubai.html#L273). Evidence: matrix.json, repro.json.

### 19. Social-media hero overflows at 320 pixels

**Medium · Reproduced**

Affected: Small phones and narrow reflow layouts.

At 320 pixels, /social-media-marketing-dubai has a 327-pixel scroll width. The landing hero contributes to the overflow. The other tested widths did not show document-width overflow.

Suggested fix: Adjust the narrow hero typography/layout and verify that both content and scroll width fit.

Source: [social-media-marketing-dubai.html:252](../../social-media-marketing-dubai.html#L252). Evidence: matrix.json, repro.json.

### 20. Node lead endpoint accepts completely empty submissions

**Medium · Reproduced**

Affected: All devices; Node backend.

POST /api/leads/submit with {} returns 200 and creates an empty lead. The Cloudflare implementation correctly rejects the same request with 400, so frontend validation is the only Node protection.

Suggested fix: Validate required lead fields and phone/email formats on the Node server.

Source: [server.js:180](../../server.js#L180). Evidence: endpoints.json.

### 21. Backend accepts leads without the contact consent required by the UI

**Medium · Reproduced**

Affected: All devices; both backends.

A syntactically valid lead with contactConsent=false is accepted with 200 by both backends. Cloudflare validateLead checks five other fields but omits consent. This is a discrepancy between the required checkbox and server behavior; no legal-compliance conclusion is implied.

Suggested fix: Validate the required consent value and record a server-generated consent timestamp.

Source: [functions/api/[[path]].js:650](../../functions/api/[[path]].js#L650), [server.js:180](../../server.js#L180). Evidence: security.json.

### 22. Free-audit form accepts unusable website/Instagram values

**Medium · Reproduced**

Affected: All devices; /contact.

Entering x as Website / Instagram with otherwise valid fields is accepted and displays success. The code only checks for a non-empty string.

Suggested fix: Validate supported website URLs or Instagram handles and show a field-specific error.

Source: [contact.html:674](../../contact.html#L674). Evidence: flows.json.

### 23. Some dynamic 404 responses have empty bodies

**Medium · Reproduced in local Pages preview**

Affected: All devices; Cloudflare dynamic routes.

GET /blog/not-a-real-post and /work/not-a-real-client return 404 with zero response-body bytes. An unknown ordinary page returns the actual 404 template. The missing portfolio detail routes also produced Chrome HTTP response failures. Production behavior needs separate verification.

Suggested fix: Ensure dynamic error paths return a readable 404 document from the asset binding; verify in Pages preview and deployment.

Source: [functions/blog/[slug].js:57](../../functions/blog/[slug].js#L57), [functions/work/[slug].js:39](../../functions/work/[slug].js#L39). Evidence: endpoints.json, extra.json.

### 24. Node 404 responses display the homepage

**Low · Reproduced**

Affected: All devices; Node backend.

GET /not-a-real-page-audit returns HTTP 404 with the homepage title and markup, rather than the existing Page Not Found template.

Suggested fix: Serve 404.html for unknown routes.

Source: [server.js:356](../../server.js#L356). Evidence: endpoints.json.

### 25. Node favicon endpoint is missing

**Low · Reproduced**

Affected: Browsers using /favicon.ico; Node backend.

GET /favicon.ico returns 404 and homepage HTML. The Cloudflare redirect correctly returns the PNG with 200.

Suggested fix: Add the favicon route or asset to the Node server.

Source: [server.js:348](../../server.js#L348), [_redirects:2](../../_redirects#L2). Evidence: endpoints.json.

### 26. Work-page contact number differs from the rest of the site

**Low · Reproduced**

Affected: All devices; /work.

The Work footer displays and links +971 52 997 2969, while the principal site and WhatsApp actions use +971 56 539 0316. Which number is authoritative needs owner confirmation.

Suggested fix: Use the approved contact number consistently or label different contact purposes.

Source: [assets/pages/portfolio-source.txt:261](../../assets/pages/portfolio-source.txt#L261). Evidence: flows.json.

### 27. Cloudflare admin password-change UI can report success without changing the login password

**Medium · Source review; configuration dependent**

Affected: Cloudflare with ADMIN_PASSWORD configured.

Login always prefers env.ADMIN_PASSWORD. The Change Password button updates settings.adminPass and shows success. When the environment variable is set, the newly saved password is ignored by subsequent logins. This branch was reviewed in source; the local preview did not configure the environment override.

Suggested fix: Make password changes use the actual credential source, or clearly route environment-managed changes through deployment configuration.

Source: [functions/api/[[path]].js:435](../../functions/api/[[path]].js#L435), [admin.html:1675](../../admin.html#L1675). Evidence: Source review.

### 28. Mutable scripts and styles are cached as immutable for one year

**Medium · Source review**

Affected: Returning visitors after deployments; Cloudflare.

_headers gives /css/* and /js/* max-age=31536000, immutable, while many pages request unversioned filenames and others retain fixed ?v=2/?v=3 URLs. Updating those files under the same URLs can leave users on old CSS/JS.

Suggested fix: Use content-hashed asset URLs or an appropriate revalidation policy for mutable filenames.

Source: [_headers:17](../../_headers#L17), [pricing.html:85](../../pricing.html#L85). Evidence: Source review.

### 29. Known default admin password remains enabled when no override is configured

**High · Source review; reproduced only in local configuration**

Affected: Both backends without configured credentials.

The code and admin login page disclose a built-in default. Both isolated previews accepted the password from the public settings file. This does not prove a production environment override is absent.

Suggested fix: Require explicitly configured credentials and remove the working default and password hint.

Source: [server.js:31](../../server.js#L31), [functions/api/[[path]].js:435](../../functions/api/[[path]].js#L435), [admin.html:314](../../admin.html#L314). Evidence: security.json; source review.

### 30. Session signing falls back to known source-code values

**High · Source review; configuration dependent**

Affected: Node without SESSION_SECRET; Cloudflare without both secret overrides.

Node uses a constant default session secret. Cloudflare falls back from SESSION_SECRET to ADMIN_PASSWORD and finally the built-in default. The latter signs the timestamp-only admin token. A production exploit was not attempted.

Suggested fix: Require an independently generated signing secret and fail startup/auth setup when it is absent.

Source: [server.js:59](../../server.js#L59), [functions/api/[[path]].js:731](../../functions/api/[[path]].js#L731). Evidence: Source review.

### 31. Cloudflare API reflects arbitrary credentialed CORS origins

**Medium · Reproduced response policy; exploit not established**

Affected: API clients; Cloudflare backend.

A request with Origin:https://attacker.example receives Access-Control-Allow-Origin for that origin and Access-Control-Allow-Credentials:true. SameSite=Lax cookies limit many cross-site scenarios, so the permissive response alone is not proof of authenticated cross-site data theft.

Suggested fix: Allow only the intended site origins, or omit CORS for a same-origin API.

Source: [functions/api/[[path]].js:872](../../functions/api/[[path]].js#L872). Evidence: endpoints.json.

### 32. Dependency audit reports eight affected packages

**High · Dependency audit; affected packages, not demonstrated exploits**

Affected: Node runtime and local/deployment tooling.

npm audit reports 1 critical, 6 high and 1 moderate affected packages. These include runtime packages and development tooling; registry severity is not proof that an exploitable path is reachable in this site. The exact advisory results are preserved in the evidence file.

Suggested fix: Review advisories, update affected dependencies and rerun the build and browser checks.

Source: package-lock.json. Evidence: npm-audit.json.

### 33. Login and lead submission have no application-level throttling

**Medium · Source review**

Affected: Both backends; exposed API routes.

The inspected login and public-lead handlers have no attempt limit, per-client submission limit or bot challenge. The audit did not send a brute-force or load test, and any external Cloudflare protection was not inspected.

Suggested fix: Add appropriate server-side request limits and verify any edge controls protecting these endpoints.

Source: [server.js:73](../../server.js#L73), [server.js:180](../../server.js#L180), [functions/api/[[path]].js:432](../../functions/api/[[path]].js#L432), [functions/api/[[path]].js:461](../../functions/api/[[path]].js#L461). Evidence: Source review.

## Checks that passed

- All 29 main routes loaded with HTTP 200 across the 319-size matrix, with no uncaught JavaScript errors on those initial main-page loads. The repeated-navigation and article tests found the separate failures above.
- No broken loaded image was found in that main-page matrix. This does not include authenticated OneDrive galleries.
- Apart from the two 320-pixel pages listed above, no document-width overflow was measured at the sampled widths. Correct width alone does not establish usability; the fixed menu bug still applies.
- Empty contact-form submission highlighted invalid fields, a valid contact lead reached the isolated backend, and package text prefilled correctly. Phone normalization and scrolling still fail as described.
- Unauthenticated /api/leads and /api/sync returned 401 on both backends. Public static files bypass these protections.
- The Cloudflare API rejected an empty lead with 400 and omitted adminPass from its public /api/settings response.

## Performance sample

One cold local browser run per route, 390×844 viewport, approximately 1.6 Mbps download, 150 ms latency and 4× CPU slowdown; analytics was blocked. These are lab samples, not field Core Web Vitals or a production benchmark.

| Route | Observed LCP | Observed CLS |
|---|---:|---:|
| / | 2.044 s | 0.0133 |
| /pricing | 1.736 s | 0.0018 |
| /contact | 1.608 s | No layout-shift entry observed |

No performance failure is asserted from these single local samples. See [performance evidence](evidence/performance.json).

## Dependency audit detail

| Package | Registry severity | Scope |
|---|---|---|
| proxy-addr | Critical | Node runtime transitive dependency |
| body-parser | High | Node runtime transitive dependency |
| qs | Moderate | Node runtime transitive dependency |
| brace-expansion | High | Build/development dependency tree |
| miniflare | High | Cloudflare development tooling |
| sharp | High | Cloudflare development tooling |
| undici | High | Cloudflare development tooling |
| wrangler | High | Direct development dependency; inherited advisories |

These are eight affected package entries, not eight independently proven website exploits. Advisory URLs and affected version ranges are in [npm-audit.json](evidence/npm-audit.json).

## Evidence files

[Structured findings](findings.json), [page/viewport matrix](evidence/matrix.json), [settled accessibility results](evidence/accessibility.json), [API and route checks](evidence/endpoints.json), [form/navigation flows](evidence/flows.json), [local security reproduction](evidence/security.json), [focused reproductions](evidence/repro.json), [dynamic routes](evidence/dynamic.json), [supplementary pages](evidence/extra.json), [link checks](evidence/links.json), [menu measurements](evidence/menu.json).

[Stuck homepage overlay](screenshots/home-return-error.png) · [Blank mobile menu](screenshots/home-menu-broken.png) · [Verified homepage capture](screenshots/home-mobile-verified.png) · [Portfolio client view](screenshots/work-modal.png).
