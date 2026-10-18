/* ============================================================
   TSCMS Swiper — Visual Encounter Diagnostic (v1)
   Cherish, 2026-10-18 — staging only, test mode.

   PURPOSE: Fudgie's acceptance blocker — forced ?swiper_test=100
   fires the encounter LOGIC but shows NOTHING on screen. This module
   provides a TRUTHFUL visible diagnostic: it shows exactly what the
   engine did, when, and to which card. It is NOT a fake animation.

   ASSET STATUS (per Clara's instruction to state exactly):
   - Approved 4-panel "GHOST ENCOUNTER / JOKER SCARE" comic: exists
     in Drive (01_Public_Website) but NOT in the repo. Cannot be
     referenced from the staging page.
   - Approved 7-panel animation reference + 10-frame asset sheet:
     exists in Drive, NOT in the repo. No cut-out sprite PNGs exist.
   - CONCLUSION: No usable Swiper sprite assets exist in the repo.
     This diagnostic uses text + emoji only, clearly labeled.

   EVENTS WIRED:
     mischief:strike  — encounter scheduled/fired
     mischief:target  — card selected as target
     mischief:steal   — card stolen
     mischief:place   — card hidden at destination
     mischief:burned  — Joker scare (zero cards moved)
     mischief:leave   — Swiper leaves

   BEHAVIOR:
   - Panel appears bottom-center on first event, updates per event.
   - Auto-hides after 8s of no events.
   - Cleared on: pause, new game, reload, victory, navigation.
   - Never touches card DOM. Never interrupts jukebox.
   - Only active when SwiperLaunchBootstrap.isTest() is true.
   ============================================================ */
(function () {
  'use strict';

  var PANEL_ID = 'swiper-diag-panel';
  var hideTimer = null;
  var eventLog = [];

  var CSS = [
    '#' + PANEL_ID + '{position:fixed;z-index:99995;bottom:70px;left:50%;transform:translateX(-50%);',
    'max-width:92vw;width:380px;background:#1a0f08;color:#ffe2a6;',
    'border:2px solid #b68b4d;border-radius:10px;padding:12px 14px;',
    'font:400 13px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;',
    'box-shadow:0 4px 20px rgba(0,0,0,.6);}',
    '#' + PANEL_ID + '[hidden]{display:none;}',
    '#' + PANEL_ID + ' .diag-head{font:700 14px/1.3 system-ui,sans-serif;color:#ffd75e;',
    'margin:0 0 6px;display:flex;align-items:center;gap:8px;}',
    '#' + PANEL_ID + ' .diag-badge{background:#5c2f70;color:#fff;font:700 10px/1 system-ui;',
    'padding:3px 8px;border-radius:999px;letter-spacing:.5px;}',
    '#' + PANEL_ID + ' .diag-event{margin:4px 0;padding:6px 8px;background:#2a1a0e;border-radius:6px;}',
    '#' + PANEL_ID + ' .diag-event .t{color:#ffd75e;font-weight:700;}',
    '#' + PANEL_ID + ' .diag-note{margin:8px 0 0;font-size:11px;color:#b68b4d;}'
  ].join('\n');

  function cardName(card) {
    if (!card) return '(none)';
    if (card.isJoker) return '🃏 Joker';
    var suits = { S: '♠', H: '♥', D: '♦', C: '♣' };
    var vals = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
    var v = vals[card.value] || card.value;
    var s = suits[card.suit] || card.suit || '';
    return v + s;
  }

  function ensurePanel() {
    var panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-live', 'polite');
    panel.hidden = true;
    document.body.appendChild(panel);
    return panel;
  }

  function render() {
    var panel = ensurePanel();
    if (eventLog.length === 0) {
      panel.hidden = true;
      return;
    }
    var html = '<div class="diag-head">👻 Swiper Encounter ' +
      '<span class="diag-badge">TEST DIAGNOSTIC</span></div>';
    // Show last 3 events
    var recent = eventLog.slice(-3);
    for (var i = 0; i < recent.length; i++) {
      var e = recent[i];
      html += '<div class="diag-event"><span class="t">' + e.label + '</span> ' +
        e.detail + '</div>';
    }
    html += '<div class="diag-note">This is a test diagnostic, not the final ' +
      'Swiper animation. Approved sprite art is not yet in the repo.</div>';
    panel.innerHTML = html;
    panel.hidden = false;

    // Auto-hide after 8s
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      var p = document.getElementById(PANEL_ID);
      if (p) p.hidden = true;
    }, 8000);
  }

  function log(label, detail) {
    var now = new Date();
    var ts = now.toTimeString().slice(0, 8);
    eventLog.push({ label: label, detail: '[' + ts + '] ' + detail });
    // Keep last 20
    if (eventLog.length > 20) eventLog = eventLog.slice(-20);
    render();
  }

  function clear() {
    eventLog = [];
    var panel = document.getElementById(PANEL_ID);
    if (panel) panel.hidden = true;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  }

  function isTestActive() {
    return (typeof SwiperLaunchBootstrap !== 'undefined') &&
      SwiperLaunchBootstrap.isTest();
  }

  function wire() {
    if (typeof document === 'undefined') return;

    document.addEventListener('mischief:strike', function (e) {
      if (!isTestActive()) return;
      var d = (e && e.detail) || {};
      log('STRIKE 👻', 'Swiper encounter fired at move ' + (d.moveCount || '?'));
    });

    document.addEventListener('mischief:target', function (e) {
      if (!isTestActive()) return;
      var d = (e && e.detail) || {};
      log('TARGET 🎯', 'Targeting ' + cardName(d.card) +
        (d.from ? ' from ' + d.from : ''));
    });

    document.addEventListener('mischief:steal', function (e) {
      if (!isTestActive()) return;
      var d = (e && e.detail) || {};
      log('STEAL 😈', 'Stole ' + cardName(d.card));
    });

    document.addEventListener('mischief:place', function (e) {
      if (!isTestActive()) return;
      var d = (e && e.detail) || {};
      log('HIDDEN 🫣', 'Card hidden ' +
        (d.destination ? 'at ' + d.destination : 'face-down'));
    });

    document.addEventListener('mischief:burned', function (e) {
      if (!isTestActive()) return;
      var d = (e && e.detail) || {};
      log('SCARED 😱', 'Joker scared Swiper! Zero cards moved. ' +
        cardName(d.card) + ' untouched.');
    });

    document.addEventListener('mischief:leave', function (e) {
      if (!isTestActive()) return;
      log('LEAVE 👋', 'Swiper fled the saloon.');
    });

    // Clear on game state changes
    document.addEventListener('game:newgame', clear);
    document.addEventListener('game:pause', clear);
    document.addEventListener('game:victory', clear);
    window.addEventListener('beforeunload', clear);
  }

  // Auto-wire on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }

  window.SwiperVisualDiagnostic = {
    _log: log,
    _clear: clear,
    _events: function () { return eventLog.slice(); }
  };
})();
