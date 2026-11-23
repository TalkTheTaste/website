import xss from 'xss';
import { JOURNAL_CATALOG } from './journal-catalog.mjs';
export const SITE='https://talkthetaste.com';
export const BRAND=SITE+'/assets/brand/share-card-v2.png';
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decode=value=>String(value).replace(/&(amp|quot|apos|lt|gt|nbsp|#39|#x[0-9a-f]+|#\d+);/gi,(_,key)=>{const map={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ', '#39':"'"};const k=key.toLowerCase();if(k in map)return map[k];const n=k.startsWith('#x')?parseInt(k.slice(2),16):parseInt(k.slice(1),10);return Number.isFinite(n)&&n>0&&n<=0x10ffff?String.fromCodePoint(n):'';});
export const plain=value=>decode(String(value||'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
export function published(post,now=Date.now()){return post&&post.slug&&post.status!=='draft'&&post.status!=='archived'&&(post.status!=='scheduled'||Date.parse(post.scheduledAt)<=now);}
export function publishedPosts(posts,now=Date.now()){return (Array.isArray(posts)?posts:[]).filter(p=>published(p,now)).sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0));}
export async function loadPosts(request){
 try{const r=await fetch(new URL('/api/posts',request.url),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Journal unavailable');const posts=await r.json();if(!Array.isArray(posts))throw Error('Invalid journal data');return publishedPosts(posts);}catch{return publishedPosts(JOURNAL_CATALOG);}
}
export const articleURL=post=>'/blog/'+encodeURIComponent(post.slug)+'/';
export function iso(value){const date=value?new Date(value):null;return date&&!isNaN(date)?date.toISOString():null;}
export function displayDate(value){const date=iso(value);return date?new Date(date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}):'';}
export const readingTime=post=>Math.max(1,Math.ceil(plain(post.content).split(/\s+/).filter(Boolean).length/200));
const legacyInline=new Set(['2791066e3c3afca168b060b75b8d949d75507417b0018c2a6099024f1de66d68']);
const legacyPhoto=/\/assets\/site\/(?:home-hero|restaurant-brand-launch|social-growth-campaign|delivery-web-app|social-card|content-calendar)(?:-\d+)?\.(?:jpg|jpeg|png|webp|avif)$/i;
export async function cover(post){
 const source=String(post.thumbnail||'');if(!source)return null;
 const inline=source.match(/^data:(image\/(?:jpeg|png|webp|avif));base64,([a-z0-9+/=\s]+)$/i);
 if(inline){if(source.length>16000000)return null;const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source)))].map(b=>b.toString(16).padStart(2,'0')).join('');if(legacyInline.has(hash))return null;return {src:`/journal-images/${encodeURIComponent(post.slug)}.jpg?v=${hash.slice(0,16)}`,mime:inline[1],data:inline[2]};}
 try{const url=new URL(source,SITE+'/');if(!/^https?:$/.test(url.protocol)||url.username||url.password||url.origin===SITE&&legacyPhoto.test(url.pathname))return null;return {src:url.origin===SITE?url.pathname+url.search:url.href};}catch{return null;}
}
const allowed={p:[],br:[],strong:[],em:[],b:[],i:[],u:[],s:[],h1:[],h2:[],h3:[],h4:[],h5:[],h6:[],ul:[],ol:['start'],li:[],blockquote:[],hr:[],pre:[],code:[],a:['href','title'],img:['src','alt','title','width','height'],figure:[],figcaption:[],table:[],thead:[],tbody:[],tfoot:[],tr:[],td:['colspan','rowspan'],th:['scope','colspan','rowspan'],caption:[],div:[],span:[],sup:[],sub:[]};
const cleaner=new xss.FilterXSS({whiteList:allowed,stripIgnoreTag:true,stripIgnoreTagBody:['script','style','iframe','object','embed','form','svg','math'],css:false});
export function articleBody(post){
 const source=String(post.content||'').replace(/\bhref=(["'])(.*?)\1/gi,(all,quote,value)=>{try{const decoded=decode(value);if(decoded.startsWith('#')||/^(?:mailto:|tel:)/i.test(decoded))return all;const url=new URL(decoded,SITE+'/');return /^https?:$/.test(url.protocol)?`href="${escapeHTML(url.href)}"`:all;}catch{return all;}});
 let html=cleaner.process(source).replace(/<(\/?)(?:h1)(?=[\s>])/gi,'<$1h2');
 html=html.replace(/<p>\s*(?:&nbsp;|<br\s*\/?>|\s)*<\/p>/gi,'');
 let index=0;const headings=[];
 html=html.replace(/<(h[23])>([\s\S]*?)<\/\1>/gi,(_,tag,text)=>{const id='article-section-'+(++index);headings.push({id,text:plain(text),level:tag});return `<${tag} id="${id}">${text}</${tag}>`;});
 // Resolve article images and links against the site root, not the nested article path.
 html=html.replace(/\b(src|href)="([^"]*)"/g,(all,attr,value)=>{if(value.startsWith('#')||/^(?:mailto:|tel:)/i.test(value))return all;if(attr==='src'&&/^data:image\/(?:jpeg|png|webp|avif);base64,/i.test(value))return all;try{const url=new URL(decode(value),SITE+'/');if(!/^https?:$/.test(url.protocol))return attr==='src'?'':all;if(attr==='src'&&url.origin===SITE&&legacyPhoto.test(url.pathname))return 'data-legacy-image="true"';return `${attr}="${escapeHTML(url.origin===SITE?url.pathname+url.search+url.hash:url.href)}"`;}catch{return all;}});
 html=html.replace(/<img\b[^>]*data-legacy-image="true"[^>]*>/g,'');
 html=html.replace(/<img\b([^>]*)>/gi,(_,attrs)=>`<img${attrs}${/\balt=/.test(attrs)?'':` alt="${escapeHTML(post.title)} — article image"`} loading="lazy" decoding="async">`);
 return {html,headings};
}
export const faqs=post=>(Array.isArray(post.faqs)?post.faqs:[]).filter(f=>f?.question&&f?.answer);
