/* ============================================================
   Solitaire Renderer Binding (Cherish)
   Connects SaloonEngine to Clara's Phase 1 DOM scaffold.
   
   Renders LIVE cards from engine state as DOM elements positioned
   over Clara's approved saloon background. The background image
   contains painted cards — these live cards cover/replace them.
   
   Contract IDs (from 03_ID_MANIFEST.json):
   stock-pile, waste-pile, foundation-0..3, tableau-0..6,
   btn-undo, btn-hint, btn-pause, btn-newgame, btn-menu,
   timer-display, move-counter,
   pause-screen, pause-message, pause-resume,
   pause-choices, pause-continue, pause-newgame
   ============================================================ */
'use strict';

const RendererBinding = (() => {
  
  // Card dimensions (relative to pile container)
  const CARD_W = 100;  // percent of pile width
  // Tableau fan offset scales with stage width (Clara's review)
  function getCardOverlap(pileDepth) {
    try {
      let base = 28;
      if (typeof document.querySelector === 'function') {
        const stage = document.querySelector('.stage');
        if (stage) {
          const w = stage.offsetWidth || 390;
          base = Math.max(18, Math.min(36, Math.round(w * 0.07)));
        }
      }
      // Compress for deep piles to prevent clipping (Clara's v3 review)
      if (pileDepth && pileDepth > 10) {
        const maxH = (typeof window !== 'undefined' ? window.innerHeight : 700) * 0.35;
        const compressed = Math.floor(maxH / pileDepth);
        return Math.max(12, Math.min(base, compressed));
      }
      return base;
    } catch (e) { /* test env */ }
    return 28; // fallback
  }
  
  // Selection state
  let selected = null;  // { from, col, idx } or null
  
  // Long-press state
  let longPressTimer = null;
  const LONG_PRESS_MS = 500;
  
  // Double-tap state
  let lastTapByCard = {};  // cardId -> timestamp
  const DOUBLE_TAP_MS = 350;
  
  /* ----- Card identity ----- */
  function cardId(card) {
    if (card.isJoker) return 'joker-' + (card.jokerId || card.id || 'x');
    return (card.suit || '?') + '-' + (card.value || '?');
  }
  
  function cardArtPath(card) {
    // Use artId if available (maps to ~/workspace/game-room-ref/card-art/)
    if (card.artId) return 'card-art/' + card.artId + '.png';
    return null;
  }
  
  /* ----- Create a card DOM element ----- */
  function createCardEl(card, opts = {}) {
    const el = document.createElement('div');
    el.className = 'live-card';
    el.dataset.cardId = cardId(card);
    
    // Store card reference for tap handling
    el._card = card;
    el._from = opts.from;
    el._col = opts.col;
    el._idx = opts.idx;
    
    if (card.faceUp) {
      el.classList.add('face-up');
      // ALWAYS put text in DOM (Clara's review: no empty rectangles)
      el.innerHTML = renderCardText(card);
      // Try to load art async; hide text only on successful load
      const artPath = cardArtPath(card);
      if (artPath) {
        const img = new Image();
        img.onload = () => {
          el.style.backgroundImage = `url('${artPath}')`;
          el.classList.add('has-art');
        };
        img.onerror = () => {
          // Keep text visible; art failed to load
        };
        img.src = artPath;
      }
    } else {
      el.classList.add('face-down');
      // Card back design (Clara styles this)
    }
    
    // Selection highlight
    if (selected && selected.from === opts.from && 
        selected.col === opts.col && selected.idx === opts.idx) {
      el.classList.add('selected');
    }
    
    // Position for tableau fanning
    if (opts.from === 'tableau' && opts.offsetY) {
      el.style.transform = `translateY(${opts.offsetY}px)`;
    }
    
    // Attach tap/long-press handlers
    attachCardHandlers(el);
    
    return el;
  }
  
  function renderCardText(card) {
    if (card.isJoker) return '<div class="joker-label">🃏<br>JOKER</div>';
    const suits = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
    const suitSym = suits[card.suit] || '?';
    const valStr = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[card.value] || card.value;
    const color = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black';
    return `<div class="card-text ${color}"><div class="corner">${valStr}${suitSym}</div><div class="center">${suitSym}</div></div>`;
  }
  
  /* ----- Render all piles ----- */
  function render() {
    const S = SaloonEngine.getState();
    if (!S) return;
    
    renderPile('stock-pile', S.stock, 'stock');
    renderPile('waste-pile', S.waste, 'waste');
    
    for (let i = 0; i < 4; i++) {
      renderPile(`foundation-${i}`, S.foundations[i], 'foundation', i);
    }
    for (let i = 0; i < 7; i++) {
      renderPile(`tableau-${i}`, S.tableau[i], 'tableau', i);
    }
    
    // Update HUD
    updateHUD(S);
  }
  
  function renderPile(pileId, cards, from, col = null) {
    const pileEl = document.getElementById(pileId);
    if (!pileEl) return;
    
    // Clear existing live cards
    pileEl.querySelectorAll('.live-card').forEach(el => el.remove());
    
    if (!cards || cards.length === 0) {
      // Empty pile — show placeholder (Clara styles)
      pileEl.classList.add('empty');
      return;
    }
    pileEl.classList.remove('empty');
    
    cards.forEach((card, idx) => {
      const opts = { from, col, idx };
      // Tableau fanning: offset each card (pass pile depth for compression)
      if (from === 'tableau') {
        opts.offsetY = idx * getCardOverlap(cards.length);
      }
      const cardEl = createCardEl(card, opts);
      pileEl.appendChild(cardEl);
    });
  }
  
  function updateHUD(S) {
    const timerEl = document.getElementById('timer-display');
    if (timerEl) {
      // Compute live elapsed from startTime (not just saved elapsed)
      let elapsed = S.elapsed || 0;
      if (S.startTime && !PauseSystem.paused() && !S.gameWon) {
        elapsed += Date.now() - S.startTime;
      }
      timerEl.textContent = formatTime(elapsed);
    }
    const moveEl = document.getElementById('move-counter');
    if (moveEl) {
      moveEl.textContent = S.moves || 0;
    }
  }
  
  // Live timer: update HUD every second while playing
  let hudTimer = null;
  function startHudTimer() {
    if (hudTimer) return;
    hudTimer = setInterval(() => {
      if (PauseSystem.paused()) return;
      try {
        const S = SaloonEngine.getState();
        if (S && !S.gameWon) updateHUD(S);
      } catch (e) {}
    }, 1000);
  }
  function stopHudTimer() {
    if (hudTimer) {
      clearInterval(hudTimer);
      hudTimer = null;
    }
  }
  
  function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
  
  /* ----- Tap handling (tap-only, no drag) ----- */
  function attachCardHandlers(el) {
    let downX = 0, downY = 0, downTime = 0;
    
    el.addEventListener('pointerdown', (e) => {
      if (PauseSystem.paused()) return;
      PauseSystem.recordActivity();
      
      downX = e.clientX;
      downY = e.clientY;
      downTime = Date.now();
      
      // Start long-press timer (face-up only)
      if (el._card && el._card.faceUp) {
        longPressTimer = setTimeout(() => {
          longPressTimer = null;
          openCardViewer(el._card);
          el._longPressed = true;  // Suppress tap on pointerup
        }, LONG_PRESS_MS);
      }
    });
    
    el.addEventListener('pointerup', (e) => {
      if (PauseSystem.paused()) return;
      
      // Clear long-press timer
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      
      // If long-press fired, swallow this pointerup
      if (el._longPressed) {
        el._longPressed = false;
        return;
      }
      
      // Check for drag (movement > 12px = not a tap)
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      if (Math.sqrt(dx * dx + dy * dy) > 12) return;
      
      // It's a tap — handle game logic
      handleTap(el);
    });
    
    // Cancel long-press on move
    el.addEventListener('pointermove', (e) => {
      if (!longPressTimer) return;
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      if (Math.sqrt(dx * dx + dy * dy) > 12) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    });
  }
  
  function handleTap(el) {
    const card = el._card;
    if (!card || !card.faceUp) return;
    
    const from = el._from;
    const col = el._col;
    const idx = el._idx;
    
    // Check for double-tap
    const cid = cardId(card);
    const now = Date.now();
    const lastTap = lastTapByCard[cid] || 0;
    
    if (now - lastTap < DOUBLE_TAP_MS) {
      // Double-tap!
      delete lastTapByCard[cid];
      handleDoubleTap(card, from, col, idx);
      return;
    }
    lastTapByCard[cid] = now;
    
    // Single tap: select or move
    if (!selected) {
      // Nothing selected — select this card (if movable)
      if (isMovable(card, from, col, idx)) {
        selected = { from, col, idx };
        render();  // Re-render to show selection
      }
    } else {
      // Something selected — try to move it here
      const result = tryMove(selected, { from, col, idx });
      selected = null;
      if (result) {
        render();
      } else {
        // Invalid move — select the new card instead (if movable)
        if (isMovable(card, from, col, idx)) {
          selected = { from, col, idx };
        }
        render();
      }
    }
  }
  
  function handleDoubleTap(card, from, col, idx) {
    // Joker: player chooses destination (don't auto-play)
    if (card.isJoker) {
      selected = { from, col, idx };
      render();
      return;
    }
    
    // Try to move to foundation
    const result = SaloonEngine.moveToFoundation(from, col, idx);
    if (result) {
      selected = null;
      render();
    }
  }
  
  function isMovable(card, from, col, idx) {
    const S = SaloonEngine.getState();
    if (from === 'tableau') {
      // Allow any face-up card (engine validates sequences)
      // Check that all cards from idx to end are face-up
      const pile = S.tableau[col];
      for (let i = idx; i < pile.length; i++) {
        if (!pile[i].faceUp) return false;
      }
      return true;
    }
    if (from === 'waste') {
      return idx === S.waste.length - 1;
    }
    if (from === 'foundation') {
      // P0-2: Foundation cards are not selectable as move sources
      // (prevents foundation-to-foundation bugs)
      return false;
    }
    return false;
  }
  
  function tryMove(fromSel, toSel) {
    // Route to appropriate engine function
    if (toSel.from === 'foundation') {
      // P0-1: Only top tableau cards can move to foundation
      // (moveToSpecificFoundation always uses the top card)
      if (fromSel.from === 'tableau') {
        const S = SaloonEngine.getState();
        const pile = S.tableau[fromSel.col];
        if (fromSel.idx !== pile.length - 1) {
          return false; // Not the top card - reject
        }
      }
      // P0-2: Foundation cards cannot be moved (no foundation-to-foundation)
      if (fromSel.from === 'foundation') {
        return false;
      }
      // Waste is always the top card by definition
      return SaloonEngine.moveToSpecificFoundation(
        fromSel.from, fromSel.col, toSel.col
      );
    }
    if (toSel.from === 'tableau') {
      if (fromSel.from === 'tableau') {
        return SaloonEngine.moveTableauToTableau(
          fromSel.col, fromSel.idx, toSel.col
        );
      }
      if (fromSel.from === 'waste') {
        return SaloonEngine.moveWasteToTableau(toSel.col);
      }
    }
    return false;
  }
  
  /* ----- Long-press viewer ----- */
  function openCardViewer(card) {
    // Fire event for Clara's visual viewer
    const event = new CustomEvent('card:view', {
      detail: {
        suit: card.suit,
        value: card.value,
        color: (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black',
        isJoker: !!card.isJoker,
        jokerId: card.jokerId,
        jokerName: card.jokerName,
        artId: card.artId,
      }
    });
    document.dispatchEvent(event);
  }
  
  /* ----- Button wiring ----- */
  function wireButtons() {
    const btnUndo = document.getElementById('btn-undo');
    if (btnUndo) btnUndo.addEventListener('click', () => {
      if (PauseSystem.paused()) return;
      PauseSystem.recordActivity();
      if (SaloonEngine.undo()) render();
    });
    
    const btnHint = document.getElementById('btn-hint');
    if (btnHint) btnHint.addEventListener('click', () => {
      if (PauseSystem.paused()) return;
      PauseSystem.recordActivity();
      const hints = SaloonEngine.findHints();
      // Fire event for Clara's hint visual
      document.dispatchEvent(new CustomEvent('game:hint', { detail: { hints } }));
    });
    
    const btnPause = document.getElementById('btn-pause');
    if (btnPause) btnPause.addEventListener('click', () => {
      PauseSystem.recordActivity();
      PauseSystem.pause('manual');
    });
    
    const btnNew = document.getElementById('btn-newgame');
    if (btnNew) btnNew.addEventListener('click', () => {
      PauseSystem.recordActivity();
      if (SaveSystem.hasSave()) {
        if (confirm('Start a new game? Your current progress will be lost.')) {
          SaveSystem.clear();
          selected = null;
          SaloonEngine.newGame();
          render();
        }
      } else {
        selected = null;
        SaloonEngine.newGame();
        render();
      }
    });
    
    // Stock pile: SINGLE draw handler with deduplication
    // (Clara's review: click + pointerup caused double-draw on touch)
    const stockEl = document.getElementById('stock-pile');
    if (stockEl) {
      let lastDrawTime = 0;
      const doDraw = () => {
        const now = Date.now();
        // Deduplicate: ignore draws within 300ms (touch fires click+pointerup)
        if (now - lastDrawTime < 300) return;
        lastDrawTime = now;
        
        if (PauseSystem.paused()) return;
        PauseSystem.recordActivity();
        selected = null;
        if (SaloonEngine.drawFromStock()) render();
      };
      // Use pointerup only (works for both mouse and touch)
      stockEl.addEventListener('pointerup', (e) => {
        // Prevent the subsequent click event from also firing
        e.preventDefault();
        doDraw();
      });
    }
    
    // Empty pile click targets: foundation and tableau
    for (let i = 0; i < 4; i++) {
      const fnd = document.getElementById(`foundation-${i}`);
      if (fnd) fnd.addEventListener('click', (e) => {
        if (PauseSystem.paused()) return;
        if (selected && (e.target === fnd || !e.target.closest('.live-card'))) {
          PauseSystem.recordActivity();
          const result = SaloonEngine.moveToSpecificFoundation(
            selected.from, selected.col, i
          );
          selected = null;
          if (result) render();
          else render();
        }
      });
    }
    for (let i = 0; i < 7; i++) {
      const tab = document.getElementById(`tableau-${i}`);
      if (tab) tab.addEventListener('click', (e) => {
        if (PauseSystem.paused()) return;
        if (selected && (e.target === tab || !e.target.closest('.live-card'))) {
          PauseSystem.recordActivity();
          let result = false;
          if (selected.from === 'tableau') {
            result = SaloonEngine.moveTableauToTableau(selected.col, selected.idx, i);
          } else if (selected.from === 'waste') {
            result = SaloonEngine.moveWasteToTableau(i);
          } else if (selected.from === 'foundation') {
            // Foundation back to tableau (if engine supports)
            result = false;
          }
          selected = null;
          render();
        }
      });
    }
  }
  
  /* ----- Pause screen wiring ----- */
  function wirePauseScreen() {
    PauseSystem.on('paused', (data) => {
      const ps = document.getElementById('pause-screen');
      const msg = document.getElementById('pause-message');
      const resumeBtn = document.getElementById('pause-resume');
      const choices = document.getElementById('pause-choices');
      
      if (!ps) return;
      
      // Set message based on reason
      if (msg) {
        if (data.reason === 'inactivity') {
          msg.textContent = 'Looks like you stepped away, partner! Your game has been saved and will be waiting right here.';
        } else if (data.reason === 'visibility') {
          msg.textContent = 'Welcome back! Your game was paused while you were away.';
        } else if (data.reason === 'returning') {
          msg.textContent = 'Welcome back, partner! Your game is waiting.';
        } else {
          msg.textContent = 'Take a break, partner. Your game is saved.';
        }
      }
      
      // Show/hide appropriate buttons
      if (data.reason === 'returning') {
        // Show Continue / New Game choices
        if (choices) choices.style.display = 'flex';
        if (resumeBtn) resumeBtn.style.display = 'none';
      } else {
        if (choices) choices.style.display = 'none';
        if (resumeBtn) resumeBtn.style.display = 'block';
      }
      
      ps.removeAttribute('hidden');
      ps.style.display = 'flex';
    });
    
    const resumeBtn = document.getElementById('pause-resume');
    if (resumeBtn) resumeBtn.addEventListener('click', () => {
      const _ps = document.getElementById('pause-screen'); if (_ps) { _ps.setAttribute('hidden', ''); _ps.style.display = 'none'; }
      PauseSystem.resume();
      render();
    });
    
    const continueBtn = document.getElementById('pause-continue');
    if (continueBtn) continueBtn.addEventListener('click', () => {
      const _ps = document.getElementById('pause-screen'); if (_ps) { _ps.setAttribute('hidden', ''); _ps.style.display = 'none'; }
      PauseSystem.resume();
      render();
    });
    
    const newGameBtn = document.getElementById('pause-newgame');
    if (newGameBtn) newGameBtn.addEventListener('click', () => {
      if (confirm('Start a new game? Your saved progress will be lost.')) {
        SaveSystem.clear();
        const _ps = document.getElementById('pause-screen'); if (_ps) { _ps.setAttribute('hidden', ''); _ps.style.display = 'none'; }
        selected = null;
        SaloonEngine.newGame();
        PauseSystem.resume();
        render();
      }
    });
  }
  
  /* ----- Menu, viewer, hint wiring (Clara's v3 review) ----- */
  function wireMenuViewerHint() {
    // Hamburger menu: toggle visibility using hidden attribute
    const btnMenu = document.getElementById('btn-menu');
    const menu = document.getElementById('menu');
    const showMenu = (show) => {
      if (!menu) return;
      if (show) {
        menu.removeAttribute('hidden');
        menu.style.display = 'block';
      } else {
        menu.setAttribute('hidden', '');
        menu.style.display = 'none';
      }
    };
    
    if (btnMenu) btnMenu.addEventListener('click', () => {
      if (PauseSystem.paused()) return;
      PauseSystem.recordActivity();
      const isHidden = menu && menu.hasAttribute('hidden');
      showMenu(isHidden);
    });
    
    // Close menu button
    const closeMenu = document.getElementById('closeMenu');
    if (closeMenu) closeMenu.addEventListener('click', () => showMenu(false));
    
    // Draw mode setter: uses _getState (live), not getState (snapshot)
    const setDrawMode = (mode) => {
      try {
        const S = SaloonEngine._getState();
        if (S) {
          S.drawMode = mode;
          // Persist to prefs
          const prefs = SessionManager.getPrefs() || SessionManager.defaultPrefs();
          prefs.drawMode = mode;
          SessionManager.savePrefs(prefs);
          // P1-3: Persist to current save immediately (don't wait for next move)
          try { SaveSystem.save(); } catch (e) {}
          // Update button states (ARIA + visual .selected class)
          const d1 = document.getElementById('draw1');
          const d3 = document.getElementById('draw3');
          if (d1) {
            d1.setAttribute('aria-pressed', mode === 1 ? 'true' : 'false');
            d1.classList.toggle('selected', mode === 1);
          }
          if (d3) {
            d3.setAttribute('aria-pressed', mode === 3 ? 'true' : 'false');
            d3.classList.toggle('selected', mode === 3);
          }
        }
      } catch (e) { /* ignore */ }
      showMenu(false);
    };
    
    const draw1 = document.getElementById('draw1');
    if (draw1) draw1.addEventListener('click', () => setDrawMode(1));
    const draw3 = document.getElementById('draw3');
    if (draw3) draw3.addEventListener('click', () => setDrawMode(3));
    
    // Card viewer: listen for card:view, show viewer
    document.addEventListener('card:view', (e) => {
      const viewer = document.getElementById('viewer');
      if (!viewer) return;
      viewer.removeAttribute('hidden');
      viewer.style.display = 'flex';
      PauseSystem.recordActivity();
      
      const detail = e.detail || {};
      const titleEl = document.getElementById('cardTitle');
      if (titleEl) {
        titleEl.textContent = detail.isJoker
          ? (detail.jokerName || 'WILD CARD')
          : `${detail.value || ''} of ${detail.suit || ''}`;
      }
      const cardEl = document.getElementById('fullCard');
      if (cardEl) {
        if (detail.artId) {
          cardEl.innerHTML = '';
          const img = new Image();
          img.onload = () => {
            cardEl.innerHTML = '';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            cardEl.appendChild(img);
          };
          img.onerror = () => {
            cardEl.textContent = detail.isJoker
              ? (detail.jokerName || 'WILD CARD')
              : `${detail.value || ''} ${detail.suit || ''}`;
          };
          img.src = `card-art/${detail.artId}.png`;
        } else {
          cardEl.textContent = detail.isJoker
            ? (detail.jokerName || 'WILD CARD')
            : `${detail.value || ''} of ${detail.suit || ''}`;
        }
      }
    });
    
    const closeViewerBtn = document.getElementById('closeViewer');
    if (closeViewerBtn) closeViewerBtn.addEventListener('click', () => {
      const viewer = document.getElementById('viewer');
      if (viewer) {
        viewer.setAttribute('hidden', '');
        viewer.style.display = 'none';
      }
      document.dispatchEvent(new CustomEvent('card:view:close'));
      PauseSystem.recordActivity();
    });
    
    // Viewer close
    const closeViewer = document.getElementById('closeViewer');
    if (closeViewer) closeViewer.addEventListener('click', () => {
      const viewer = document.getElementById('card-viewer');
      if (viewer) {
        viewer.setAttribute('hidden', '');
        viewer.style.display = 'none';
      }
      document.dispatchEvent(new CustomEvent('card:view:close'));
    });
    
    // Hint: show visual feedback
    document.addEventListener('game:hint', (e) => {
      const hints = e.detail.hints;
      if (hints && hints.length > 0) {
        // Highlight the hinted card briefly
        // (Clara can enhance this visual)
        console.log('Hint:', hints[0]);
      }
    });
  }
  
  /* ----- Initialize ----- */
  function init() {
    wireButtons();
    wirePauseScreen();
    wireMenuViewerHint();
    startHudTimer();
    PauseSystem.init();
    
    // Session detection and game setup
    // Clara's review: check for valid save INDEPENDENTLY of visit type
    const visitType = SessionManager.getVisitType();
    SessionManager.markSessionActive();
    
    let prefs = SessionManager.getPrefs();
    if (!prefs) {
      // No prefs: save defaults now (don't discard future saves)
      prefs = SessionManager.defaultPrefs();
      SessionManager.savePrefs(prefs);
    }
    
    const saveData = SaveSystem.hasSave() ? SaveSystem.load() : null;
    
    if (saveData && !saveData.gameWon) {
      // Valid save exists: restore it (paused) regardless of visit type
      if (SaveSystem.restore(saveData)) {
        PauseSystem.pause('returning');
      } else {
        SaloonEngine.newGame(prefs.timerMode, prefs.drawMode);
      }
    } else if (visitType === 'first') {
      // First visit, no save: new game with defaults
      SaloonEngine.newGame(prefs.timerMode, prefs.drawMode);
    } else {
      // Returning, no save: new game with saved prefs
      SaloonEngine.newGame(prefs.timerMode, prefs.drawMode);
    }
    
    // Auto-save wiring: wrap engine move functions
    const moveFns = ['drawFromStock', 'moveToFoundation', 'moveToSpecificFoundation',
                     'moveTableauToTableau', 'moveWasteToTableau', 'undo'];
    moveFns.forEach(fn => {
      if (typeof SaloonEngine[fn] === 'function') {
        const orig = SaloonEngine[fn];
        SaloonEngine[fn] = function() {
          const result = orig.apply(this, arguments);
          if (result) {
            clearTimeout(window._saveDebounce);
            window._saveDebounce = setTimeout(() => SaveSystem.save(), 500);
            render();
          }
          return result;
        };
      }
    });
    
    // Initial render
    render();
    
    // Subscribe to engine state changes
    if (SaloonEngine.onStateChange) {
      SaloonEngine.onStateChange(() => render());
    }
  }
  
  return {
    init,
    render,
    openCardViewer,
    // For testing
    _getSelected: () => selected,
    _clearSelected: () => { selected = null; },
  };
})();

// Export for Node testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RendererBinding };
}
