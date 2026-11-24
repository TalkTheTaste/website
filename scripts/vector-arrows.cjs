'use strict';
// Replace decorative text nodes only: scripts, styles, attributes and structured data stay intact.
const paths={'↗':'M5 19 19 5M5 5h14v14','↖':'M19 19 5 5M5 19V5h14','→':'M4 12h16m-6-6 6 6-6 6','←':'M20 12H4m6-6-6 6 6 6','➡':'M4 12h16m-6-6 6 6-6 6'};
module.exports=function vectorArrows(html){
 return html.split(/(<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>|<!--[\s\S]*?-->|<[^>]+>)/gi).map((part,i)=>i%2?part:part.replace(/[↗↖→←➡]\uFE0F?/g,arrow=>`<svg class="ttt-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${paths[arrow[0]]}"/></svg>`)).join('');
};
