'use strict';
/* Gate A guard: presentation-only. Tests intentionally do not use live accounts. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('my-playlist.html','utf8');
const css=fs.readFileSync('tscms-listening-room.css','utf8');
const js=fs.readFileSync('tscms-favorites.js','utf8');
const core=fs.readFileSync('tscms-favorites-core.mjs','utf8');
const check=(name,fn)=>{fn();console.log('PASS '+name);};

check('My Playlist carries original runtime, staff gate, and PR34 Larger Text',()=>{
  for(const file of ['tscms-public-runtime.js','tscms-legibility.js?v=wave-20261022','tscms-favorites.js']){
    assert.equal(html.split('src="./'+file+'"').length-1,1,'script '+file);
  }
  assert.match(html,/id="tc-fav-playlist-root"/);
  assert.match(html,/id="tc-fav-playlist-message" role="status" aria-live="polite"/);
  assert.match(html,/id="tc-fav-playlist-list"/);
  assert.match(html,/id="tc-fav-crate-count" class="tc-room-plaque" hidden/);
  assert.doesNotMatch(html,/class="tc-fav-row|class="tc-fav-heart|class="tc-fav-door/);
  assert.match(js,/if\(!approvedTeam\(user,profile\)\)\{revokeView\(\);return;\}/);
  assert.match(js,/if\(!signedIn\(\)\)return;/);
  assert.match(core,/TEAM_ONLY = true/);
});

check('Count comes from approved owner snapshot, plural/singular correct, cleared on revoke',()=>{
  assert.match(js,/STATE\.items=newestFirst\(snapshot\.docs\.map/);
  assert.match(js,/const count=currentCount\(\),plaque=byId\('tc-fav-crate-count'\)/);
  assert.match(js,/Your crate holds '\+count\+' '\+\(count===1\?'record':'records'\)/);
  assert.match(js,/const plaque=byId\('tc-fav-crate-count'\);if\(plaque\)\{plaque\.hidden=true;plaque\.textContent='';\}/);
  assert.match(js,/if\(!count\)\{/);
  assert.match(js,/door\.href='\.\/'/);
  assert.match(js,/empty\.append\(record,title,hint,door\)/);
});

check('Original Play All and per-song playback handlers are byte-for-byte preserved',()=>{
  assert.ok(js.includes("const playAll=document.createElement('button');playAll.type='button';playAll.className='tc-fav-mode';playAll.textContent='▶ Play All';playAll.addEventListener('click',()=>playSequence());root.append(playAll);"));
  assert.ok(js.includes("play.textContent='▶ Play';play.addEventListener('click',()=>void playSong(song,play,row));"));
  assert.match(js,/function playSequence\(\)\{\n  const queue=\[\.\.\.source\(\)\];if\(!queue.length\)return;playlistQueue=queue;/);
  assert.match(js,/window\.dayPlay\(button\)/);
  assert.doesNotMatch(js,/createElement\(['"]audio['"]\)/);
});

check('Favorites ownership and writes remain on original paths',()=>{
  assert.match(js,/collection\(db,'users',user\.uid,'favorites'\)/);
  assert.match(js,/deleteDoc\(doc\(db,'users',STATE\.uid,'favorites',found\.id\)\)/);
  assert.match(js,/setDoc\(doc\(db,'users',STATE\.uid,'favorites',id\)/);
  assert.match(js,/window\.TSCMSJukebox\?\.isFavoritesMode/);
});

check('Styles local to room, do not add audio controls or layout clipping',()=>{
  assert.match(html,/href="\.\/tscms-listening-room\.css"/);
  assert.match(css,/body\.tc-listening-room/);
  assert.match(css,/\.tc-room-plaque\[hidden\]\{display:none\}/);
  assert.match(css,/#tc-fav-playlist-list > \.tc-fav-row/);
  assert.match(css,/@media\(max-width:550px\)/);
  assert.match(css,/@media\(max-width:360px\)/);
  assert.match(css,/min-height:44px/);
  assert.doesNotMatch(css,/\baudio\b|\bvideo\b|\.tscms-sitewide-radio/);
});
console.log('Listening Room Gate A static checks complete; actual phone visual QA pending Cherish.');
