/* TSCMS Halloween Theme Controller
 * Toggles V5-approved weather effects on the clean staging game.
 * Theme persists via SessionManager prefs. Applies on next New Game.
 * No audio. No game logic changes. No test UI.
 */
(function() {
  'use strict';

  var THEME_KEY = 'tscms_solitaire_prefs_swiper_staging_v1';
  var RAIN_DROPS = 60;
  var rainLayer = null;
  var flashEl = null;
  var boltEl = null;
  var stormTimer = null;
  var currentTheme = 'classic';

  function getPrefs() {
    try {
      return JSON.parse(localStorage.getItem(THEME_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function savePrefs(prefs) {
    try {
      localStorage.setItem(THEME_KEY, JSON.stringify(prefs));
    } catch (e) {}
  }

  function getTheme() {
    var prefs = getPrefs();
    return prefs.theme || 'classic';
  }

  function setTheme(theme, applyNow) {
    var prefs = getPrefs();
    prefs.theme = theme;
    savePrefs(prefs);
    currentTheme = theme;
    if (applyNow) {
      applyTheme(theme);
    }
    // Notify menu to update button states
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('tscms:theme-changed', { detail: { theme: theme } }));
    }
  }

  function createRainLayer() {
    if (rainLayer) return rainLayer;
    rainLayer = document.createElement('div');
    rainLayer.className = 'hw-rain-layer';
    rainLayer.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < RAIN_DROPS; i++) {
      var drop = document.createElement('div');
      drop.className = 'hw-rain-drop';
      drop.style.left = (Math.random() * 100) + '%';
      drop.style.height = (10 + Math.random() * 20) + 'px';
      drop.style.animationDuration = (0.5 + Math.random() * 0.7) + 's';
      drop.style.animationDelay = (Math.random() * 2) + 's';
      rainLayer.appendChild(drop);
    }
    return rainLayer;
  }

  function createFlash() {
    if (flashEl) return flashEl;
    flashEl = document.createElement('div');
    flashEl.className = 'hw-lightning-flash';
    flashEl.setAttribute('aria-hidden', 'true');
    return flashEl;
  }

  function createBolt() {
    if (boltEl) return boltEl;
    boltEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    boltEl.setAttribute('class', 'hw-bolt');
    boltEl.setAttribute('width', '120');
    boltEl.setAttribute('height', '200');
    boltEl.setAttribute('viewBox', '0 0 120 200');
    boltEl.setAttribute('aria-hidden', 'true');
    // Simple branching bolt path (V5-inspired)
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M65,5 L45,80 L60,80 L40,150 L55,150 L35,195');
    path.setAttribute('stroke', '#edfaff');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    var glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    glow.setAttribute('d', 'M65,5 L45,80 L60,80 L40,150 L55,150 L35,195');
    glow.setAttribute('stroke', '#5fa8ff');
    glow.setAttribute('stroke-width', '8');
    glow.setAttribute('fill', 'none');
    glow.setAttribute('stroke-linecap', 'round');
    glow.setAttribute('opacity', '0.4');
    boltEl.appendChild(glow);
    boltEl.appendChild(path);
    boltEl.style.top = '5%';
    boltEl.style.left = '60%';
    return boltEl;
  }

  function createCobwebs() {
    var positions = ['tl', 'tr'];
    positions.forEach(function(pos) {
      if (document.querySelector('.hw-cobweb.' + pos)) return;
      var web = document.createElement('div');
      web.className = 'hw-cobweb ' + pos;
      web.textContent = '🕸️';
      web.setAttribute('aria-hidden', 'true');
      document.body.appendChild(web);
    });
  }

  function createMoon() {
    if (document.querySelector('.hw-moon')) return;
    var moon = document.createElement('div');
    moon.className = 'hw-moon';
    moon.setAttribute('aria-hidden', 'true');
    document.body.appendChild(moon);
  }

  function strikeLightning() {
    if (currentTheme !== 'halloween') return;
    if (document.hidden) return;

    var violet = Math.random() < 0.38;
    var flash = createFlash();
    var bolt = createBolt();

    if (!flash.parentNode) document.body.appendChild(flash);
    if (!bolt.parentNode) document.body.appendChild(bolt);

    flash.classList.remove('violet');
    if (violet) flash.classList.add('violet');

    // Randomize bolt position
    bolt.style.left = (50 + Math.random() * 30) + '%';

    flash.classList.remove('flash');
    bolt.classList.remove('flash');
    // Force reflow
    void flash.offsetWidth;
    flash.classList.add('flash');
    bolt.classList.add('flash');

    scheduleStorm();
  }

  function scheduleStorm() {
    clearTimeout(stormTimer);
    if (currentTheme !== 'halloween') return;
    // Every 7-16 seconds
    stormTimer = setTimeout(strikeLightning, 7000 + Math.random() * 9000);
  }

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);

    if (theme === 'halloween') {
      // Add weather elements
      var rain = createRainLayer();
      if (!rain.parentNode) document.body.appendChild(rain);
      createCobwebs();
      createMoon();
      scheduleStorm();
    } else {
      // Remove weather elements
      clearTimeout(stormTimer);
      var rl = document.querySelector('.hw-rain-layer');
      if (rl) rl.remove();
      rainLayer = null;
      var fl = document.querySelector('.hw-lightning-flash');
      if (fl) fl.remove();
      flashEl = null;
      var bl = document.querySelector('.hw-bolt');
      if (bl) bl.remove();
      boltEl = null;
      document.querySelectorAll('.hw-cobweb, .hw-moon').forEach(function(el) {
        el.remove();
      });
    }
  }

  function init() {
    var theme = getTheme();
    applyTheme(theme);

    // Handle visibility changes
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        clearTimeout(stormTimer);
      } else if (currentTheme === 'halloween') {
        scheduleStorm();
      }
    });

    // Expose API
    window.TSCMSHalloween = {
      getTheme: getTheme,
      setTheme: setTheme,
      applyTheme: applyTheme
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
