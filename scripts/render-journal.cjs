const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
(async()=>{
 const {renderJournalIndex}=await import('../lib/journal-view.mjs');
 const {JOURNAL_CATALOG}=await import('../lib/journal-catalog.mjs');
 const version=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'css/journal.css'))).update(fs.readFileSync(path.join(root,'js/journal.js'))).digest('hex').slice(0,10);
 let shell=fs.readFileSync(path.join(root,'about.html'),'utf8')
 .replace(/<style id="about-page-styles">[\s\S]*?<\/style>/,`<link rel="stylesheet" href="/css/journal.css?v=${version}">`)
 .replace(/<main id="main-content">[\s\S]*?<\/main>/,'<!--JOURNAL_CONTENT-->')
 .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,'<!--JOURNAL_SCHEMA-->')
 .replace(/\s*<link\b[^>]*hreflang=[^>]+>/g,'')
 .replace(/<a href="\/about" class="active">/g,'<a href="/about">')
 .replace(/<a href="\/blog">/g,'<a href="/blog" class="active" aria-current="page">')
 .replace(/\b(src|href)=(["'])(css\/|js\/|assets\/|images\/)/g,'$1=$2/$3')
 .replace('</body>',`<script src="/js/journal.js?v=${version}" data-ttt-page></script></body>`);
 fs.mkdirSync(path.join(root,'assets/pages'),{recursive:true});
 fs.writeFileSync(path.join(root,'assets/pages/journal-shell.txt'),shell);
 fs.writeFileSync(path.join(root,'post-template.asset'),shell);
 fs.writeFileSync(path.join(root,'blog.html'),await renderJournalIndex(shell,JOURNAL_CATALOG));
 const legacy=shell.replace('<!--JOURNAL_CONTENT-->','<main id="main-content"><div id="journal-page" class="jr-shell jr-hero"><h1>Opening article…</h1><p data-legacy-message>Please wait while we find your article.</p><a href="/blog" class="jr-link">Back to Journal</a></div></main>').replace('<!--JOURNAL_SCHEMA-->','').replace(/<title>[\s\S]*?<\/title>/,'<title>Journal | Talk The Taste</title>').replace(/(<link rel="canonical" href=")[^"]*/,'$1https://talkthetaste.com/blog').replace(/(<meta name="robots" content=")[^"]*/,'$1noindex, follow').replace('</body>','<script src="/js/journal-legacy.js" data-ttt-page></script></body>');
 fs.writeFileSync(path.join(root,'post.html'),legacy.replace(/^[ \t]+$/gm,''));
 console.log('Rendered Journal listing, article shell and legacy link support.');
})().catch(error=>{console.error(error);process.exitCode=1;});
