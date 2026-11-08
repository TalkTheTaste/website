# Website fixes and verification — 8 November 2026

The 33 audit items have been addressed in source. Deployment and credential rotation have not been performed. The Arabic-language behavior and production rate-limit scope are described explicitly below. Existing data/analytics.json changes were preserved.

## Verification

| Check | Result |
|---|---|
| Public build | Passed; private data/source excluded |
| Backend/security tests | 13 passed |
| Distinct browser regression cases | 17 validated |
| Full page/viewport matrix | 319 checks, 0 failures |
| Main-page accessibility scans | 58 scans, 0 automated violations |
| Dependency audit | 0 vulnerabilities |
| Whitespace/error check | git diff --check passed |

Browser regression execution consisted of the complete 16-case suite, followed by two passing focused article tests after the last article-template hardening change; the focused run adds one new case and repeats the affected existing case. See the saved logs. Browser tests create an isolated temporary data directory.

The layout matrix used Chrome 156.0.8078.80 at 320×568, 360×800, 390×844, 430×932, 844×390, 768×1024, 1024×768, 1366×768, 1920×1080, 2560×1440 and 3840×2160. It covers 29 main routes and 319 unique route/viewport pairs. No uncaught initial-page errors, failed loaded images, width overflow or shared-menu open/Escape failures were found in the final matrix. Supplementary routes and interactive behaviors were checked separately. This is browser emulation, not certification of physical devices or actual TV remotes.

The matrix suppresses local analytics submissions so a 319-page synthetic crawl does not flood the rate limiter or fill analytics storage. Earlier synthetic analytics requests correctly received 429; the clean final layout run isolates rendering/navigation from telemetry load. Backend rate limiting is covered by separate tests. Google Analytics was blocked in browser contexts. Screenshots use reduced motion to capture settled layouts.

Both the Node preview and Cloudflare Pages preview were tested. Valid contact and free-audit submissions succeeded; stored HTML markers did not execute in either admin dashboard. Dynamic article and fallback portfolio URLs return 200, while missing dynamic routes return a readable 404. The Pages preview used the repository's configured compatibility date with the updated Wrangler.

Safari/WebKit, Firefox, physical iOS/Android devices, Windows-specific behavior, real TV browsers/remotes, external OneDrive galleries, payment delivery, external notification delivery and production edge rules remain unverified. The automated accessibility results do not replace manual screen-reader testing.

## Deployment actions

1. Set the Cloudflare Pages build command to **npm run build**, output directory to **dist**, and Node version to **22 or newer**. The Wrangler configuration and deploy script now use dist. Do not publish the repository root.
2. Configure a fresh **ADMIN_PASSWORD** of at least 16 characters and an independent **SESSION_SECRET** of at least 32 characters. Admin login intentionally fails closed when either is absent/too short. Rotate credentials that were exposed by the old public settings files. No production secret was read, changed or rotated by this task.
3. Deploy the reviewed changes. Updated asset URLs bypass earlier immutable browser caches; future responses revalidate mutable assets. Code changes alone do not remove old files from an existing deployment.
4. Add production edge rate-limit/WAF rules for strict global quotas. Node counters are process-local. Pages counters are immediate within an isolate with best-effort, eventually consistent KV carryover; these are not globally atomic rate limits.

The Security panel now explains that the password is managed by the deployment. Updating settings JSON does not pretend to change an environment-managed credential. See [deployment instructions](../../DEPLOY.md).

## Resolution of each audit item

### 01. Private data and server source are publicly downloadable

Public build now contains only allowlisted assets in dist/. Node serves that directory; Pages middleware also rejects private paths for legacy configurations. Both preview servers return 404 for private data/source requests.

### 02. Node settings API discloses the admin password

Both settings APIs and authenticated sync use an explicit public-field allowlist. The stored/default admin password was removed from tracked settings and client defaults.

### 03. Stored cross-site scripting in the admin lead table

Lead-table text and attribute values are escaped. Harmless stored HTML markers were submitted and displayed as text without executing on both backends.

### 04. Returning to Home can leave the site completely covered

Cross-page links use native browser navigation. Home → About → Home completes without duplicate declarations or a stuck overlay; fragment scrolling and browser history retain browser behavior.

### 05. Fixed menus, navigation and floating actions use the full document as their viewport

The retained transform was removed from body animation. Reduced-motion disables the page animation. Menus scroll within the viewport on short screens; fixed navigation stays at viewport top after scrolling.

### 06. Portfolio links fail when opened directly or refreshed in fallback mode

The shared case-study route renders fallback portfolio projects when OneDrive is not configured. Actual card URLs now return 200 on both servers.

### 07. Node server does not implement published article or portfolio detail routes

Node now invokes the same article and case-study renderers as Pages, with a safe local public-asset adapter.

### 08. Arabic pages lose their language and right-to-left direction

Language metadata derives from the route. All six existing Arabic pages retain lang=ar, dir=rtl and their Arabic navigation URLs.

### 09. Arabic toggle leaves major English content untranslated

Partial word-by-word translation was removed. Language links open the existing complete Arabic counterparts; unsupported English pages explicitly link to the Arabic services overview. This does not add translations for every specialized English page.

### 10. Contact form stores malformed UAE phone numbers

Phone numbers use shared libphonenumber parsing on the client and server. National trunk prefixes, international pastes and invalid numbers are covered by tests; the UAE local number test stores +971501234567.

### 11. Pricing quote links do not scroll to the target form

Native navigation follows #free-audit after opening Contact, with scroll padding for the fixed header. Package text still prefills correctly.

### 12. Server-rendered blog articles throw a JavaScript exception

Article code updates document.title without querying the removed title ID. The template no longer displays raw query parameters in a debug panel. Article SSR no longer removes content through the obsolete debug-panel replacement.

### 13. Text and CTA contrast fails across the site

Yellow buttons now use dark text; active links, metadata, footer text, testimonials and dark/light contextual labels were corrected. All 58 main-page accessibility scans and the supplementary article, case-study, 404 and admin-login scans report no automated violations.

### 14. Country-code selector has no accessible name

The country calling-code selector has an accessible name, and contact field errors are associated with their inputs.

### 15. Legal-page mobile menus do not manage keyboard focus or close on Escape

Privacy Policy and Terms use the shared accessible menu implementation, with focus entry, keyboard containment, Escape and focus restoration.

### 16. Portfolio client view lacks dialog semantics and focus management

Portfolio client/media views have dialog semantics, background inertness and keyboard containment. Focus enters after the opening frame and returns to the card; modal images use root-resolved URLs.

### 17. Privacy-policy contact links have undersized, crowded touch targets

Privacy-policy contact links have larger hit areas and spacing. The original target-size findings no longer occur.

### 18. Custom-software FAQ heading overflows at 320 pixels

Long headings wrap within narrow text columns; the custom-software page fits 320 pixels.

### 19. Social-media hero overflows at 320 pixels

The social-media hero reflows at 320 pixels. No document-width overflow was measured across the final 319 checks.

### 20. Node lead endpoint accepts completely empty submissions

Node validates required lead fields on the server and rejects an empty body with 400, matching Pages.

### 21. Backend accepts leads without the contact consent required by the UI

Both backends require contactConsent === true and generate the consent timestamp server-side.

### 22. Free-audit form accepts unusable website/Instagram values

Free-audit submissions validate full HTTP(S) website URLs or supported Instagram handles on both the client and server. A placeholder such as x is rejected.

### 23. Some dynamic 404 responses have empty bodies

Dynamic error pages fetch assets with a clean GET, follow same-origin canonical asset redirects, and always return a readable 404 body.

### 24. Node 404 responses display the homepage

Unknown Node routes return the existing 404 template rather than homepage markup.

### 25. Node favicon endpoint is missing

Node serves the favicon asset successfully.

### 26. Work-page contact number differs from the rest of the site

The portfolio footer now uses the primary site number, +971 56 539 0316.

### 27. Cloudflare admin password-change UI can report success without changing the login password

The misleading password-change form was replaced with explicit deployment-managed password instructions. All authentication reads ADMIN_PASSWORD; settings cannot silently override it.

### 28. Mutable scripts and styles are cached as immutable for one year

Mutable assets use revalidation headers. Updated CSS/JS references carry ?v=20261108 to bypass prior immutable browser entries on the first fixed release.

### 29. Known default admin password remains enabled when no override is configured

No working default credentials remain. Admin login returns 503 until a 16+ character ADMIN_PASSWORD and 32+ character SESSION_SECRET are configured.

### 30. Session signing falls back to known source-code values

Pages signing requires the configured SESSION_SECRET. Node uses the configured secret, or an unpredictable ephemeral secret while admin access is disabled for missing configuration.

### 31. Cloudflare API reflects arbitrary credentialed CORS origins

Pages no longer reflects arbitrary credentialed origins; unknown origins are rejected with 403 and no access-control grant. Node rejects cross-origin POSTs as well.

### 32. Dependency audit reports eight affected packages

Runtime and development dependencies were updated. npm audit reports zero vulnerabilities, including after adding the browser-test dependencies. Node 22+ is now required by the toolchain.

### 33. Login and lead submission have no application-level throttling

Login, lead submission and analytics handlers enforce application-level request limits. Node limits are per process; Pages uses immediate per-isolate limits plus best-effort KV carryover. Strict global production quotas still require edge/WAF rules.

## Repeat the checks

Use Node 22+ and install dependencies with npm ci. Run npm run build, npm test, npm run test:browser and npm audit. The browser suite uses installed Google Chrome; an alternate installed Playwright channel can be selected through PLAYWRIGHT_CHANNEL. npm run cf:dev starts the Pages preview after building; provide local secrets through the ignored .dev.vars file. npm start builds and starts Node; export its environment secrets first.

The full audit matrix is preserved as evidence rather than exposed as a public site feature. The retained browser suite covers security boundaries, repeated navigation, mobile menus, fixed navigation, form validation, quote fragments, Arabic routes, article rendering, portfolio deep links and focus, stored/reflected HTML rendering, 320-pixel reflow and representative accessibility.

[Verification summary](verification.json) · [Resolutions](resolutions.json) · [Matrix](evidence/matrix.json) · [Accessibility](evidence/accessibility.json) · [API checks](evidence/endpoints.json) · [Dynamic routes](evidence/dynamic.json) · [Supplementary pages](evidence/extra.json) · [Both-runtime form/XSS checks](evidence/flows.json) · [Backend test log](evidence/backend-tests.txt) · [Browser suite](evidence/browser-regressions.txt) · [Final article tests](evidence/article-regressions.txt) · [Dependency audit](evidence/npm-audit.json).

[Fixed mobile menu screenshot](screenshots/mobile-menu-fixed.png).
