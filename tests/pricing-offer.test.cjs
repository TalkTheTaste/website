'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const page=()=>fs.readFileSync(path.join(__dirname,'../dist/pricing.html'),'utf8');
test('Social Essentials publishes the agreed monthly price, limits and consultation path in native HTML',()=>{
 const html=page();
 const block=html.slice(html.indexOf('id="social-essentials"'),html.indexOf('class="pp-compare"'));
 for(const text of ['Social Essentials','1,999','8 Social Media Posts','2 Edited Reels','8 Instagram Stories','Monthly Content Calendar','Captions &amp; Hashtags','Account Management','Basic Content Strategy','Monthly Performance Report','30 seconds each','2 carousels included within the 8 posts','3-month minimum','1 social media platform','Client-provided photos and footage','1 revision round per deliverable','No on-site shoot, ads support or basic SEO included.','Copy package details'])assert.ok(block.includes(text),text);
 assert.ok(html.includes('/book-consultation?package=Social%20Essentials&amp;service=Social%20Media'));
 const schema=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
 const catalog=schema.flatMap(s=>s['@graph']||[]).find(s=>s['@type']==='OfferCatalog');
 const offer=catalog.itemListElement.find(s=>s.name==='Social Essentials');
 assert.equal(offer.price,'1999');assert.equal(offer.priceCurrency,'AED');assert.equal(offer.priceSpecification.unitText,'month');
 assert.ok(!html.includes('packages start at AED 4,000'));assert.equal((html.match(/<h1\b/g)||[]).length,1);
});
test('the comparison preserves the distinction between Essentials and Signature',()=>{
 const html=page();const rows=[...html.match(/<tbody>([\s\S]*?)<\/tbody>/)[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m=>[...m[1].matchAll(/<(?:th|td)[^>]*>([^<]*)<\/(?:th|td)>/g)].map(c=>c[1]));
 assert.deepEqual(rows,[['Monthly price','AED 1,999','AED 4,000'],['Posts','8','10'],['Reels','2','4'],['Stories','8','15'],['On-site shoot','No','1 UAE shoot'],['Ads support','No','Limited'],['Basic SEO','No','Included']]);
});
test('existing published package fees remain intact',()=>{
 const html=page();const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];const offers=graph.find(s=>s['@type']==='OfferCatalog').itemListElement;
 for(const [name,price]of [['Signature Visibility Program','4000'],['Growth Acceleration Program','7000'],['Elite Brand Dominance Program','10000'],['Basic 5 Page Website','2000'],['Ecommerce Website','5000'],['Conversion Fix','0'],['Basic SEO','1500'],['Gold SEO + AEO + GEO','2000'],['Platinum SEO + AEO + GEO','2500'],['Bronze Shoot','450'],['Silver Shoot','1000'],['Gold Shoot','1500']])assert.equal(offers.find(o=>o.name===name)?.price,price,name);
 assert.ok(html.includes('$550'));assert.ok(html.includes('market availability varies'));
 for(const id of ['social-media-packages','social-essentials','production-packages','website-development','photography-videography','seo-packages','ugc-creators'])assert.ok(html.includes('id="'+id+'"'));
});
