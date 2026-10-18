/* ============================================================
   TSCMS Swiper 100% Encounter Test Mode
   Phase 2 prep — Cherish, 2026-10-18

   Forces deterministic Swiper encounters for testing. Staging-only.
   Does NOT modify the engine — overrides at the integration layer.

   URL params (staging HTML only):
     ?swiper_test=100              → encounter on move 3, every game
     ?swiper_test=100&halloween=1  → two encounters (moves 3 and 18)
     ?swiper_test=scare            → forces Joker-scare path on move 3

   Fudgie's decisions (2026-10-18):
     - Strike move: 3
     - Badge: "👻 SWIPER TEST MODE — FORCED" / "👻 SWIPER TEST — JOKER SCARE"
     - YES to scare mode
   ============================================================ */
'use strict';

const SwiperTestMode = (() => {

  const BADGE_FORCED = '👻 SWIPER TEST MODE — FORCED';
  const BADGE_SCARE = '👻 SWIPER TEST — JOKER SCARE';
  const STRIKE_MOVE = 3;
  const HALLOWEEN_SECOND_STRIKE = 18;

  /**
   * Parse the test mode from URL params.
   * Returns null if not in test mode, otherwise:
   *   { mode: 'forced'|'scare', halloween: boolean }
   */
  function parseFromUrl(urlSearch) {
    const params = new URLSearchParams(urlSearch || '');
    const val = params.get('swiper_test');
    if (!val) return null;

    if (val === 'scare') {
      return { mode: 'scare', halloween: false };
    }
    if (val === '100') {
      return {
        mode: 'forced',
        halloween: params.get('halloween') === '1'
      };
    }
    return null;  // unrecognized value — not test mode
  }

  /**
   * Apply the test override to a mischief state object.
   * Called AFTER initMischiefState(), BEFORE the game starts.
   * Returns the modified state.
   *
   * Fixes Clara's 4 integration gaps (2026-10-18):
   *   G1: sets enabled=true (was left false → strike blocked)
   *   G2: halloween sets maxEncounters=2 + theme='halloween' (was 1 → 2nd blocked)
   *   G3: scare mode provides selectScareTarget() — engine's selectTarget
   *       doesn't consume _testForceScare, so the integration must call
   *       selectScareTarget() instead when the flag is set
   *   G4: sanitizeForSave() strips test fields so forced state never
   *       persists into a regular save
   */
  function applyOverride(mischiefState, testConfig) {
    if (!testConfig) return mischiefState;

    const s = mischiefState;

    // G1: the engine gates encounters on `enabled` — test mode must turn it on.
    s.enabled = true;
    s.willStrike = true;

    if (testConfig.mode === 'scare') {
      s.strikeMoves = [STRIKE_MOVE];
      s._testForceScare = true;
    } else if (testConfig.halloween) {
      // G2: Halloween needs 2 encounters allowed + Halloween theme.
      s.theme = 'halloween';
      s.maxEncounters = 2;
      s.strikeMoves = [STRIKE_MOVE, HALLOWEEN_SECOND_STRIKE];
    } else {
      s.strikeMoves = [STRIKE_MOVE];
    }

    s._testMode = testConfig.mode;
    // Marker for sanitizeForSave: this state had forced scheduling applied.
    // The sanitizer checks this BEFORE stripping fields, so it knows to
    // reset willStrike/strikeMoves even after the _testMode flag is gone.
    s._testModeWasActive = true;
    return s;
  }

  /**
   * G3: Force Pool A (scare) target selection.
   * Returns { from, col?, card, pool: 'scare' } for an exposed Joker,
   * or null if no Joker is currently exposed.
   * The integration layer MUST call this instead of the engine's
   * selectTarget() when mischiefState._testForceScare is true.
   */
  function selectScareTarget(gameState) {
    if (!gameState) return null;
    // Waste top
    const waste = gameState.waste || [];
    if (waste.length > 0) {
      const top = waste[waste.length - 1];
      if (top.isJoker) return { from: 'waste', card: top, pool: 'scare' };
    }
    // Tableau tops (face-up only)
    const tableau = gameState.tableau || [];
    for (let col = 0; col < tableau.length; col++) {
      const pile = tableau[col];
      if (pile && pile.length > 0) {
        const top = pile[pile.length - 1];
        if (top.faceUp && top.isJoker) {
          return { from: 'tableau', col, card: top, pool: 'scare' };
        }
      }
    }
    return null;  // no exposed Joker — tester must rig one
  }

  /**
   * G4 (fixed per Clara v2 review): Strip test-forced fields before the state
   * is serialized. Detects test state via _testModeWasActive BEFORE stripping,
   * then resets ALL forced scheduling so a reloaded save behaves like a
   * normal game. Returns a clean copy — the live state object is NOT mutated.
   *
   * After sanitize: willStrike=false, strikeMoves=[], enabled=false,
   * maxEncounters restored to 1, theme restored to 'classic', and ALL
   * test markers (_testMode, _testForceScare, _testModeWasActive) deleted.
   */
  function sanitizeForSave(mischiefState) {
    if (!mischiefState) return mischiefState;
    const wasTest = mischiefState._testModeWasActive === true;
    const clean = { ...mischiefState };
    // Always strip test markers
    delete clean._testMode;
    delete clean._testForceScare;
    delete clean._testModeWasActive;
    // If this was test-forced state, reset scheduling to normal defaults
    if (wasTest) {
      clean.enabled = false;
      clean.willStrike = false;
      clean.strikeMoves = [];
      clean.maxEncounters = 1;
      clean.theme = 'classic';
      // v4 (Clara v3 P1): namespace hint survives sanitization so
      // saveKeyFor() still routes to the isolated test key AFTER
      // sanitizing. Carries no scheduling data — only the key hint.
      clean.sanitizedFromTest = true;
    }
    return clean;
  }

  /**
   * G4 helper (v4): check if a mischief state is test-related.
   * Returns true for live test state (_testMode set) OR sanitized test
   * state (sanitizedFromTest set). The integration layer uses this to
   * route test games to an isolated save key.
   */
  function isTestState(mischiefState) {
    return !!(mischiefState &&
      (mischiefState._testMode || mischiefState.sanitizedFromTest));
  }

  /**
   * Get the badge text for the HUD indicator.
   */
  function badgeText(testConfig) {
    if (!testConfig) return null;
    return testConfig.mode === 'scare' ? BADGE_SCARE : BADGE_FORCED;
  }

  /**
   * Console banner for debugging clarity.
   */
  function logActivation(testConfig) {
    if (!testConfig || typeof console === 'undefined') return;
    console.log(
      '%cTSCMS Swiper TEST MODE active — encounters forced',
      'background: #6a0dad; color: white; padding: 2px 6px; border-radius: 3px;'
    );
    console.log('  mode:', testConfig.mode,
                '| halloween:', testConfig.halloween,
                '| strikes at:', testConfig.mode === 'scare'
                  ? [STRIKE_MOVE]
                  : (testConfig.halloween
                      ? [STRIKE_MOVE, HALLOWEEN_SECOND_STRIKE]
                      : [STRIKE_MOVE]));
  }

  return {
    parseFromUrl,
    applyOverride,
    selectScareTarget,
    sanitizeForSave,
    isTestState,
    badgeText,
    logActivation,
    STRIKE_MOVE,
    HALLOWEEN_SECOND_STRIKE,
    BADGE_FORCED,
    BADGE_SCARE,
  };
})();

// Export for Node harness
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SwiperTestMode;
}
