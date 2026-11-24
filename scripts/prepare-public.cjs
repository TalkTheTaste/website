'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vectorArrows = require('./vector-arrows.cjs');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const files = fs.readdirSync(root).filter(file => file.endsWith('.html'));
files.push('assets', 'css', 'js', 'images', 'ar', 'TTTprofile.pdf', 'robots.txt', 'sitemap.xml', 'llms.txt', '_headers', '_redirects', '_routes.json', 'post-template.asset');
for (const file of files) fs.cpSync(path.join(root, file), path.join(output, file), { recursive: true });
const styleVersion=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'css/main.css'))).digest('hex').slice(0,12);
function icons(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const filename=path.join(directory,entry.name);if(entry.isDirectory()){if(!['fonts','site'].includes(entry.name))icons(filename);}else if(/\.(html|asset|txt)$/.test(entry.name)){const html=fs.readFileSync(filename,'utf8');if(html.includes('<html'))fs.writeFileSync(filename,vectorArrows(html).replace(/(href=["'][^"']*css\/main(?:\.min)?\.css)(?:\?[^"']*)?(["'])/gi,'$1?v='+styleVersion+'$2'));}}}
icons(output);
console.log('Prepared public assets in dist/ (private data and source excluded).');
