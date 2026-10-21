#!/usr/bin/env node
/* TSCMS protected-features pre-publish gate — owner approved 2026-10-20.
   Run AFTER the generated HTML is built but BEFORE any GitHub publish/push:
      node scripts/verify-public-preservation.mjs [build-directory]
   A nonzero exit status is a BLOCKER: report the failed feature by name.
   Keep this script and the protected feature source files outside generated HTML.
   Cherish maintains the registry; Fudgie approves changes to it. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] || path.join(scriptDir,'..'));
let failures = [], passed = 0;
function read(name) {
  try { return fs.readFileSync(path.join(root,name),'utf8'); }
  catch(e) {failures.push(name+': required protected source missing');return '';}
}
function assert(label,ok) {
  if(ok) {passed++;console.log('PASS '+label);}
  else {failures.push(label);console.error('BLOCK '+label);}
}
function count(s,re) {return (s.match(re)||[]).length;}
const index=read('index.html');
const today=read('tscms-today.html');
const runtime=read('tscms-public-runtime.js');
const siteCss=read('site.css');
const quickJs=read('tscms-quick-jump.js');
const quickCss=read('tscms-quick-jump.css');
const feedback=read('tscms-feedback.js');
const siteJs=read('site.js');
const game=read('gamehouse.html');
const museJs=read('tscms-muse-referral.js');
const museCss=read('tscms-muse-referral.css');
const pages=[['index.html',index],['tscms-today.html',today]];
for(const [label,s] of pages) {
  assert(label+' → public runtime exactly once',count(s,/<script\b[^>]*src=["']tscms-public-runtime\.js(?:\?[^"']*)?["']/g)===1);
  assert(label+' → Quick Jump exactly once',count(s,/<script\b[^>]*src=["']tscms-quick-jump\.js(?:\?[^"']*)?["']/g)===1);
  assert(label+' → Feedback exactly once',count(s,/<script\b[^>]*src=["']tscms-feedback\.js(?:\?[^"']*)?["']/g)===1);
  assert(label+' → site styles exactly once',count(s,/<link\b[^>]*href=["']site\.css(?:\?[^"']*)?["']/g)===1);
  assert(label+' → PLAY NOW Gamehouse entrance',/class=["']saloon-playnow["'][^>]*href=["']gamehouse\.html/.test(s));
  assert(label+' → PUBLIC tab',/class=["']tscms-site-tab is-active["']/.test(s));
  assert(label+' → song day tabs',/class=["']tabs["']/.test(s)&&/id=["']day-0["']/.test(s));
  assert(label+' → protected footer anchor',/<footer class=["']mono["']>MADE WITH LOVE FOR THE TSCMS FAMILY/.test(s));
  assert(label+' → public icon links',/favicon-32\.png/.test(s)&&/manifest-public\.json/.test(s));
}
assert('Gamehouse Play Now + PUBLIC gold styles in safe CSS',/\.saloon-playnow\{/.test(siteCss)&&/\.tscms-site-tab\{/.test(siteCss));
assert('Quick Jump drawer + Home/Gamehouse routes',/tscms-qj-drawer/.test(quickJs)&&/href:'gamehouse\.html'/.test(quickJs)&&/tscms-qj-drawer/.test(quickCss));
assert('Personal Note letter preserved in external public runtime',/tscms-personal-note/.test(runtime)&&/tnLetter/.test(runtime));
assert('Dicey protected runtime intact',/diceCount/.test(runtime)&&/dicePool/.test(runtime));
assert('Monthly Spotlight runtime/markup retained',/tscms-september-spotlight-2026/.test(index)||/tscms-september-spotlight-2026/.test(runtime));
assert('Radio player runtime preserved',/tscms-song-player/.test(runtime)&&/dayPlay/.test(runtime));
assert('Daily song pagination preserved',/song-page-btn/.test(siteJs)&&/window\.showDay/.test(siteJs));
assert('Shared Feedback widget preserved',/tscms-fb-btn/.test(feedback)&&/openModal/.test(feedback));
assert('Gamehouse retains Solitaire/Swiper/Jukebox without extra Feedback widget',/swiper-launch-bootstrap\.js/.test(game)&&/gamehouse-jukebox-v7-ui\.js/.test(game)&&count(game,/src=["']tscms-feedback\.js/g)===1);
assert('Halloween playlist navigation survives',/tscms-halloween-jump/.test(quickJs)&&/tscms-halloween-jump/.test(quickCss));
if(Date.now()<Date.parse('2026-11-01T05:00:00Z')) {
  assert('Halloween pinned favorites protected until Oct 31',/halloween-pin-head/.test(index));
}
assert('Muse card loader exists in protected runtime exactly once',count(runtime,/script\.setAttribute\('data-tscms-preserved', 'muse-referral'\)/g)===1&&/tscms-muse-referral\.js/.test(runtime));
assert('Muse card uses isolated CSS and footer insertion',/tscms-muse-referral\.css/.test(museJs)&&/footer\.insertAdjacentElement\('beforebegin', section\)/.test(museJs));
assert('Muse referral code exact, letter O not zero',/var CODE = '1BZI4O'/.test(museJs)&&!/1BZI40/.test(museJs));
assert('Muse 48-hour and 1-billion-token disclosure',/48 hours of joining/.test(museJs)&&/1 BILLION Muse tokens/.test(museJs));
assert('Muse independent CSS is present',/\.tscms-muse-referral-inner/.test(museCss)&&/\.tscms-muse-copy/.test(museCss));
for(const [name,source] of [['tscms-muse-referral.js',museJs],['tscms-public-runtime.js',runtime],['tscms-quick-jump.js',quickJs]]) {
  let valid=true;
  try {new vm.Script(source,{filename:name});}catch(e){valid=false;}
  assert(name+' JavaScript syntax',valid);
}
if(failures.length) {
 console.error('\nBLOCK DEPLOY: '+failures.length+' missing/broken required feature(s):\n - '+failures.join('\n - '));
 process.exitCode=1;
} else {
 console.log('\nALL '+passed+' protected-feature checks PASS. Eligible for publish, pending independent live verification.');
}
