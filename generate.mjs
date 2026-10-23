// Scans this folder for PDFs and writes index.html. Re-run after adding/removing PDFs:  node generate.mjs
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep, basename } from 'node:path';

const ROOT = process.cwd();
const SKIP = new Set(['node_modules', '.git', '.vercel']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.toLowerCase().endsWith('.pdf')) out.push({ rel: relative(ROOT, p).split(sep), size: st.size });
  }
  return out;
}

const files = walk(ROOT);
const clean = (f) => basename(f, '.pdf').replace(/^-+/, '').trim();
const href = (rel) => rel.map(encodeURIComponent).join('/');

// Answer keys: Answers/<Section>/<Name>~Key.pdf  ->  lookup by lowercase "<name>"
const keys = new Map();
for (const f of files) {
  if (f.rel[0] !== 'Answers') continue;
  keys.set(clean(f.rel.at(-1)).replace(/~key$/i, '').toLowerCase(), f);
}

// Practice: <Section>/<Domain>/<Topic>/<Name N>.pdf
const tree = {};
const usedKeys = new Set();
for (const f of files) {
  if (f.rel[0] === 'Answers') continue;
  const [section, domain, topic] = f.rel.length >= 4 ? f.rel : [f.rel[0], f.rel[1] ?? '', f.rel[1] ?? ''];
  const name = clean(f.rel.at(-1));
  const key = keys.get(name.toLowerCase());
  if (key) usedKeys.add(key);
  const set = (name.match(/(\d+)$/) || [, name])[1];
  ((tree[section] ??= {})[domain] ??= {})[topic] ??= [];
  tree[section][domain][topic].push({
    set, name, size: f.size,
    pdf: href(f.rel),
    key: key ? href(key.rel) : null,
  });
}
const orphanKeys = [...keys.values()].filter((k) => !usedKeys.has(k)).map((k) => k.rel.join('/'));

const data = Object.entries(tree).map(([section, domains]) => ({
  section,
  domains: Object.entries(domains).map(([domain, topics]) => ({
    domain,
    topics: Object.entries(topics).map(([topic, items]) => ({
      topic,
      items: items.sort((a, b) => a.set.localeCompare(b.set, undefined, { numeric: true })),
    })),
  })),
}));

const links = [
  { title: 'Vocabulary flashcards', note: 'English words', url: 'https://claude.ai/public/artifacts/0dc7b1fb-5c27-4259-9a86-dd991fa38a2d' },
  { title: 'Updated DSAT vocabulary list', note: '345 Tutoring', url: 'https://345tutoring.wordpress.com/updated-dsat-vocabulary-list/' },
];

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>SAT Practice</title>
<script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
<style>
:root{--bg:#f6f5f1;--card:#fff;--ink:#1c1c1a;--mute:#6b6a64;--line:#e4e2da;--acc:#2f5bd8;--acc2:#1f8a5b}
:root[data-theme=light]{color-scheme:light}
:root[data-theme=dark]{color-scheme:dark;--bg:#141413;--card:#1e1e1c;--ink:#ecebe5;--mute:#9a988f;--line:#33322e;--acc:#7da2ff;--acc2:#5ccf9b}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){color-scheme:dark;--bg:#141413;--card:#1e1e1c;--ink:#ecebe5;--mute:#9a988f;--line:#33322e;--acc:#7da2ff;--acc2:#5ccf9b}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
header{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line);padding:12px 16px}
.wrap{max-width:860px;margin:0 auto}
.top{display:flex;align-items:center;justify-content:space-between;margin:0 0 8px}
h1{font-size:1.15rem;margin:0}
#theme{font:inherit;font-size:.85rem;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--ink);cursor:pointer}
input{width:100%;padding:10px 12px;font:inherit;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:10px}
main{padding:12px 16px 64px}
details{margin:10px 0}
details>summary{cursor:pointer;list-style:none;font-weight:600}
details>summary::-webkit-details-marker{display:none}
details>summary::before{content:"▸";display:inline-block;width:1.1em;color:var(--mute);transition:transform .15s}
details[open]>summary::before{transform:rotate(90deg)}
.sec>summary{font-size:1.2rem;padding:8px 0}
.dom>summary{font-size:1rem;color:var(--mute);padding:6px 0 6px 4px}
.dom{margin-left:4px}
.topic{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin:8px 0}
.topic h3{margin:0 0 6px;font-size:1rem}
.row{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--line);flex-wrap:wrap}
.row:first-of-type{border-top:0}
.row .n{flex:1;min-width:6rem}
.row small{color:var(--mute)}
a.b{display:inline-block;padding:7px 12px;border-radius:8px;text-decoration:none;font-size:.9rem;border:1px solid var(--acc);color:var(--acc)}
a.k{border-color:var(--acc2);color:var(--acc2)}
a.b:active{opacity:.6}
.hide{display:none!important}
.empty{color:var(--mute);padding:24px 0;text-align:center}
</style>
</head>
<body>
<header><div class="wrap"><div class="top"><h1>SAT Practice</h1><button id="theme" type="button" aria-label="Toggle dark mode"></button></div><input id="q" type="search" placeholder="Search topics… (e.g. circles, transitions)" autocomplete="off"></div></header>
<main class="wrap" id="app"></main>
<script>
const DATA=${JSON.stringify(data).replace(/</g, '\\u003c')};
const LINKS=${JSON.stringify(links).replace(/</g, '\\u003c')};
const vocab=()=>'<details class="sec" open><summary>Vocabulary</summary><div class="topic" data-t="vocabulary vocab words flashcards '+esc(LINKS.map(l=>l.title+' '+l.note).join(' ').toLowerCase())+'">'+LINKS.map(l=>'<div class="row"><span class="n">'+esc(l.title)+' <small>'+esc(l.note)+'</small></span><a class="b" href="'+esc(l.url)+'" target="_blank" rel="noopener">Open</a></div>').join('')+'</div></details>';
const mb=b=>b>=1048576?(b/1048576).toFixed(1)+' MB':Math.round(b/1024)+' KB';
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const app=document.getElementById('app');
app.innerHTML=vocab()+DATA.map(s=>\`<details class="sec" open><summary>\${esc(s.section)}</summary>\${s.domains.map(d=>\`<details class="dom" open><summary>\${esc(d.domain)}</summary>\${d.topics.map(t=>\`<div class="topic" data-t="\${esc((t.topic+' '+d.domain+' '+s.section).toLowerCase())}"><h3>\${esc(t.topic)}</h3>\${t.items.map(i=>\`<div class="row"><span class="n">Set \${esc(i.set)} <small>\${mb(i.size)}</small></span><a class="b" href="\${i.pdf}" target="_blank" rel="noopener">Questions</a>\${i.key?\`<a class="b k" href="\${i.key}" target="_blank" rel="noopener">Answer key</a>\`:''}</div>\`).join('')}</div>\`).join('')}</details>\`).join('')}</details>\`).join('')+'<div class="empty hide" id="none">No matches.</div>';
const tb=document.getElementById('theme');
const cur=()=>document.documentElement.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
const label=()=>{tb.textContent=cur()==='dark'?'Light mode':'Dark mode'};
label();
tb.addEventListener('click',()=>{const n=cur()==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',n);try{localStorage.setItem('theme',n)}catch(e){}label()});
const q=document.getElementById('q');
q.addEventListener('input',()=>{
  const v=q.value.trim().toLowerCase();let any=false;
  app.querySelectorAll('.topic').forEach(e=>{const m=!v||e.dataset.t.includes(v);e.classList.toggle('hide',!m);any=any||m});
  app.querySelectorAll('.dom,.sec').forEach(e=>{e.classList.toggle('hide',!e.querySelector('.topic:not(.hide)'))});
  document.getElementById('none').classList.toggle('hide',any);
});
</script>
</body>
</html>`;

writeFileSync(join(ROOT, 'index.html'), html);
const n = data.flatMap(s => s.domains.flatMap(d => d.topics.flatMap(t => t.items))).length;
console.log(`index.html written: ${n} practice PDFs, ${usedKeys.size} matched answer keys, ${orphanKeys.length} unmatched keys`);
if (orphanKeys.length) console.log('Unmatched keys:\n' + orphanKeys.join('\n'));
