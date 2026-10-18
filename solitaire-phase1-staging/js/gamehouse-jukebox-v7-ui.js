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
  const required = ['close','title','artist','trackNum','original','play','previous','next',
    'volume','seek','elapsed','duration','equalizer','eqAccess','analysisState','liveLed','status'];
  function init() {
    const trigger = document.getElementById('btn-jukebox');
    const J = window.TSCMSJukebox;
    if (!trigger || !J || trigger.dataset.v7Bound === 'true') return;
    trigger.dataset.v7Bound = 'true';
    trigger.setAttribute('aria-label', 'Open TSCMS Radio jukebox');
    trigger.setAttribute('aria-haspopup','dialog');
    trigger.removeAttribute('aria-pressed');

    let panel = null, ui = null, preparing = null, lastFocus = null;
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
    function reflect() {
      if (!ui) return;
      const playing = J.isPlaying();
      ui.play.textContent = playing ? '❚❚' : '▶';
      ui.play.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
      ui.eqAccess.textContent = playing ? 'MUSIC ON' : 'STANDBY';
      ui.liveLed.style.opacity = playing ? '1' : '.45';
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
      track(); reflect(); progress(); idleBars();
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
          approvedCabinet.querySelectorAll('.speaker-row,#speakerListen,#captureNote').forEach(n => n.remove());
          approvedCabinet.querySelectorAll('script,audio,iframe').forEach(n => n.remove());
          overlay.appendChild(approvedCabinet);
          shadow.append(styles, overlay);
          document.body.appendChild(panel);
          ui = Object.fromEntries(required.map(id => [id,shadow.getElementById(id)]));
          if (required.some(id => !ui[id])) { panel.remove(); panel = null; ui = null; throw new Error('V7 controls incomplete'); }
          ui.close.setAttribute('aria-label','Close jukebox and return to Solitaire');
          ui.close.addEventListener('click',close);
          ui.play.addEventListener('click',() => { J.toggle(); reflect(); });
          ui.next.addEventListener('click',() => { J.next(); track(); reflect(); });
          ui.previous.addEventListener('click',() => { J.prev(); track(); reflect(); });
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
          J.on('timeupdate',progress);
          document.addEventListener('tscms:jukebox',e => {
            const d = e.detail || {};
            ui.status.textContent = d.message || (d.state === 'ready' ? 'TSCMS Radio ready' :
              d.state === 'playing' ? 'TSCMS Radio playing' :
              d.state === 'paused' ? 'TSCMS Radio paused' :
              d.state === 'loading' ? 'Loading TSCMS Radio…' : 'TSCMS Radio');
            track(); reflect();
          });
          window.addEventListener('resize',idleBars);
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
    J.init({playlistUrl:PLAYLIST});
    // Prefetch photographic HTML during idle rather than on the critical tap path.
    // Do not create a second audio element or execute any scripts from the preview.
    if ('requestIdleCallback' in window) window.requestIdleCallback(build,{timeout:2500});
    else setTimeout(build,150);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();