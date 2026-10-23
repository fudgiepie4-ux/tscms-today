'use strict';
/* Listening Room Gate A: precise code gate plus signed-in DOM behavior tests.
   Fixture only. No real Firebase login, server mutation, or live web access. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');
const read=f=>fs.readFileSync(f,'utf8');
const html=read('my-playlist.html'),css=read('tscms-listening-room.css');
const src=read('tscms-favorites.js'),core=read('tscms-favorites-core.mjs');
const report=(label,fn)=>{fn();console.log('PASS '+label);};
report('Approved photo-art layout, real text, radio untouched, Larger Text retained',()=>{
 for(const needle of ['tc-room-art','tc-fav-playlist-root','tc-fav-playlist-list','tc-fav-playlist-message','tc-fav-crate-count','tc-room-search','tc-room-sort','tc-room-action-holder',
   'tscms-public-runtime.js','tscms-legibility.js?v=wave-20261022','tscms-favorites.js'])assert.ok(html.includes(needle),needle);
 assert.match(html,/src=".\/assets\/listening-room-crate-filled.svg"/);
 assert.match(html,/src=".\/assets\/listening-room-crate-empty.svg"/);
 assert.match(html,/id="tc-fav-crate-count" class="tc-room-plaque" hidden/);
 assert.doesNotMatch(html,/class="tc-fav-row|class="tc-fav-heart|class="tc-fav-door|<audio|bottom.console/i);
 assert.ok(read('assets/listening-room-crate-filled.svg').includes('upright-vinyl'));
 assert.ok(!read('assets/listening-room-crate-empty.svg').includes('upright-vinyl'));
 assert.match(css,/\.tc-room-plaque\[hidden\]\{display:none\}/);
 assert.match(css,/@media\(max-width:560px\)/);
 assert.match(css,/@media\(max-width:380px\)/);
});
report('Auth, data keys, existing player and official station untouched',()=>{
 assert.match(core,/TEAM_ONLY = true/);
 assert.match(src,/if\(!approvedTeam\(user,profile\)\)\{revokeView\(\);return;\}/);
 assert.match(src,/onSnapshot\(collection\(db,'users',user.uid,'favorites'\)/);
 assert.match(src,/function sync\(\)\{if\(!signedIn\(\)\)return;/);
 assert.match(src,/const playAll=document.createElement\('button'\);playAll.type='button';playAll.className='tc-fav-mode';playAll.textContent='▶ Play All';playAll.addEventListener\('click',\(\)=>playSequence\(\)\);root.append\(playAll\);/);
 assert.match(src,/playSong\(song,button,row\|\|null\)/);
 assert.match(src,/window\.dayPlay\(button\)/);
 assert.doesNotMatch(src,/createElement\(['"]audio['"]\)/);
 assert.match(src,/setDoc\(doc\(db,'users',STATE.uid,'favorites',id\)/);
 assert.match(src,/deleteDoc\(doc\(db,'users',STATE.uid,'favorites',found.id\)\)/);
});
const {window:domWindow,document}=parseHTML(html);
const window={Event:domWindow.Event,CustomEvent:domWindow.CustomEvent,addEventListener:()=>{},innerHeight:800};
let played=[],authCallback;
const fakeSongs=[
 {id:'z',title:'Zebra Roads',artist:'Blue Sky',play_url:'https://cdn1.suno.ai/z.mp4',savedAt:{seconds:1792780000}},
 {id:'a',title:'Apple Trail',artist:'Zane',play_url:'https://cdn1.suno.ai/a.mp4',savedAt:{seconds:1792770000}},
 {id:'b',title:'Barn at Night',artist:'Alice',play_url:'https://cdn1.suno.ai/b.mp4',savedAt:{seconds:1792760000}}
];
window.dayPlay=b=>played.push(b.dataset.stream);
window.addEventListener=()=>{};
window.crypto={getRandomValues:array=>{array[0]=1;return array;}};
const ctx={
 document,window,
 crypto:window.crypto,
 URL,Intl,Date,Map,Set,Promise,Uint32Array,CustomEvent:window.CustomEvent,
 MutationObserver:class{observe(){}},setInterval:()=>0,setTimeout:()=>0,clearTimeout:()=>{},
 requestAnimationFrame:()=>0,console,
 fetch:async path=>{
  if(path.includes('search-index'))return {ok:true,json:async()=>({songs:[
   {play_url:'https://cdn1.suno.ai/z.mp4',post_url:'https://facebook.com/groups/123/permalink/456'},
   {play_url:'https://cdn1.suno.ai/notsaved.mp4',post_url:'https://facebook.com/groups/123/permalink/999'}
  ]})};
  if(path.includes('radio-data'))return {ok:true,json:async()=>({playlist:[
   {stream:'https://cdn1.suno.ai/a.mp4',suno:'https://suno.com/song/appletrail'},
   {stream:'https://cdn1.suno.ai/b.mp4',suno:'javascript:alert(1)'}
  ]})};
  throw Error('Not a permitted public catalog');
 },
 tscmsFirebaseConfig:{},
 getApps:()=>[],getApp:()=>({}),initializeApp:()=>({}),getAuth:()=>({currentUser:null}),
 getFirestore:()=>({}),onAuthStateChanged:(_,cb)=>{authCallback=cb;},
 reload:async()=>{},getIdToken:async()=>{},getDocFromServer:async()=>({exists:()=>false}),
 onSnapshot:()=>()=>{},setDoc:async()=>{},deleteDoc:async()=>{},serverTimestamp:()=>({}),
 collection:()=>({}),doc:()=>({}),
 approvedTeam:()=>true,cleanSong:x=>x,newestFirst:x=>x,artistFromCard:x=>x,songKey:async()=>null,MAX_SAVED:500
};
vm.createContext(ctx);
vm.runInContext(src.replace(/^import .*;\s*$/gm,''),ctx,{filename:'tscms-favorites.js'});
vm.runInContext('STATE.uid="approved-owner"; STATE.ready=true; STATE.items='+JSON.stringify(fakeSongs)+'; sync();',ctx);
const rows=()=>[...document.querySelectorAll('#tc-fav-playlist-list .tc-fav-row')];
report('3 real owner records / count / mockup actions and controls',()=>{
 assert.equal(rows().length,3);
 assert.equal(document.getElementById('tc-fav-crate-count').textContent,'Your crate holds 3 records');
 assert.equal(document.getElementById('tc-room-art-filled').hidden,false);
 assert.equal(document.getElementById('tc-room-art-empty').hidden,true);
 assert.equal(document.getElementById('tc-room-tools').hidden,false);
 assert.equal(document.querySelectorAll('#tc-room-action-holder button').length,2);
 assert.ok(document.getElementById('tc-room-action-holder').textContent.includes('Play My Crate'));
 assert.ok(document.getElementById('tc-room-action-holder').textContent.includes('Shuffle a Record'));
 assert.equal(document.querySelectorAll('.tc-room-more').length,3);
 assert.match(rows()[0].textContent,/Saved Oct/);
});
report('Search and sort use saved records, no public archive results',()=>{
 const input=document.getElementById('tc-room-search'),sort=document.getElementById('tc-room-sort');
 input.value='zane';input.dispatchEvent(new window.Event('input'));
 assert.equal(rows().filter(r=>!r.hidden).length,1);
 assert.equal(rows().find(r=>!r.hidden).dataset.title,'Apple Trail');
 input.value='';input.dispatchEvent(new window.Event('input'));
 sort.value='title';sort.dispatchEvent(new window.Event('change'));
 assert.deepEqual(rows().map(r=>r.dataset.title),['Apple Trail','Barn at Night','Zebra Roads']);
 sort.value='artist';sort.dispatchEvent(new window.Event('change'));
 assert.deepEqual(rows().map(r=>r.dataset.artist),['Alice','Blue Sky','Zane']);
 sort.value='newest';sort.dispatchEvent(new window.Event('change'));
 assert.deepEqual(rows().map(r=>r.dataset.title),fakeSongs.map(s=>s.title));
});
report('Original Play All and Shuffle go through original song player',()=>{
 document.querySelector('#tc-room-action-holder .tc-fav-mode').click();
 assert.equal(played[0],fakeSongs[0].play_url);
 document.querySelector('#tc-room-action-holder .tc-room-shuffle').click();
 assert.equal(played[1],fakeSongs[1].play_url);
});
async function extrasAndRevoke(){
 await vm.runInContext('roomMetadataPending',ctx);
 report('Exactly matched verified links; missing links never fabricated',()=>{
  const z=rows().find(r=>r.dataset.title==='Zebra Roads');
  const a=rows().find(r=>r.dataset.title==='Apple Trail');
  const b=rows().find(r=>r.dataset.title==='Barn at Night');
  assert.equal(z.querySelector('.tc-room-post').getAttribute('href'),'https://facebook.com/groups/123/permalink/456');
  assert.equal(a.querySelector('.tc-room-suno').getAttribute('href'),'https://suno.com/song/appletrail');
  assert.equal(b.querySelector('.tc-room-suno').tagName,'SPAN');
  assert.match(b.querySelector('.tc-room-post').textContent,/unavailable/);
  assert.equal(rows().length,3);
 });
 report('Sign-out hides plaque, input, saved songs, and switches artwork',()=>{
  vm.runInContext('revokeView()',ctx);
  assert.equal(document.getElementById('tc-fav-crate-count').hidden,true);
  assert.equal(document.getElementById('tc-fav-crate-count').textContent,'');
  assert.equal(document.getElementById('tc-room-tools').hidden,true);
  assert.equal(document.querySelectorAll('.tc-fav-row').length,0);
  assert.equal(document.getElementById('tc-room-art-filled').hidden,true);
 });
 report('0 records renders real empty crate and browse door',()=>{
  vm.runInContext('STATE.uid="approved-owner";STATE.ready=true;STATE.items=[];playlist();',ctx);
  assert.equal(document.getElementById('tc-fav-crate-count').textContent,'Your crate holds 0 records');
  assert.match(document.getElementById('tc-fav-playlist-list').textContent,/Your first favorite belongs here/);
  assert.ok(document.querySelector('.tc-room-door[href="./"]'));
 });
 console.log('Listening Room Gate A DOM acceptance checks complete; actual phone/browser visual QA belongs to Cherish.');
}
extrasAndRevoke().catch(e=>{console.error(e);process.exitCode=1;});