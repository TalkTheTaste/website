# Real photography for Services

The Services family works without photographs. No stock or generated pictures are used as substitutes. Add an approved photo under the filenames below, then run `npm run build` locally or commit the asset to GitHub for the normal production build. No HTML edits are needed.

Use **landscape 16:9**, ideally **1600 × 900 px or larger**. A file under about 500 KB is a useful target. WebP, JPG, PNG and AVIF are accepted; if several extensions exist for one name, the build chooses WebP, then JPG, PNG, AVIF. Remove the previous extension when replacing an image. Supply only imagery you have permission to publish, including any visible client work or people.

| File in assets/services/ | Photo to supply | Priority |
| --- | --- | --- |
| services-overview.jpg | Your actual team collaborating or working in the studio. | First |
| marketing-strategy.jpg | A real planning session, workshop or campaign planning desk. | First |
| social-media.jpg | An actual client content shoot or published social content shown in context. | First |
| paid-advertising.jpg | A real campaign review with private client information hidden. | When available |
| photography.jpg | Your photographer working, or an approved product/brand photograph. | When available |
| video-production.jpg | Your crew filming on location. | When available |
| brand-identity.jpg | A finished identity, packaging or printed brand system you designed. | When available |
| website-design.jpg | A real website you built, photographed on a laptop or as an approved screen capture. | When available |
| mobile-apps.jpg | An actual application you built, shown on a phone. | When available |
| custom-software.jpg | A real portal, dashboard or tool you built, with private data removed. | When available |
| restaurant-marketing.jpg | A real restaurant client, team or campaign in context. | When available |
| restaurant-branding.jpg | A restaurant identity you designed: menus, packaging or signage. | When available |
| restaurant-launch.jpg | A real opening or launch activation. | When available |
| food-photography.jpg | One of your actual dish or drink photographs. | When available |
| orange-county.jpg | Your Irvine team or an approved Southern California client project. | When available |

These are optional slots, not a request to find generic pictures. Start with the team, marketing strategy and social media photographs. The pages are complete without the others. Captions and alt text can be made project-specific once you supply the selected photographs.

## Link preview

`assets/brand/share-card-v2.png` is the 1200 × 630 TTT brand card used for social/link previews. It uses the existing logo, typography and brand colours, with no generated photography. Replacing service photography does not change this preview automatically; that prevents a random crop or private dashboard appearing in a shared link. If you supply a different approved preview, export it at 1200 × 630 and update this asset (use a new filename and update metadata if refreshing an already-cached preview). Messaging apps can retain older previews after a deployment; those caches are outside the website build.

## Editing service content

`scripts/service-content.cjs` contains the directory, service-specific descriptions, scope, process and FAQ content. `npm run build:services` renders the pages using the existing About-page navigation/footer shell. `css/services.css` controls the shared layout. Do not edit the rendered service HTML as the primary content source: the next build regenerates it.
