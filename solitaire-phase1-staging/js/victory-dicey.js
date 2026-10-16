/* ============================================================
   Victory to Dicey (Cherish) - Phase 1B
   Shows congratulations on win with Play Again / Not Now / Roll Dicey.
   Dicey uses public-safe danger-zone-public.json only.
   Never modifies site data. Private staging only.
   ============================================================ */
'use strict';

const VictoryDicey = (() => {
  
  const DANGER_ZONE_URL = '../danger-zone-public.json';
  let dangerPool = null;
  let victoryShown = false;
  
  /* ----- Load danger zone pool (public-safe only) ----- */
  async function loadPool() {
    if (dangerPool) return dangerPool;
    try {
      const resp = await fetch(DANGER_ZONE_URL);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      // Only use public-safe fields
      dangerPool = (data.pool || []).map(item => ({
        member: item.member || 'Unknown',
        title: item.title || 'Untitled',
        post_url: item.post_url || null,
        tier: item.tier || 'NEW',
      }));
      return dangerPool;
    } catch (e) {
      console.warn('Dicey: could not load danger zone pool', e);
      return null;
    }
  }
  
  /* ----- Pick a random entry ----- */
  function pickRandom(pool) {
    if (!pool || pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  
  /* ----- Show victory overlay ----- */
  function showVictory() {
    if (victoryShown) return;
    victoryShown = true;
    
    // Create overlay if not exists
    let overlay = document.getElementById('victory-screen');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'victory-screen';
      overlay.className = 'layer';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML = `
        <div class="panel victory-panel">
          <h2>🎉 YOU WIN! 🎉</h2>
          <p class="victory-sub">Howdy, champion! You cleared the saloon!</p>
          <div id="dicey-result" hidden>
            <div class="dicey-label">🎲 DICEY DISCOVERY 🎲</div>
            <div id="dicey-member" class="dicey-member"></div>
            <div id="dicey-song" class="dicey-song"></div>
            <a id="dicey-link" class="dicey-link" target="_blank" rel="noopener">View Post →</a>
          </div>
          <div class="victory-buttons">
            <button id="victory-dicey" class="p-btn">🎲 Roll Dicey</button>
            <button id="victory-again" class="p-btn">Play Again</button>
            <button id="victory-notnow" class="p-btn">Not Now</button>
          </div>
          <p class="small">Private staging — Dicey uses public-safe data only.</p>
        </div>`;
      document.body.appendChild(overlay);
      
      // Wire buttons
      document.getElementById('victory-again').addEventListener('click', () => {
        hideVictory();
        if (typeof SaveSystem !== 'undefined') SaveSystem.clear();
        if (typeof SaloonEngine !== 'undefined') {
          const prefs = (typeof SessionManager !== 'undefined' && SessionManager.getPrefs()) || {};
          SaloonEngine.newGame(prefs.timerMode || 'countup', prefs.drawMode || 1);
        }
        if (typeof RendererBinding !== 'undefined') RendererBinding.render();
        victoryShown = false;
      });
      
      document.getElementById('victory-notnow').addEventListener('click', () => {
        hideVictory();
        // Don't reset victoryShown - player chose to dismiss
        // Game stays in won state, they can start new game via menu
      });
      
      document.getElementById('victory-dicey').addEventListener('click', async () => {
        const btn = document.getElementById('victory-dicey');
        btn.textContent = '🎲 Rolling...';
        btn.disabled = true;
        
        const pool = await loadPool();
        const pick = pickRandom(pool);
        
        const resultDiv = document.getElementById('dicey-result');
        if (pick) {
          document.getElementById('dicey-member').textContent = pick.member;
          document.getElementById('dicey-song').textContent = pick.title;
          const link = document.getElementById('dicey-link');
          if (pick.post_url) {
            link.href = pick.post_url;
            link.style.display = 'inline-block';
          } else {
            link.style.display = 'none';
          }
          resultDiv.removeAttribute('hidden');
        } else {
          document.getElementById('dicey-member').textContent = 'Could not load songs';
          document.getElementById('dicey-song').textContent = 'Try again later';
          document.getElementById('dicey-link').style.display = 'none';
          resultDiv.removeAttribute('hidden');
        }
        
        btn.textContent = '🎲 Roll Again';
        btn.disabled = false;
      });
    }
    
    overlay.removeAttribute('hidden');
    overlay.style.display = 'flex';
  }
  
  function hideVictory() {
    const overlay = document.getElementById('victory-screen');
    if (overlay) {
      overlay.setAttribute('hidden', '');
      overlay.style.display = 'none';
    }
  }
  
  /* ----- Check for win after each render ----- */
  function checkWin() {
    try {
      if (typeof SaloonEngine === 'undefined') return;
      const S = SaloonEngine.getState();
      if (S && S.gameWon && !victoryShown) {
        // Small delay for dramatic effect
        setTimeout(showVictory, 800);
      }
    } catch (e) {}
  }
  
  /* ----- Init: hook into engine state changes ----- */
  function init() {
    if (typeof SaloonEngine !== 'undefined' && SaloonEngine.onStateChange) {
      SaloonEngine.onStateChange(checkWin);
    }
    // Also check periodically in case state changes are missed
    setInterval(checkWin, 2000);
  }
  
  return { init, showVictory, hideVictory, checkWin, loadPool };
})();

// Auto-init on DOM ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for other modules to load
    setTimeout(() => VictoryDicey.init(), 1000);
  });
}
