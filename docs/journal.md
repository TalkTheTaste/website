# Journal

The Journal listing and article pages render published CMS content on the server. Existing `/blog/slug/` links, authors, publication dates and article text remain intact. Search and topic filters work with JavaScript and standard GET forms; filtered URLs use the canonical Journal URL and noindex.

Upload a genuine cover through the existing post editor. Real uploaded images appear automatically. Known legacy generated placeholder files and the existing generated calendar thumbnail are suppressed without editing stored posts. Articles without a cover use the text layout. Inline uploaded covers receive a public `/journal-images/slug.jpg` URL with the correct image MIME type.

`lib/journal-catalog.mjs` contains a snapshot of the eight public articles for static output and API outages. A successful empty CMS response remains authoritative. Refresh this snapshot when updating the fallback; never include drafts or private CMS data. Run `npm run build:journal` to rebuild the static listing and article shell. The normal build includes this step.

Article HTML is sanitized before rendering. Semantic headings, links, lists, images and tables are supported; executable code and editor inline styling are removed.

Validated 23 November 2026: production build and Cloudflare Functions bundle; 30 Node tests; two Journal browser tests; all nine Journal routes at 320, 390, 768, 1024, 1440 and 2560 pixels in Chrome and WebKit (108 page checks); automated accessibility checks on the listing and an article in both engines; mobile menu open/Escape; local-only AJAX navigation into Journal and an article.
