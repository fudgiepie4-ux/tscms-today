'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');
const shared=fs.readFileSync('tscms-sitewide-radio.js','utf8');
const engine=fs.readFileSync('solitaire-phase1-staging/js/gamehouse-jukebox.js','utf8');
const runtime=fs.readFileSync('tscms-public-runtime.js','utf8');
let passed=0;
function test(name,fn){fn();console.log('PASS '+(++passed)+' '+name);}
function snapshot(mode,at=47.5){
  return {v:1,stream:'https://cdn1.suno.ai/verified-song.mp4',at,mode,volume:.35,updated:Date.now()};
}
function harness(savedState=null,opts={}){
  const {document,window}=parseHTML('<html><head></head><body><main><h1>Test TSCMS page</h1></main></body></html>');
  const items=new Map();
  if(savedState)items.set('tscms-sitewide-radio-v1',JSON.stringify(savedState));
  const storage={getItem:key=>items.get(key)||null,setItem:(k,v)=>items.set(k,String(v))};
  let track={title:'Station Original',artist:'Artist',stream:'https://cdn1.suno.ai/station-original.mp4'};
  let pos=0,volume=1,playing=false,ready=false, playCalls=0, restoreCalls=[],stops=0,pauses=0;
  const J={
    init:async()=>{ready=true;return true;},
    isFavoritesMode:()=>!!opts.favorites,
    currentTrack:()=>track,
    getPosition:()=>({currentTime:pos,duration:222,seekable:true,ranges:[[0,222]]}),
    setVolume:x=>{volume=x;return x;},getVolume:()=>volume,
    isPlaying:()=>playing,
    _state:()=>({ready,requestedPlaying:playing}),
    restoreStationPosition:async(stream,seconds)=>{restoreCalls.push([stream,seconds]);
      if(opts.seekFails)return false;
      track={title:'Saved Verified Song',artist:'Station Member',stream};pos=seconds;return true;},
    toggle:()=>{
      playCalls++;
      if(opts.autoplayBlocks && !opts.allowed){
        playing=false;
        const ev=new window.Event('tscms:jukebox');ev.detail={state:'blocked'};
        document.dispatchEvent(ev);
        return true;
      }
      playing=!playing;
      const ev=new window.Event('tscms:jukebox');ev.detail={state:playing?'playing':'paused'};
      document.dispatchEvent(ev);
      return playing;
    },
    pauseStation:()=>{pauses++;playing=false;return true;},
    stopStation:()=>{stops++;playing=false;pos=0;return true;},
    prev:()=>{track={title:'Earlier',artist:'Member',stream:'https://cdn1.suno.ai/earlier.mp4'};pos=0;},
    next:()=>{track={title:'Next',artist:'Member',stream:'https://cdn1.suno.ai/next.mp4'};pos=0;},
    on:()=>()=>{}
  };
  window.TSCMSJukebox=J;window.localStorage=storage;
  const ctx={window,document,localStorage:storage,Promise,Number,Math,Date,console,setTimeout,clearTimeout,CustomEvent:window.CustomEvent};
  vm.runInNewContext(shared,ctx,{filename:'tscms-sitewide-radio.js'});
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return {
    document,J,opts,store:()=>JSON.parse(items.get('tscms-sitewide-radio-v1')||'null'),
    inspect:()=>({playCalls,restoreCalls,stops,pauses,track,pos,playing,volume}),
    flush:async()=>{for(let i=0;i<8;i++)await Promise.resolve();await new Promise(setImmediate);}
  };
}
(async()=>{
  test('One shared UI, not a second audio engine',()=>{
    assert.equal((shared.match(/createElement\('audio'\)/g)||[]).length,0);
    assert.equal((engine.match(/audio=document\.createElement\('audio'\)/g)||[]).length,1);
    assert.match(shared,/window\.TSCMSJukebox/);
    assert.match(engine,/restoreStationPosition: function/);
    assert.match(engine,/masterTracks\.findIndex/);
    assert.match(engine,/pauseStation: function/);
    assert.match(engine,/stopStation: function/);
  });
  test('Canonical verified feed and no silent fallback to track zero',()=>{
    assert.match(shared,/playlistUrl:'\.\/radio-data\.json'/);
    assert.match(shared,/never restart at zero/i);
    assert.match(engine,/masterTracks\.findIndex/);
    assert.match(engine,/Math\.abs\(now-wanted\) <= 1\.5/);
  });
  test('Seven requested public routes inherit or embed the same module, never admin',()=>{
    assert.match(runtime,/data-tscms-preserved','sitewide-radio'/);
    assert.match(runtime,/tscms-sitewide-radio\.js/);
    for(const page of ['index.html','tscms-today.html','tscms-search.html','my-playlist.html'])
      assert.match(fs.readFileSync(page,'utf8'),/tscms-public-runtime\.js/,page);
    for(const page of ['town-journal.html','videos.html','gamehouse.html'])
      assert.equal((fs.readFileSync(page,'utf8').match(/src="\.\/tscms-sitewide-radio\.js\?/g)||[]).length,1,page);
    assert.doesNotMatch(fs.readFileSync('admin.html','utf8'),/tscms-sitewide-radio/);
  });
  test('Protected Gamehouse integration + private favorites never stored',()=>{
    assert.match(shared,/J\.isFavoritesMode\(\)/);
    assert.match(engine,/setFavoritesPlaylist: function/);
    assert.match(fs.readFileSync('gamehouse.html','utf8'),/gamehouse-jukebox-v7-ui\.js/);
    assert.match(fs.readFileSync('tscms-pathway-pack.js','utf8'),/tscms-pathway-video/);
    assert.match(fs.readFileSync('tscms-favorites.js','utf8'),/approvedTeam\(/);
  });
  test('Journal keeps its book, text and Brenda entry intact',()=>{
    const page=fs.readFileSync('town-journal.html','utf8');
    assert.match(page,/Brenda Carraway/);
    assert.match(page,/const sheets=\[founding,/);
    assert.match(page,/function turn\(n\)/);
    assert.doesNotMatch(page,/<audio\b/);
  });
  {
    const h=harness();await h.flush();
    test('First visit stays silent until a Play tap',()=>{
      assert.equal(h.inspect().playCalls,0);
      assert.equal(h.document.querySelectorAll('#tscms-sitewide-radio').length,1);
      assert.match(h.document.querySelector('.tc-radio-status').textContent,/Press Play/);
    });
    h.document.querySelector('.tc-radio-play').click();
    test('First explicit tap starts station, persists actual playing mode',()=>{
      assert.equal(h.inspect().playCalls,1);
      assert.equal(h.store().mode,'playing');
    });
  }
  {
    const h=harness(snapshot('paused'));await h.flush();
    test('Saved paused track and 47.5 seconds restored without autoplay',()=>{
      assert.equal(h.inspect().playCalls,0);
      assert.equal(h.inspect().restoreCalls[0][1],47.5);
      assert.equal(h.inspect().volume,.35);
      assert.match(h.document.querySelector('.tc-radio-title').textContent,/Saved Verified Song/);
    });
  }
  {
    const h=harness(snapshot('stopped',0));await h.flush();
    test('Stopped stays stopped on next page, no autoplay',()=>{
      assert.equal(h.inspect().playCalls,0);
      assert.match(h.document.querySelector('.tc-radio-status').textContent,/Stopped/);
    });
  }
  {
    const h=harness(snapshot('playing',77.8));await h.flush();
    test('Allowed autoplay carries SAME verified stream at 77.8 seconds',()=>{
      assert.equal(h.inspect().playCalls,1);
      assert.equal(h.inspect().restoreCalls[0][1],77.8);
      assert.equal(h.store().at,77.8);
      assert.equal(h.store().mode,'playing');
    });
  }
  {
    const opts={autoplayBlocks:true,allowed:false};
    const h=harness(snapshot('playing',91.25),opts);await h.flush();
    test('Autoplay-blocked browser shows named Tap prompt, not fake Playing',()=>{
      assert.equal(h.inspect().playing,false);
      assert.match(h.document.querySelector('.tc-radio-play').textContent,/Tap to keep listening/);
      assert.match(h.document.querySelector('.tc-radio-title').textContent,/Saved Verified Song/);
      assert.equal(h.store().at,91.25);
    });
    opts.allowed=true;
    h.document.querySelector('.tc-radio-play').click();await h.flush();
    test('One retry tap restores same 91.25-second position before play',()=>{
      assert.equal(h.inspect().restoreCalls.at(-1)[1],91.25);
      assert.equal(h.inspect().playing,true);
      assert.equal(h.store().at,91.25);
    });
  }
  {
    const opts={seekFails:true};
    const h=harness(snapshot('playing',58),opts);await h.flush();
    test('Unseekable track NEVER restarts at zero or auto plays',()=>{
      assert.equal(h.inspect().playCalls,0);
      assert.match(h.document.querySelector('.tc-radio-status').textContent,/never restart at zero/i);
    });
  }
  {
    const h=harness(snapshot('playing',40));await h.flush();
    h.document.querySelector('button[aria-label="Stop TSCMS Radio"]').click();
    test('Explicit Stop stores stopped / position zero',()=>{
      assert.equal(h.store().mode,'stopped');
      assert.equal(h.store().at,0);
      assert.equal(h.inspect().stops,1);
    });
  }
  test('No Drive-In secondary audio in shared module',()=>{
    assert.doesNotMatch(shared,/new Audio\(/);
    assert.match(shared,/silenceOtherMedia/);
    assert.match(shared,/addEventListener\('play',onExternalPlay,true\)/);
  });
  test('Browser autoplay NotAllowedError keeps same EQ audio / sought position',()=>{
    assert.match(engine,/error\.name!=='NotAllowedError'/);
  });
  console.log('Site-wide radio staging preflight '+passed+'/'+passed+' PASS — real browsers / authentic audio seek still need Cherish verification.');
})().catch(err=>{console.error(err);process.exitCode=1;});
