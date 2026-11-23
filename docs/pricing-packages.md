# Pricing and Social Essentials

The Pricing page uses the shared About-page navigation and footer, plus a scoped layout in `css/pricing.css`. It does not introduce AJAX navigation.

## Offer source

`scripts/pricing-content.cjs` holds package prices, deliverables and the new Social Essentials offer. `npm run build:pricing` regenerates `pricing.html`; the normal `npm run build` includes this step. Edit the content file rather than the generated HTML, and keep the numeric limits and the corresponding inclusion descriptions consistent.

Social Essentials is AED 1,999 per month with a 3-month minimum commitment. Its eight posts include up to two carousels, rather than adding two extra posts. It includes two reels edited from client footage, up to 30 seconds each; eight Instagram stories; monthly planning, captions/hashtags, publishing, basic content strategy and reporting. It covers one platform and one revision round per deliverable. The client supplies photos and footage. On-site shoots, ads support and basic SEO are excluded.

The comparison uses the supplied Signature scope: AED 4,000/month, 10 posts, four reels, 15 stories, one UAE shoot, limited ads support and included basic SEO. Signature, Growth, Elite, website, search, shoot and creator fees were retained from the published Pricing page.

## Enquiries and copying

The Social Essentials CTA opens `/book-consultation` with `package=Social Essentials` and `service=Social Media`. The page shows the selected package as a reminder alongside the embedded Microsoft Bookings calendar. Its contact link preserves the same context for the enquiry form. Other package enquiry buttons continue to use the contact form.

Copy package details copies a plain-text summary including the full limits, exclusions, commitment and consultation link. Where browser clipboard access is unavailable, it reveals and selects a labelled read-only text field for manual copying. Mobile text fields use at least 16px to avoid iOS focus zoom.

The existing `/pricing#social-media-packages` anchor leads to the full social offering, starting with Essentials. `/pricing#social-essentials` links directly to the new offer. Shoot-inclusive social plans are under `#production-packages`.

## Search and verification

The page keeps `/pricing` as its canonical URL and the existing TTT brand card as its link preview. The metadata, OfferCatalog and visible FAQ now reflect the AED 1,999 entry offer. Monthly prices include a monthly unit specification; the $550 creator programme retains its existing display currency without assuming a new currency conversion.

Tests cover the exact Social Essentials limits and price, the supplied comparison, and preservation of existing fees. Browser checks cover Chrome/WebKit responsive layouts, automated accessibility, clipboard success/manual fallback, keyboard disclosures, mobile navigation and contact prefilling. Core package information remains present without JavaScript.
