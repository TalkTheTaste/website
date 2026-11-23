'use strict';
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
(async()=>{
 const {renderWorkIndex}=await import(pathToFileURL(path.join(root,'lib/work-view.mjs')));
 const {WORK_CATALOG}=await import(pathToFileURL(path.join(root,'lib/work-catalog.mjs')));
 let shell=fs.readFileSync(path.join(root,'about.html'),'utf8');
 shell=shell.replace(/\b(src|href)=(["'])(css\/|js\/|assets\/|images\/)/g,'$1=$2/$3');
 shell=shell.replace(/\b(src|href)=(["'])(css\/|js\/|assets\/|images\/)/g,'$1=$2/$3');
 const version=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'css/work.css'))).update(fs.readFileSync(path.join(root,'js/work.js'))).digest('hex').slice(0,10);
 shell=shell.replace(/<style id="about-page-styles">[\s\S]*?<\/style>/,`<link rel="stylesheet" href="/css/work.css?v=${version}">`);
 shell=shell.replace(/<main id="main-content">[\s\S]*?<\/main>/,'<!--WORK_CONTENT-->');
 shell=shell.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,'<!--WORK_SCHEMA-->');
 shell=shell.replace(/\s*<link\b[^>]*hreflang=[^>]+>/g,'');
 shell=shell.replace(/content="index, follow"/,'content="index, follow, max-image-preview:large"');
 shell=shell.replace(/<a href="\/about" class="active">/g,'<a href="/about">');
 shell=shell.replace(/<a href="\/work">/g,'<a href="/work" class="active">');
 shell=shell.replace('</body>',`<script src="/js/work.js?v=${version}" data-ttt-page></script></body>`);
 // Existing shared code handles the fixed mobile menu; its position is never animated.
 shell=shell.replace(/(js\/transitions(?:\.min)?\.js)(?:\?[^"']*)?/g,'$1?v=20261123-work1');
 const directory=path.join(root,'assets/pages');fs.mkdirSync(directory,{recursive:true});
 fs.writeFileSync(path.join(directory,'work-shell.txt'),shell);
 fs.writeFileSync(path.join(directory,'portfolio-source.txt'),renderWorkIndex(shell,WORK_CATALOG.projects));
 console.log('Prepared server-rendered Work shell and real portfolio fallback.');
})().catch(error=>{console.error(error);process.exitCode=1;});
