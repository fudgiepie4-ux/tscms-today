'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const read=f=>fs.readFileSync(f,'utf8');
let n=0;
const test=(name,fn)=>{fn();console.log('PASS '+(++n)+' '+name);};
const video=read('videos.html'),search=read('tscms-search.js'),runtime=read('tscms-public-runtime.js');
const index=read('index.html'),admin=read('admin.html'),mc=read('mc.js');
const game=read('gamehouse.html'),help=read('gamehouse-help.js');
const dual=read('tscms-admin-dual.js'),searchPage=read('tscms-search.html'),playlist=read('my-playlist.html');
test('VID-02 starts Night Sounds ONLY via explicit control, not page load',()=>{
 const tail=video.slice(video.indexOf("const toggle=document.getElementById('sound-toggle');"));
 assert.match(tail,/toggle\.addEventListener\('click',/);
 assert.match(tail,/if\(wanted && audio\.paused\)\{startNight\(\);\}/);
 assert.match(tail,/toggle\.textContent=!wanted\?'Switch ON':playing\?'Switch OFF':'▶ Start Night Sounds'/);
 assert.doesNotMatch(tail,/document\.addEventListener\('pointerdown'/);
 assert.doesNotMatch(tail,/document\.addEventListener\('keydown'/);
 assert.doesNotMatch(tail,/startNight\(\);\s*\/\/ Browsers/);
 assert.match(video,/use the Night Sounds control to start/);
 assert.doesNotMatch(tail,/tap the page to hear the night/);
});
test('PUB-05 accessible song titles and artists on all homepage cards',()=>{
 assert.match(runtime,/function labelSongButton\(button,playing\)/);
 assert.match(runtime,/document\.querySelectorAll\('\.song \.btn\.play,\.feat \.btn\.play'\)/);
 assert.match(runtime,/\.s-title,\.feat-title/);
 assert.match(runtime,/\.s-by,\.tscms-search-meta/);
 const source=runtime.slice(runtime.indexOf('  function labelSongButton('),runtime.indexOf('  if(document.readyState',runtime.indexOf('  function labelSongButton(')));
 const {document}=parseHTML('<html><body><div class="song"><span class="s-title">Familiar Tune</span><span class="s-by">by Local Artist · 5 comments</span><button class="btn play" data-title="Familiar Tune">▶ PLAY</button></div></body></html>');
 const ctx={document};vm.runInNewContext(source+'this.label=labelSongButton;',ctx);
 const button=document.querySelector('button');
 ctx.label(button,false);assert.equal(button.getAttribute('aria-label'),'Play Familiar Tune by Local Artist');
 ctx.label(button,true);assert.equal(button.getAttribute('aria-label'),'Pause Familiar Tune by Local Artist');
});
test('PUB-05 Search pressed and pause event reset uses same helper',()=>{
 assert.match(search,/play\.dataset\.artist=song\.artist/);
 assert.match(search,/play\.setAttribute\('aria-pressed','false'\)/);
 assert.match(search,/play\.setAttribute\('aria-label','Play '\+song\.title\+' by '\+song\.artist\)/);
 assert.match(runtime,/player\.addEventListener\('pause', function \(\) \{ if \(active\) \{ active\.textContent = '▶ PLAY'; active\.setAttribute\('aria-pressed','false'\); labelSongButton\(active,false\);/);
 assert.match(runtime,/player\.addEventListener\('play', function \(\) \{ if \(active\) \{ active\.textContent = '⏸ PAUSE'; active\.setAttribute\('aria-pressed','true'\); labelSongButton\(active,true\);/);
});
test('Community Pulse never relabels historical totals as current',()=>{
 assert.doesNotMatch(admin,/2026-10-08 to 2026-10-14/);
 assert.doesNotMatch(admin,/>445<\/div>/);
 assert.doesNotMatch(admin,/>1602<\/div>/);
 assert.match(admin,/id="mc-pulse-range"/);
 assert.match(admin,/id="mc-pulse-posts">Data unavailable/);
 assert.match(admin,/id="mc-pulse-comments">Data unavailable/);
 assert.match(mc,/community-pulse-current\.json/);
 assert.match(mc,/data\.window\.start!==start\|\|data\.window\.end!==end/);
 assert.match(mc,/data\.days\.length!==7/);
 assert.match(mc,/Date\.now\(\)-Date\.parse\(data\.generated\)>48\*3600000/);
 assert.match(mc,/Number\.isSafeInteger\(day\.posts\)/);
 assert.match(mc,/Number\.isSafeInteger\(day\.comments\)/);
 assert.match(mc,/No historical totals or fabricated zeros/);
});
test('GH-01 locked overlay gameplay buttons have explicit accessible names',()=>{
 for(const [id,label] of [
 ['btn-undo','Undo last move'],['btn-hint','Show a Solitaire hint'],
 ['btn-pause','Pause Solitaire game'],['btn-newgame','Start a new Solitaire game']]){
 assert.match(game,new RegExp('id="'+id+'" type="button" aria-label="'+label+'"'));
 }
 assert.match(game,/data-tscms-legibility-fixed="game-board"/);
 assert.match(game,/TSCMS_APPROVED_MASTER_DOWNLOAD\.png/);
});
test('GH-02 fuller HOW TO PLAY is accessible outside settings but reuses dialog',()=>{
 assert.match(help,/panel\.appendChild\(button\)/);
 assert.match(help,/quick\.id='gamehouse-help-quick'/);
 assert.match(help,/document\.body\.appendChild\(quick\)/);
 assert.match(help,/quick\.addEventListener\('click', open\)/);
 assert.match(help,/button\.addEventListener\('click', open\)/);
 assert.match(help,/assets\/Gamehouse_Help_Preview\.png/);
});
test('ADM-04 creation-time sort oldest first with stable ties',()=>{
 assert.match(dual,/const creationMs=profile=>/);
 assert.match(dual,/timestamp\.toMillis\(\)/);
 assert.match(dual,/creationMs\(a\)-creationMs\(b\) \|\| a\.id\.localeCompare\(b\.id\)/);
 assert.match(dual,/APPROVE /);
 assert.match(dual,/REJECT /);
 assert.match(dual,/status to APPROVED, sets admin=true/);
 assert.match(dual,/status to REJECTED and admin=false/);
 assert.match(dual,/does NOT delete their account/);
 assert.match(dual,/window\.confirm\(consequences\)/);
 assert.match(dual,/getDocs\(collection\(db,"users"\)\)/);
});
test('Larger Text CSS and operational JS are included on Search and My Playlist',()=>{
 for(const [page,html] of [['Search',searchPage],['My Playlist',playlist]]){
 assert.match(html,/tscms-legibility\.css\?v=wave-20261022/,page);
 assert.match(html,/tscms-legibility\.js\?v=wave-20261022/,page);
 assert.equal((html.match(/tscms-legibility\.js\?v=/g)||[]).length,1,page);
 }
 const rule=read('tscms-legibility.js');
 assert.match(rule,/toggle\.addEventListener\('click',\(\)=>setEnabled\(!enabled\)\)/);
});
test('ADM-05 session-only checkmarks are explicitly explained',()=>{
 assert.match(admin,/Checkmarks last only for your current session; they reset when that session ends/);
 assert.match(mc,/sessionStorage\.getItem\('dz_done'\)/);
 assert.match(mc,/sessionStorage\.setItem\('dz_done'/);
 assert.match(admin,/It does not fetch new Facebook data/);
});
test('Combined runtime keeps PR33 radio and Spotlight plus PR34 accessible labels',()=>{
 assert.match(runtime,/function labelSongButton\(button,playing\)/);
 assert.match(runtime,/tscms-sitewide-radio\.js\?v=20261023-lefttab2/);
 assert.match(runtime,/css\.setAttribute\('data-tscms-preserved','sitewide-radio-style'\)/);
 assert.match(runtime,/js\.setAttribute\('data-tscms-preserved','sitewide-radio'\)/);
 assert.match(runtime,/if\(!spotlightWrap && !mostLoved\)return;/);
 assert.match(runtime,/else if\(spotlightWrap\)spotlightWrap\.appendChild\(section\)/);
 assert.match(game,/tscms-sitewide-radio\.js/);
 assert.match(video,/tscms-sitewide-radio\.js/);
 assert.match(video,/if\(wanted && audio\.paused\)\{startNight\(\);\}/);
 assert.match(runtime,/labelSongButton\(active,true\)/);
});
test('Protected functionality and real sources remain installed',()=>{
 assert.match(index,/tscms-quick-jump\.js/);
 assert.match(index,/tscms-feedback\.js/);
 assert.match(game,/gamehouse-jukebox-v7-ui\.js/);
 assert.match(game,/gamehouse-radio-table-remote\.js/);
 assert.match(searchPage,/tscms-favorites\.js/);
 assert.match(playlist,/tscms-favorites\.js/);
 assert.match(video,/TSCMS Drive-In Submission/);
 assert.match(admin,/mc-danger-list/);
});
new vm.Script(runtime);new vm.Script(search);new vm.Script(help);new vm.Script(mc);
console.log('All '+n+'/'+n+' seven-item audit-wave staging assertions PASS. Current Pulse verified source ingestion and real phone QA remain gates.');
