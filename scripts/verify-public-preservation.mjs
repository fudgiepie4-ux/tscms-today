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
const homeDubbyJs=read('tscms-home-dubby.js');
const homeDubbyCss=read('tscms-home-dubby.css');
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
  assert(label+' → dynamic stats and Dubby insertion anchors',count(s,/class=["']stats["']/g)===1&&count(s,/class=["']yt-banner["']/g)===1&&count(s,/class=["']feat["']/g)===1&&/<h1 class=["']slab["']>Today in/.test(s));
}
assert('Gamehouse Play Now + PUBLIC gold styles in safe CSS',/\.saloon-playnow\{/.test(siteCss)&&/\.tscms-site-tab\{/.test(siteCss));
assert('Quick Jump drawer + Home/Gamehouse routes',/tscms-qj-drawer/.test(quickJs)&&/href:'gamehouse\.html'/.test(quickJs)&&/tscms-qj-drawer/.test(quickCss));
assert('Personal Note letter preserved in external public runtime',/tscms-personal-note/.test(runtime)&&/tnLetter/.test(runtime));
assert('Dicey protected runtime intact',/diceCount/.test(runtime)&&/dicePool/.test(runtime));
const diceSkin=read('tscms-dicey-autumn-v3.css');
const diceLogic=read('tscms-dicey-autumn-v3.js');
assert('Dicey standalone style + code preserved',
  /dicey-autumn-v3/.test(diceSkin)&&/dicey-v3-cards/.test(diceSkin)&&
  /dicey-v3-visit/.test(diceSkin)&&/TSCMSDiceyUpgrade/.test(diceLogic));
assert('Dicey isolated loaders retained in protected runtime',
  /data-dicey-v3-css/.test(runtime)&&/data-dicey-v3-js/.test(runtime)&&
  /TSCMSDiceyUpgrade\.roll\(dicePool/.test(runtime));
assert('Dicey single Facebook action with full text and new-tab safety',
  /'❤️ VISIT FACEBOOK POST'/.test(diceLogic)&&
  /link\.href=p\.post_url/.test(diceLogic)&&/noopener noreferrer/.test(diceLogic)&&
  !/createElement\(['"]audio['"]\)/.test(diceLogic));
assert('Dicey outcome-first crypto + distinct doubles retained',
  /cryptoSource\.getRandomValues/.test(diceLogic)&&
  /doublesFaces=\[dieFace\(\),dieFace\(\)\]/.test(diceLogic)&&
  /selectSongs\(pool,doubles\?2:1/.test(diceLogic)&&
  /used\.add\(voice\)/.test(diceLogic));

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

/* Homepage enhancements live in independent protected files so regenerated daily
   HTML cannot erase them. These tests guard wiring, assets, links, and failover. */
function validAsset(name,minBytes) {
  try {
    const info=fs.statSync(path.join(root,name));
    return info.isFile()&&info.size>=minBytes;
  } catch(e) {return false;}
}
assert('Autumn navigation artwork safely present',
  validAsset('assets/tscms-autumn-public-links.webp',100000));
assert('Autumn artwork + guarded fallback in Quick Jump',
  /var artwork='assets\/tscms-autumn-public-links\.webp'/.test(quickJs)&&
  /preflight\.onload/.test(quickJs)&&/preflight\.onerror/.test(quickJs)&&
  /tscms-autumn-nav-ready/.test(quickJs));
assert('Autumn navigation has all five clickable destinations',
  /hotspot\('button','quick'/.test(quickJs)&&
  /hotspot\('a','group'/.test(quickJs)&&
  /hotspot\('a','youtube'/.test(quickJs)&&
  /hotspot\('a','public'/.test(quickJs)&&
  /hotspot\('a','game'/.test(quickJs)&&
  /www\.facebook\.com\/share\/g\/1HhNCD6FSS\//.test(quickJs)&&
  /www\.facebook\.com\/share\/19z71PkNja\//.test(quickJs)&&
  /www\.youtube\.com\/@TSCMSLive/.test(quickJs));
assert('Home statistics and Sponsor TV boot once via protected Quick Jump file',
  count(quickJs,/data-tscms-preserved','home-dubby-style'/g)===1&&
  count(quickJs,/data-tscms-preserved','home-dubby'/g)===1&&
  /tscms-home-dubby\.css/.test(quickJs)&&/tscms-home-dubby\.js/.test(quickJs)&&
  /style\.onload/.test(quickJs)&&/style\.onerror/.test(quickJs));
assert('Stats relocated intact above YouTube and sponsor takes original spot',
  /stats\.parentNode\.insertBefore\(sponsor, stats\)/.test(homeDubbyJs)&&
  /youtube\.parentNode\.insertBefore\(stats, youtube\)/.test(homeDubbyJs)&&
  /stats\.classList\.add\('tscms-home-stats'\)/.test(homeDubbyJs)&&
  /stats\.tscms-home-stats/.test(homeDubbyCss));
assert('Home stats remain dynamic, with three small evenly spaced tiles',
  !/SONGS TODAY[\s\S]{0,70}267/.test(homeDubbyJs)&&
  /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/.test(homeDubbyCss)&&
  /tscms-home-stats \.stat \.v/.test(homeDubbyCss));
assert('Dubby promotional poster and original video backed by repository assets',
  validAsset('public-assets/dubby-poster.jpg',10000)&&
  validAsset('public-assets/dubby-promo.mp4',1000000)&&
  /public-assets\/dubby-poster\.jpg/.test(homeDubbyJs)&&
  /public-assets\/dubby-promo\.mp4/.test(homeDubbyJs));
assert('Dubby referral link, coupon, disclosure and accessible playback controls',
  /https:\/\/www\.dubby\.gg\/discount\/TSCMSLIVE\?ref=xdejzekt/.test(homeDubbyJs)&&
  /Save 10%/.test(homeDubbyJs)&&/TSCMSLIVE/.test(homeDubbyJs)&&
  /Affiliate partner/.test(homeDubbyJs)&&
  /data-dubby-action="play"/.test(homeDubbyJs)&&
  /data-dubby-action="pause"/.test(homeDubbyJs)&&
  /data-dubby-action="stop"/.test(homeDubbyJs)&&
  /pauseOtherMedia/.test(homeDubbyJs)&&/preload="metadata"/.test(homeDubbyJs));
assert('Dubby independent CSS and control styles preserved',
  /tscms-home-dubby/.test(homeDubbyCss)&&
  /tscms-dubby-actions/.test(homeDubbyCss)&&
  /tscms-dubby-shop/.test(homeDubbyCss));

for(const [name,source] of [['tscms-muse-referral.js',museJs],['tscms-public-runtime.js',runtime],['tscms-quick-jump.js',quickJs],['tscms-home-dubby.js',homeDubbyJs]]) {
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
