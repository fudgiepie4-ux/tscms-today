/* TSCMS Gamehouse — approved Design B / V7 modal, staging integration only.
 * One audio player: Cherish's v2.1 TSCMSJukebox owns the sole audio element.
 * The archived approved standalone V7 preview is read as inert HTML and only
 * its photographic CABINET subtree and STYLES are reused. No preview scripts,
 * audio tag, test controls or microphone access are ever installed.
 */
(function () {
  'use strict';
  const PREVIEW = 'solitaire-gamehouse-jukebox-DESIGN-B-v7-APPROVED-PREVIEW.html';
  const PLAYLIST = 'radio-data.json';
  const required = ['close','title','artist','trackNum','original','play','previous','next','shuffle',
    'volume','seek','elapsed','duration','equalizer','eqTitle','eqAccess','analysisState','liveLed','status'];
  function init() {
    const trigger = document.getElementById('btn-jukebox');
    const J = window.TSCMSJukebox;
    if (!trigger || !J || trigger.dataset.v7Bound === 'true') return;
    trigger.dataset.v7Bound = 'true';
    trigger.setAttribute('aria-label', 'Open TSCMS Radio jukebox');
    trigger.setAttribute('aria-haspopup','dialog');
    trigger.removeAttribute('aria-pressed');

    let panel = null, ui = null, preparing = null, lastFocus = null;
    let spectrumRaf = 0, lastSpectrumTime = 0, spectrumMode='idle', spriteLevels = Array(35).fill(0);
    function stopSpectrum(){if(spectrumRaf) cancelAnimationFrame(spectrumRaf);spectrumRaf=0;}
    // Direct FFT only. Never invent music-reactive values from timers/randomness.
    function spectrumFrame(t) {
      spectrumRaf=0;
      if(!ui||!panel||panel.hidden||!J.isPlaying())return;
      // 20fps max; reduce expensive canvas redraws on S24.
      if(t-lastSpectrumTime<50){spectrumRaf=requestAnimationFrame(spectrumFrame);return;}
      lastSpectrumTime=t;
      const frame=typeof J.getSpectrumFrame==='function'?J.getSpectrumFrame():null;
      if(frame && frame.bins && frame.bins.length){
        const bins=frame.bins, c=ui.equalizer;
        const width=c.width/Math.min(window.devicePixelRatio||1,2),height=c.height/Math.min(window.devicePixelRatio||1,2);
        const dpr=Math.min(window.devicePixelRatio||1,2);
        const ctx=c.getContext('2d');
        if(ctx){
          ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
          const count=35,gap=3,bw=(width-gap*(count-1))/count;
          const nyquist=(frame.sampleRate||44100)/2, hi=Math.min(14500,nyquist);
          for(let i=0;i<count;i++){
            const hz1=45*Math.pow(hi/45,i/count),hz2=45*Math.pow(hi/45,(i+1)/count);
            const a=Math.max(1,Math.floor(hz1/nyquist*bins.length)),b=Math.max(a,Math.min(bins.length-1,Math.ceil(hz2/nyquist*bins.length)));
            let peak=0,sum=0;for(let j=a;j<=b;j++){const e=bins[j]/255;peak=Math.max(peak,e);sum+=e;}
            const level=Math.min(1,(.65*peak+.35*sum/(b-a+1))*1.24);
            spriteLevels[i]=Math.max(level,spriteLevels[i]*.66); // realistic quick-fall decay
            const h=height*spriteLevels[i]*.87;
            const x=i*(bw+gap),y=height-h-3;
            const palette=[['#65ecff','#0979ba'],['#fc7fd0','#92376b'],['#ffe583','#aa7935']][i%3];
            const g=ctx.createLinearGradient(0,y,0,height);g.addColorStop(0,palette[0]);g.addColorStop(1,palette[1]);
            ctx.fillStyle=g;ctx.fillRect(x,y,bw,h);
          }
        }
        spectrumMode='live';
        ui.analysisState.textContent='REAL MUSIC FREQUENCIES · DIRECT FFT';
        ui.eqAccess.textContent='AUDIO REACTIVE';
        ui.eqTitle.textContent='LIVE DIGITAL EQUALIZER';
      } else {
        // Unverified/denied CORS -> honest idle bars; never silence normal music.
        const eq=typeof J.getSpectrumStatus==='function'?J.getSpectrumStatus():{reason:'UNVERIFIED'};
        if(spectrumMode!=='idle'){idleBars();spectrumMode='idle';}
        ui.eqAccess.textContent='SOUND ON · EQ LIMITED';
        ui.analysisState.textContent='IDLE — REAL FFT UNAVAILABLE';
        ui.analysisState.title=eq.reason||'Music plays normally; real analysis unavailable';
      }
      spectrumRaf=requestAnimationFrame(spectrumFrame);
    }
    function syncSpectrum(){
      stopSpectrum();
      if(!ui||!panel||panel.hidden)return;
      if(J.isPlaying()){lastSpectrumTime=0;spectrumRaf=requestAnimationFrame(spectrumFrame);}
      else { idleBars();spectrumMode='idle'; }
    }
    let originStatus = document.getElementById('gamehouse-radio-status');
    function notify(message) {
      if (!originStatus) {
        originStatus = document.createElement('div');
        originStatus.id = 'gamehouse-radio-status';
        originStatus.setAttribute('role','status');
        originStatus.setAttribute('aria-live','polite');
        document.body.appendChild(originStatus);
      }
      originStatus.textContent = message;
      originStatus.hidden = !message;
      // Status note is for error/fetch information; no app-level audio arbitration.
    }
    const fmt = value => {
      if (!Number.isFinite(value) || value < 0) return '0:00';
      const sec = Math.floor(value);
      return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    };
    function track() {
      if (!ui) return;
      const t = J.currentTrack(), state = J._state();
      ui.title.textContent = t ? t.title : 'TSCMS Radio';
      // Auto-shrink long titles so they fit the plaque without overlapping (Fudgie 2026-10-18)
      (function() {
        var title = ui.title;
        var len = (t && t.title || '').length;
        title.style.fontSize = '';
        if (len > 40) title.style.fontSize = '15px';
        else if (len > 28) title.style.fontSize = '18px';
        else if (len > 20) title.style.fontSize = '21px';
        // else: use CSS clamp default
      })();
      ui.artist.textContent = (t && t.artist) || 'Suno Country Music Spot';
      ui.trackNum.textContent = t ? 'TRACK ' + (state.index + 1) + ' OF ' + state.count : 'PLAYLIST UNAVAILABLE';
      let song = null;
      try {
        const url = new URL(t && t.suno || '');
        if (url.protocol === 'https:' && (url.hostname === 'suno.com' || url.hostname.endsWith('.suno.com'))) song = url.href;
      } catch (e) { /* no valid song link */ }
      ui.original.href = song || '#';
      ui.original.target = '_blank';
      ui.original.rel = 'noopener noreferrer';
      ui.original.setAttribute('aria-disabled', String(!song));
      ui.original.tabIndex = song ? 0 : -1;
      ui.play.disabled = ui.previous.disabled = ui.next.disabled = !state.ready;
      progress();
    }
    function progress() {
      if (!ui) return;
      const p = J.getPosition();
      const good = Number.isFinite(p.duration) && p.duration > 0;
      const percent = good ? Math.max(0, Math.min(100, p.currentTime / p.duration * 100)) : 0;
      ui.elapsed.textContent = fmt(p.currentTime);
      ui.duration.textContent = fmt(p.duration);
      ui.seek.value = String(Math.round(percent));
      ui.seek.style.setProperty('--fill', percent.toFixed(2) + '%');
      // Owner wants scrub after real Suno + Galaxy S24 acceptance, not before.
      ui.seek.disabled = true;
      ui.seek.setAttribute('aria-label','Song progress (display only until phone verification)');
    }
    function syncShuffle() {
      if(!ui || typeof J.getShuffle!=='function') return;
      const active=!!J.getShuffle();
      ui.shuffle.innerHTML=active?'<span aria-hidden="true">🔀</span><small>SHUF ON</small>':'<span aria-hidden="true">🔀</span><small>SHUF OFF</small>';
      ui.shuffle.title=active?'Random order enabled':'Original playlist order';
      ui.shuffle.setAttribute('aria-pressed',String(active));
      ui.shuffle.setAttribute('aria-label',active?'Shuffle on; tap for playlist order':'Shuffle off; tap for random songs');
      ui.shuffle.classList.toggle('selected',active);
    }
    function reflect() {
      if (!ui) return;
      syncShuffle();
      const playing = J.isPlaying();
      ui.play.textContent = playing ? '❚❚' : '▶';
      ui.play.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
      ui.eqAccess.textContent = playing ? 'MUSIC ON' : 'STANDBY';
      ui.liveLed.style.opacity = playing ? '1' : '.45';
      syncSpectrum();
    }
    function idleBars() {
      if (!ui || !panel || panel.hidden) return;
      const c = ui.equalizer, box = c.getBoundingClientRect();
      const width = Math.max(210, Math.round(box.width || 320));
      const height = Math.max(75, Math.round(box.height || 120));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = width * dpr; c.height = height * dpr;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);
      const count = 35, gap = 3, bw = (width - gap * (count - 1)) / count;
      for (let i = 0; i < count; i++) {
        const h = height * (0.19 + .07 * Math.sin(i * .41) + .045 * Math.sin(i * .17));
        const x = i * (bw + gap), y = height - h - 3;
        const palette = [['#65ecff','#0979ba'],['#fc7fd0','#92376b'],['#ffe583','#aa7935']][i%3];
        const g = ctx.createLinearGradient(0, y, 0, height);
        g.addColorStop(0, palette[0]); g.addColorStop(1, palette[1]);
        ctx.fillStyle = g; ctx.fillRect(x, y, bw, h);
      }
      ui.analysisState.textContent = 'IDLE BARS — NOT AUDIO REACTIVE';
    }
    function close() {
      if (!panel || panel.hidden) return;
      panel.hidden = true;
      stopSpectrum();
      document.removeEventListener('keydown', keydown);
      (lastFocus && lastFocus.isConnected ? lastFocus : trigger).focus();
      // Intentionally NO playback/volume/playlist changes here.
    }
    function keydown(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab' || !panel || panel.hidden) return;
      const all = [...panel.shadowRoot.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]:not([aria-disabled="true"])')]
        .filter(node => node.getClientRects().length > 0);
      if (!all.length) return;
      const first = all[0], last = all[all.length - 1];
      if (e.shiftKey && panel.shadowRoot.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && panel.shadowRoot.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function open() {
      if (!panel) return;
      lastFocus = document.activeElement;
      panel.hidden = false;
      track(); progress(); idleBars(); reflect();
      document.addEventListener('keydown', keydown);
      ui.close.focus();
      notify('');
    }
    function build() {
      if (preparing) return preparing;
      preparing = fetch(PREVIEW)
        .then(response => { if (!response.ok) throw new Error('Approved V7 visual is unavailable'); return response.text(); })
        .then(raw => {
          const doc = new DOMParser().parseFromString(raw,'text/html');
          const cabinet = doc.querySelector('#jukebox .cabinet');
          const originalStyle = doc.querySelector('head style');
          if (!cabinet || !originalStyle || !cabinet.querySelector('.photo') || !cabinet.querySelector('.neon-real'))
            throw new Error('Approved V7 visual is incomplete');
          panel = document.createElement('div');
          panel.id = 'tscms-v7-modal-host';
          panel.hidden = true;
          const shadow = panel.attachShadow({mode:'open'});
          const styles = document.createElement('style');
          // Style encapsulation protects the approved Solitaire board/controls.
          styles.textContent = originalStyle.textContent + '\n:host{--cream:#ffe9b9;--wood:#3d170b;--brass:#d1a363;--cyan:#28e6ff;--gold:#ffd97d;--pink:#ff54b9;position:fixed;inset:0;z-index:3000;display:block;font-family:Arial,Helvetica,sans-serif;color:#ffe9b9;} :host([hidden]){display:none!important} *{box-sizing:border-box} .preview-overlay{display:flex!important;} :host([hidden]) .preview-overlay{display:none!important} input:disabled{cursor:not-allowed;opacity:.7}';
          const overlay = document.createElement('div');
          overlay.className = 'preview-overlay';
          overlay.id = 'jukebox';
          overlay.setAttribute('role','dialog');
          overlay.setAttribute('aria-modal','true');
          overlay.setAttribute('aria-label','TSCMS Radio — full Design B V7 jukebox');
          const caption = document.createElement('p');
          caption.className = 'owner-label';
          caption.textContent = 'TSCMS RADIO';
          overlay.appendChild(caption);
          // Only import inert, owner-approved cabinet markup, never standalone scripts/audio.
          const approvedCabinet = document.importNode(cabinet, true);
          // V8 seam cleanup: preload corrected source image without touching audio/EQ.
          // On failure, keep original approved V7 photo and its mirror patch.
          const cabinetPhoto = approvedCabinet.querySelector('.photo');
          const comparisonPatch = approvedCabinet.querySelector('.photo-mirror');
          const repairedPhoto = new Image();
          repairedPhoto.onload = function () {
            if (cabinetPhoto) cabinetPhoto.src = repairedPhoto.src;
            if (comparisonPatch) comparisonPatch.remove();
          };
          repairedPhoto.onerror = function () {
            console.warn('V8 seamless cabinet photo unavailable; retaining V7 original');
          };
          repairedPhoto.src = new URL('solitaire-phase1-staging/assets/TSCMS_V7_CABINET_SEAM_CLEAN_v8.jpg', document.baseURI).href;
          approvedCabinet.querySelectorAll('.speaker-row,#speakerListen,#captureNote').forEach(n => n.remove());
          approvedCabinet.querySelectorAll('script,audio,iframe').forEach(n => n.remove());
          overlay.appendChild(approvedCabinet);
          // Add a large wooden Shuffle key to the LEFT of the existing
          // transport buttons, without squeezing the full jukebox volume row.
          if(!approvedCabinet.querySelector('.transport'))
            throw new Error('V7 transport unavailable for shuffle');
          const shuffleKey=document.createElement('button');
          shuffleKey.id='shuffle';
          shuffleKey.type='button';
          shuffleKey.className='shuffle-mode-btn';
          shuffleKey.innerHTML='<span aria-hidden="true">🔀</span><small>SHUF ON</small>';
          shuffleKey.setAttribute('aria-pressed','true');
          shuffleKey.setAttribute('aria-label','Shuffle on; tap for playlist order');
          approvedCabinet.appendChild(shuffleKey);
          // V8.1: align live Play/Pause cap with the original photographed button.
          // Do not change side controls, EQ, player events, or approved cabinet photo.
          styles.textContent += `
.transport button.primary{transform:translate(-7%,-4%)}
.cabinet .shuffle-mode-btn{
  position:absolute;z-index:5;left:8.7%;top:74.2%;width:14%;height:9.0%;
  display:flex;flex-direction:column;justify-content:center;align-items:center;gap:2%;
  padding:1px 0;border:3px ridge #b78b54;border-radius:12%;
  color:#ecd2aa;background:radial-gradient(ellipse at 30% 24%,#55402b,#1b130d 63%,#080708);
  box-shadow:inset 0 2px 3px #f6d8a03a,inset 0 -4px 7px #000b,0 3px 7px #000a;
  text-shadow:0 1px 3px #000;cursor:pointer;
}
.cabinet .shuffle-mode-btn>span{font:900 clamp(17px,5vw,26px)/1 Arial,sans-serif}
.cabinet .shuffle-mode-btn small{font:800 clamp(7px,1.7vw,10px)/1.1 Arial,sans-serif;white-space:nowrap}
.cabinet .shuffle-mode-btn.selected{
  color:#ffe9b1;border-color:#e9c888;
  background:radial-gradient(ellipse at 30% 24%,#926230,#4a2613 65%,#211108);
  box-shadow:inset 0 2px 4px #ffebb650,0 0 12px #ffd18e91,0 2px 4px #000a;
}
.cabinet .shuffle-mode-btn.selected small{color:#89f6c6;text-shadow:0 0 5px #3bf4b8}
.cabinet .shuffle-mode-btn:focus-visible{outline:3px solid #fff1bd;outline-offset:2px}
`;
          shadow.append(styles, overlay);
          document.body.appendChild(panel);
          ui = Object.fromEntries(required.map(id => [id,shadow.getElementById(id)]));
          if (required.some(id => !ui[id])) { panel.remove(); panel = null; ui = null; throw new Error('V7 controls incomplete'); }
          ui.close.setAttribute('aria-label','Close jukebox and return to Solitaire');
          ui.close.addEventListener('click',close);
          ui.play.addEventListener('click',() => { J.toggle(); reflect(); });
          ui.next.addEventListener('click',() => { J.next(); track(); reflect(); });
          ui.previous.addEventListener('click',() => { J.prev(); track(); reflect(); });
          ui.shuffle.addEventListener('click',() => {
            if(typeof J.toggleShuffle!=='function')return;
            J.toggleShuffle(); // instant mode change; current song continues.
            syncShuffle();
            ui.status.textContent=J.getShuffle()?'SHUFFLE ON · RANDOM ORDER':'SHUFFLE OFF · PLAYLIST ORDER';
          });
          ui.volume.value = String(Math.round(J.getVolume() * 100));
          ui.volume.style.setProperty('--fill',ui.volume.value + '%');
          ui.volume.addEventListener('input',() => {
            J.setVolume(Number(ui.volume.value) / 100);
            ui.volume.style.setProperty('--fill',ui.volume.value + '%');
          });
          ui.original.addEventListener('click',e => {
            if (ui.original.getAttribute('aria-disabled') === 'true') e.preventDefault();
          });
          J.on('trackchange',() => { track(); reflect(); });
          J.on('shufflechange',syncShuffle);
          J.on('timeupdate',progress);
          document.addEventListener('tscms:jukebox',e => {
            const d = e.detail || {};
            ui.status.textContent = d.message || (d.state === 'ready' ? 'TSCMS Radio ready' :
              d.state === 'playing' ? 'TSCMS Radio playing' :
              d.state === 'paused' ? 'TSCMS Radio paused' :
              d.state === 'loading' ? 'Loading TSCMS Radio…' : 'TSCMS Radio');
            track(); reflect();
          });
          window.addEventListener('resize',() => {idleBars();syncSpectrum();});
          track(); reflect(); progress();
          return true;
        })
        .catch(error => { preparing = null; notify('Could not open approved V7 jukebox. Solitaire remains available.'); console.warn('V7 modal unavailable:', error.message); return false; });
      return preparing;
    }
    trigger.addEventListener('click',() => {
      // Painted jukebox OPENs the modal; does not play/pause or reset music.
      if (panel) { open(); return; }
      notify('Opening TSCMS Radio jukebox…');
      build().then(ok => { if (ok) open(); });
    });
    // Load official playlist without autoplay; all playback stays user-gesture gated.
    J.init({playlistUrl:PLAYLIST,enableEq:true});
    // Prefetch photographic HTML during idle rather than on the critical tap path.
    // Do not create a second audio element or execute any scripts from the preview.
    if ('requestIdleCallback' in window) window.requestIdleCallback(build,{timeout:2500});
    else setTimeout(build,150);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();