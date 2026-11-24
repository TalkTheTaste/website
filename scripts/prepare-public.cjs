'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vectorArrows = require('./vector-arrows.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const files = fs.readdirSync(root).filter(file => file.endsWith('.html'));
files.push('assets', 'css', 'js', 'images', 'ar', 'TTTprofile.pdf', 'robots.txt', 'sitemap.xml', 'llms.txt', '_headers', '_redirects', '_routes.json', 'post-template.asset');
for (const file of files) fs.cpSync(path.join(root, file), path.join(output, file), { recursive: true });
function icons(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const filename=path.join(directory,entry.name);if(entry.isDirectory()){if(!['fonts','site'].includes(entry.name))icons(filename);}else if(/\.(html|asset|txt)$/.test(entry.name)){const html=fs.readFileSync(filename,'utf8');if(html.includes('<html'))fs.writeFileSync(filename,vectorArrows(html));}}}
icons(output);
console.log('Prepared public assets in dist/ (private data and source excluded).');
