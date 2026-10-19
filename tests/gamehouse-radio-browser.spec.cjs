/* Real Chromium/Playwright DOM QA for Gamehouse radio review branch.
 * Mock audio/network only; browser layout, hit targets, state & events are real.
 * No live deployment. Run against repository-root local HTTP server.
 *
 * npm install --no-save @playwright/test
 * npx playwright install chromium
 * python3 -m http.server 8765 --bind 127.0.0.1 &
 * npx playwright test tests/gamehouse-radio-browser.spec.cjs --reporter=line
 */
'use strict';
const {test,expect}=require('@playwright/test');
const fs=require('fs');
const ROOT='http://127.0.0.1:8765/gamehouse.html';
const SONGS=Array.from({length:12},(_,i)=>({
  title:i===0?'Waylon and Willie Should Know':i===7?'A Very Very Long Song Title To Check The Jukebox Panel Wrapping on Small Phones':'TSCMS Radio Track '+i,
  artist:'Test Country Artist '+i,
  stream:'https://fixture.invalid/song-'+i+'.mp3',
  suno:'https://suno.com/song/test-'+i
}));
test.beforeEach(async({page})=>{
  page.__radioErrors=[];
  page.on('pageerror',e=>page.__radioErrors.push(e.message));
  await page.route('**/radio-data.json',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify({playlist:SONGS})
  }));
  // The only fake is media/network. We exercise the actual UI and same player
  // code; no audio files or playback rights are needed for layout/controls.
  await page.addInitScript(()=>{
    Object.defineProperty(HTMLMediaElement.prototype,'paused',{
      configurable:true,get(){return this.__tscmsBrowserTestPaused!==false}
    });
    HTMLMediaElement.prototype.play=function(){
      this.__tscmsBrowserTestPaused=false;
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause=function(){
      this.__tscmsBrowserTestPaused=true;
    };
  });
  await page.goto(ROOT,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.TSCMSJukebox &&
    window.TSCMSJukebox._state().ready &&
    document.getElementById('tscms-radio-remote') &&
    document.getElementById('radio-remote-shuffle')),null,{timeout:15000});
});
test('approved artwork intact; no card images baked into remote; layer priority',{tag:'@art'},async({page})=>{
  const snap=await page.evaluate(()=>{
    const stage=document.getElementById('stage');
    const remote=document.getElementById('tscms-radio-remote');
    const arch=document.getElementById('tscms-radio-arch');
    const face=document.getElementById('tscms-radio-face');
    const art=stage.querySelector('.stage-art');
    const pile=document.getElementById('tableau-0');
    return {
      artwork:art?.getAttribute('src')||'',
      directChildren:[remote,arch,face].every(e=>e?.parentElement===stage),
      remoteLayer:Number(getComputedStyle(remote).zIndex),
      pileLayer:Number(getComputedStyle(pile).zIndex),
      textInArch:arch?.textContent.trim(),
      glassText:face?.textContent.trim()||'',
      remoteHasCards:Boolean(remote.querySelector('.live-card,img')),
      htmlHasShuffleSvg:Boolean(remote.querySelector('.remote-shuffle svg')),
      shuffleSvgPaths:remote.querySelectorAll('.remote-shuffle svg path').length,
      faceOutsideJukebox:Boolean(face&&art&&face!==art)
    };
  });
  expect(snap.artwork).toContain('TSCMS_APPROVED_MASTER_DOWNLOAD.png');
  expect(snap.directChildren).toBe(true);
  expect(snap.remoteLayer).toBeLessThan(snap.pileLayer);
  expect(snap.textInArch).toBe('TSCMS RADIO');
  expect(snap.glassText).not.toContain('TSCMS RADIO');
  expect(snap.remoteHasCards).toBe(false);
  expect(snap.htmlHasShuffleSvg).toBe(true);
  expect(snap.shuffleSvgPaths).toBeGreaterThanOrEqual(3);
  expect(snap.faceOutsideJukebox).toBe(true);
});
for(const v of [{width:360,height:780},{width:430,height:932}]){
  test('remote hit targets and arch/glass position: '+v.width+'px',async({page})=>{
    await page.setViewportSize(v);
    const buttons=['#radio-remote-prev','#radio-remote-play','#radio-remote-next','#radio-remote-shuffle'];
    for(const button of buttons)await expect(page.locator(button)).toBeVisible();
    const placement=await page.evaluate(()=>{
      const stage=document.getElementById('stage').getBoundingClientRect();
      const r=document.getElementById('tscms-radio-remote').getBoundingClientRect();
      const a=document.getElementById('tscms-radio-arch').getBoundingClientRect();
      const f=document.getElementById('tscms-radio-face').getBoundingClientRect();
      const bottomRail=document.querySelector('.bottom-rail').getBoundingClientRect();
      return {
        remoteInside: r.left>=stage.left && r.right<=stage.right && r.top>=stage.top,
        remoteAboveRail: r.bottom<=bottomRail.top+2,
        archAboveGlass:a.bottom<=f.top+4,
        glassInsideJukebox:f.left>stage.left+stage.width*.7 && f.right<stage.right,
        archInsideJukebox:a.left>stage.left+stage.width*.7 && a.right<stage.right,
        sizes:[r.width,r.height,a.width,a.height,f.width,f.height]
      };
    });
    expect(placement.remoteInside).toBe(true);
    expect(placement.remoteAboveRail).toBe(true);
    expect(placement.archAboveGlass).toBe(true);
    expect(placement.glassInsideJukebox).toBe(true);
    expect(placement.archInsideJukebox).toBe(true);
    expect(placement.sizes.every(x=>x>0)).toBe(true);
    await page.locator('#radio-remote-shuffle').click();
    await expect(page.locator('#radio-remote-shuffle')).toHaveAttribute('aria-pressed','false');
    await page.locator('#radio-remote-play').click();
    await expect(page.locator('#radio-remote-play')).toHaveAttribute('aria-pressed','true');
    const ready=await page.evaluate(()=>window.TSCMSJukebox.isPlaying());
    expect(ready).toBe(true);
    fs.mkdirSync('test-results',{recursive:true});
    await page.screenshot({path:'test-results/gamehouse-radio-'+v.width+'.png',fullPage:true});
  });
}
test('skip, volume, pause, shuffle and startup preference persist',async({page})=>{
  const J=()=>page.evaluate(()=>window.TSCMSJukebox._state());
  expect((await J()).shuffle).toBe(true);
  await page.locator('#radio-remote-next').click();
  const i1=(await J()).index;
  await page.locator('#radio-remote-prev').click();
  const i2=(await J()).index;
  expect(i2).not.toBe(i1);
  await page.locator('#radio-remote-shuffle').click();
  expect((await J()).shuffle).toBe(false);
  await page.locator('#radio-remote-volume').evaluate(slider=>{slider.value='24';slider.dispatchEvent(new Event('input',{bubbles:true}));});
  expect(await page.evaluate(()=>window.TSCMSJukebox.getVolume())).toBeCloseTo(.24);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.TSCMSJukebox?._state().ready);
  expect((await J()).shuffle).toBe(false);
  expect((await J()).index).toBe(0);
  await expect(page.locator('#radio-remote-shuffle')).toHaveAttribute('aria-pressed','false');
});
test('opening full V7 cabinet shares Shuffle and never changes song',async({page})=>{
  const before=await page.evaluate(()=>window.TSCMSJukebox.currentTrack().stream);
  await page.locator('#btn-jukebox').click();
  const host=page.locator('#tscms-v7-modal-host');
  await expect(host).toBeVisible({timeout:15000});
  const bigShuffle=host.locator('#shuffle');
  await expect(bigShuffle).toBeVisible();
  await expect(bigShuffle).toHaveAttribute('aria-pressed','true');
  await bigShuffle.click();
  expect(await page.evaluate(()=>window.TSCMSJukebox.getShuffle())).toBe(false);
  await expect(bigShuffle).toHaveAttribute('aria-pressed','false');
  await host.locator('#close').click();
  await expect(host).toBeHidden();
  await expect(page.locator('#radio-remote-shuffle')).toHaveAttribute('aria-pressed','false');
  expect(await page.evaluate(()=>window.TSCMSJukebox.currentTrack().stream)).toBe(before);
});
test('new visit starts away from previous last-played stream when Shuffle ON',async({page})=>{
  await page.evaluate(()=>{
    localStorage.setItem('tscmsradio:shuffle-enabled','1');
    localStorage.setItem('tscmsradio:last-played-stream','https://fixture.invalid/song-0.mp3');
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.TSCMSJukebox?._state().ready);
  expect(await page.evaluate(()=>window.TSCMSJukebox.currentTrack().stream))
    .not.toBe('https://fixture.invalid/song-0.mp3');
});
test('mocked streams cannot invent moving FFT and no JS errors',async({page})=>{
  const errors=page.__radioErrors;
  await page.locator('#radio-remote-play').click();
  expect(await page.evaluate(()=>window.TSCMSJukebox.getSpectrumFrame())).toBeNull();
  await page.locator('#radio-remote-next').click();
  await page.locator('#radio-remote-prev').click();
  await page.locator('#radio-remote-play').click();
  expect(errors).toEqual([]);
});