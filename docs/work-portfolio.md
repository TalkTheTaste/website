# Work and public image publishing

OneDrive remains the live source. The Work index and client galleries render project links and native `<img src>` elements on the server, so discovery does not depend on scrolling, filters or JavaScript. The design uses the same spacing and typography as Services/About, with progressive card motion and a native dialog viewer. Reduced motion is respected and content stays visible when JavaScript is disabled.

## Why the previous images were difficult to discover

Production used `/api/portfolio/thumb?id=...` image URLs while its robots.txt disallowed `/api/`. Those endpoints redirected to temporary Microsoft media URLs. The index also populated cards in JavaScript. The new pages consistently use `/portfolio-images/{client}/{item-id}/{descriptive-name}.jpg` instead. This route checks that the item belongs to a published project, fetches the image on the server, and returns its actual image bytes and Content-Type with no signed Location header. The filename is stable; the response MIME type describes the source format (which can be PNG or JPEG).

The public route caches bytes for an hour, supports HEAD, and never forwards Graph credentials or signed URLs to the browser. Private API paths remain blocked in the production robots.txt. Project covers use each client’s configured Banner file or Banner folder first, matching the existing OneDrive setup. Photography or a film still is used only when no Banner is available.

## Discovery and SEO

- `/work` links to every current project in its initial HTML.
- Each `/work/{client}/` has a canonical URL, gallery captions, image alt text and ImageGallery/ImageObject metadata.
- `/portfolio-sitemap.xml` lists current project pages and the same public image URLs the pages display. It is advertised in robots.txt alongside the existing site sitemap.
- Filter and lightbox interactions enhance ordinary project/image links rather than replace them.
- Existing client/id query links redirect to canonical project pages.

These changes address discovery and crawlability. Google still decides whether and when to index or display each image. Review the sitemap and page/image crawl results in Search Console after deployment; a successful image fetch is not proof that Google has indexed it.

References: [Google image SEO guidance](https://developers.google.com/search/docs/appearance/google-images), [Google image sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps).

## Adding and updating work

Continue using the configured OneDrive Clients folder and each client's Photography/Videography folders. New published items are picked up by the existing live API after its caches expire; a manual GitHub deployment is not required for each new item. Only images attached to a project returned by the public index are exposed through the new image route.

Meaningful file names such as `Espresso and pastry on the terrace.jpg` become descriptive captions and alt text. Camera names such as `IMG_1234.jpg` use an honest client/medium/sequence caption instead; the code does not invent subjects, campaign results or testimonials. Renaming a file updates its caption after the detail cache refreshes while its public image URL remains stable.

`lib/work-catalog.mjs` is a snapshot of already-public client metadata for upstream outages and local previews. It contains no OAuth credentials or signed download URLs. Refresh it deliberately with `npm run sync:work`, review the diff, and rebuild with `npm run build`. The live source is preferred whenever available. Refresh the fallback when retiring a project as well; already-cached public images can remain available until the one-hour image cache expires.

## Local and production checks

The Node preview and Cloudflare Pages expose the same Work HTML, public image routes and image sitemap. `npm test` covers server-rendered discovery, stable URLs, byte responses/HEAD/cache behavior, unpublished-image rejection, sitemap entries and real-work fallback behavior. Production builds include the Work shell but keep its raw `/assets/pages/` source blocked from indexing.
