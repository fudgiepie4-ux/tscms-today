/* TSCMS LOCKED SALOON VISUAL ADAPTER | PRIVATE STAGING | 2026-10-16
   Independent layer only. No modifications to Cherish's 5 v5 JS modules. */
(function () {
  'use strict';
  const HOME = 'https://fudgiepie4-ux.github.io/tscms-today/';
  function notify(message) {
    const toast = document.getElementById('toast');
    if (toast) { toast.textContent = message; toast.removeAttribute('hidden'); }
    else window.alert(message);
  }
  function bindExit() {
    const btn = document.getElementById('btn-exit');
    if (!btn) return;
    btn.addEventListener('click', function () {
      try {
        if (typeof SaloonEngine === 'undefined' || typeof SaveSystem === 'undefined' || typeof PauseSystem === 'undefined') {
          notify('Game systems are not ready. Please try again.');return;
        }
        const state = SaloonEngine._getState();
        if (!state) { notify('The game has not loaded. Please try again.'); return; }
        // A brand-new untouched deal has no progress to lose and SaveSystem deliberately
        // does not create a save for it. Finished games are similarly safe to leave.
        if ((state.moves || 0) === 0 || state.gameWon) { window.location.assign(HOME); return; }
        if (!PauseSystem.paused()) PauseSystem.pause('manual');
        const success = SaveSystem.save();
        const saved = SaveSystem.load();
        if (!success || !saved || !SaveSystem.validate(saved) || saved.moves !== state.moves) {
          notify('EXIT BLOCKED: Game progress could not be verified as saved. Resume and try again.');
          return;
        }
        window.location.assign(HOME);
      } catch (e) {
        console.error('Safe Exit failed:',e);
        notify('EXIT BLOCKED: Unable to confirm your saved game.');
      }
    });
  }
  // Cherish's original renderer uses pixel offsets based on viewport width.
  // This new portrait art reserves a narrower vertical fan area. Bound actual
  // DOM card offset to the space ABOVE the ornamental star and lower controls.
  function boundFans() {
    const stage = document.querySelector('.stage');
    if (!stage) return;
    const safeBottom = stage.clientHeight * 0.787;
    for (let c=0;c<7;c++) {
      const pile = document.getElementById('tableau-'+c);
      if (!pile) continue;
      const cards = Array.from(pile.querySelectorAll('.live-card'));
      if (!cards.length) continue;
      const cardH = cards[0].getBoundingClientRect().height || pile.clientWidth * 7/5;
      const available = Math.max(0, safeBottom - (pile.getBoundingClientRect().top - stage.getBoundingClientRect().top) - cardH);
      // Keep maximum depth visible; for large stacks offsets become small.
      const defaultStep = Math.min(36, Math.max(18, Math.round(stage.clientWidth*0.07)));
      const step = cards.length>1 ? Math.min(defaultStep, available/(cards.length-1)) : 0;
      cards.forEach((card,i) => {
        card.style.transform = 'translateY('+ (i*step).toFixed(2) +'px)';
      });
    }
  }
  function init() {
    bindExit();
    // Only DOM child additions/removals are observed; the positioning style writes
    // themselves do not retrigger this observer.
    const stage = document.querySelector('.stage');
    if (stage && typeof MutationObserver !== 'undefined') {
      let pending = false;
      const observer = new MutationObserver(() => {
        if (pending) return;
        pending=true;
        requestAnimationFrame(()=>{pending=false;boundFans();});
      });
      for(let c=0;c<7;c++) {
        const t=document.getElementById('tableau-'+c);
        if(t) observer.observe(t,{childList:true});
      }
    }
    window.addEventListener('resize',boundFans);
    requestAnimationFrame(boundFans);
  }
  document.addEventListener('DOMContentLoaded',init);
})();
