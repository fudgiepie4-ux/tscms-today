/* TSCMS Halloween weather — outside the saloon ONLY.
 * Window masks use the approved 941 × 1672 art coordinates already established
 * by the earlier Halloween weather visual preview. No game logic or audio changes.
 */
(function () {
  'use strict';
  var THEME_KEY = 'tscms_solitaire_prefs_swiper_staging_v1';
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var weatherLayer = null;
  var flashGroup = null;
  var boltGroup = null;
  var stormTimer = null;
  var currentTheme = 'classic';
  var lightningOn = true; // accessibility: user can disable flashes
  var WINDOWS = [
    { x: 497, y: 148, w: 49, h: 105, count: 32 },
    { x: 560, y: 149, w: 55, h: 104, count: 36 },
    { x: 8, y: 207, w: 47, h: 76, count: 13 },
    { x: 289, y: 130, w: 51, h: 61, count: 16 }
  ];
  function prefs() {
    try { return JSON.parse(localStorage.getItem(THEME_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function savePrefs(p) {
    try { localStorage.setItem(THEME_KEY, JSON.stringify(p)); }
    catch (e) { /* Private browsing: theme still works for this session. */ }
  }
  function getTheme() { return prefs().theme || 'classic'; }
  function getLightning() { return prefs().lightning !== false; }
  function setLightning(on) {
    var p = prefs(); p.lightning = !!on; savePrefs(p);
    lightningOn = !!on;
    if (!lightningOn) { clearTimeout(stormTimer); }
    else if (currentTheme === 'halloween' && !document.hidden) scheduleStorm();
  }
  function svgNode(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (key) { el.setAttribute(key, attrs[key]); });
    return el;
  }
  function removeOldViewportWeather() {
    // Remove V5 viewport-sized weather when transitioning or hot-reloading.
    document.querySelectorAll('.hw-rain-layer, .hw-lightning-flash, .hw-bolt, .hw-moon')
      .forEach(function (el) { el.remove(); });
  }
  function createExteriorWeather() {
    var stage = document.getElementById('stage');
    if (!stage) return null;
    if (weatherLayer && weatherLayer.isConnected) return weatherLayer;
    weatherLayer = svgNode('svg', {
      'class': 'hw-window-weather', viewBox: '0 0 941 1672',
      preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false'
    });
    // Both raindrops and lightning are clipped by the EXACT same outside-only aperture.
    var defs = svgNode('defs');
    var clip = svgNode('clipPath', {id: 'hw-exterior-window-cutouts', clipPathUnits: 'userSpaceOnUse'});
    clip.appendChild(svgNode('path', {d:
      'M497 160 Q510 147 533 151 L546 153 L546 253 L497 253 Z ' +
      'M560 155 Q581 145 610 161 L615 252 L560 252 Z ' +
      'M8 227 L55 206 L55 283 L8 283 Z ' +
      'M289 129 L336 132 L341 189 L291 191 Z'
    }));
    defs.appendChild(clip);
    weatherLayer.appendChild(defs);
    var outside = svgNode('g', {'clip-path': 'url(#hw-exterior-window-cutouts)'});
    flashGroup = svgNode('g', {'class': 'hw-window-flash'});
    flashGroup.appendChild(svgNode('rect', {x: 0, y: 0, width: 941, height: 310, 'class': 'hw-flash-fill'}));
    outside.appendChild(flashGroup);
    var rain = svgNode('g', {'class': 'hw-window-rain'});
    WINDOWS.forEach(function (windowBox) {
      for (var i = 0; i < windowBox.count; i++) {
        var x = windowBox.x + Math.random() * windowBox.w;
        var y = windowBox.y - 35 + Math.random() * (windowBox.h + 55);
        var len = 7 + Math.random() * 15;
        var drop = svgNode('line', {
          x1: x.toFixed(1), y1: y.toFixed(1),
          x2: (x - 3 - Math.random() * 5).toFixed(1), y2: (y + len).toFixed(1)
        });
        drop.style.setProperty('--hw-duration', (0.7 + Math.random() * 0.75).toFixed(2) + 's');
        drop.style.setProperty('--hw-delay', (-Math.random() * 2).toFixed(2) + 's');
        rain.appendChild(drop);
      }
    });
    outside.appendChild(rain);
    boltGroup = svgNode('g', {'class': 'hw-window-bolts'});
    outside.appendChild(boltGroup);
    weatherLayer.appendChild(outside);
    stage.appendChild(weatherLayer);
    return weatherLayer;
  }
  function createCobwebs() {
    var stage = document.getElementById('stage');
    if (!stage) return;
    ['tl', 'tr'].forEach(function (pos) {
      if (stage.querySelector('.hw-cobweb.' + pos)) return;
      var web = document.createElement('div');
      web.className = 'hw-cobweb ' + pos;
      web.textContent = '🕸️';
      web.setAttribute('aria-hidden', 'true');
      stage.appendChild(web);
    });
  }
  function makeExteriorBolt(violet) {
    if (!boltGroup) return;
    boltGroup.replaceChildren();
    // A branching lightning bolt in the SKY BEYOND THE SALOON WINDOWS.
    // The clipping group prevents any branch from crossing window trim or walls.
    var x = 523 + Math.random() * 65, y = 153, points = [[x, y]];
    for (var i = 0; i < 12; i++) {
      x = Math.max(499, Math.min(610, x + (Math.random() - .5) * 23));
      y += 7 + Math.random() * 6;
      points.push([x, y]);
    }
    var paths = [points];
    for (var j = 0; j < 5; j++) {
      var at = 1 + Math.floor(Math.random() * (points.length - 4));
      var fork = [points[at]], bx = points[at][0], by = points[at][1];
      var sign = Math.random() < .5 ? -1 : 1;
      for (var k = 0; k < 3; k++) {
        bx = Math.max(499, Math.min(610, bx + sign * (5 + Math.random() * 9)));
        by += 5 + Math.random() * 5;
        fork.push([bx, by]);
      }
      paths.push(fork);
    }
    paths.forEach(function (pts, index) {
      var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
      boltGroup.appendChild(svgNode('path', {
        d: d, fill: 'none', stroke: violet ? '#b977ee' : '#68bcff',
        'stroke-width': index ? 4 : 8, 'stroke-linecap': 'round', opacity: .5
      }));
      boltGroup.appendChild(svgNode('path', {
        d: d, fill: 'none', stroke: violet ? '#f4dfff' : '#eefaff',
        'stroke-width': index ? .8 : 1.8, 'stroke-linecap': 'round'
      }));
    });
  }
  function scheduleStorm() {
    clearTimeout(stormTimer);
    if (currentTheme !== 'halloween' || document.hidden) return;
    stormTimer = setTimeout(strikeLightning, 7000 + Math.random() * 9000);
  }
  function strikeLightning() {
    if (currentTheme !== 'halloween' || document.hidden || !lightningOn) { scheduleStorm(); return; }
    if (!createExteriorWeather()) return;
    var violet = Math.random() < .38;
    makeExteriorBolt(violet);
    flashGroup.classList.toggle('violet', violet);
    flashGroup.classList.remove('flash');
    boltGroup.classList.remove('flash');
    void weatherLayer.getBoundingClientRect().width; // Restart the 310ms strike animation.
    flashGroup.classList.add('flash');
    boltGroup.classList.add('flash');
    scheduleStorm();
  }
  function applyTheme(theme) {
    currentTheme = theme === 'halloween' ? 'halloween' : 'classic';
    document.documentElement.setAttribute('data-theme', currentTheme);
    removeOldViewportWeather();
    if (currentTheme === 'halloween') {
      createExteriorWeather();
      createCobwebs();
      scheduleStorm();
    } else {
      clearTimeout(stormTimer);
      if (weatherLayer) weatherLayer.remove();
      weatherLayer = flashGroup = boltGroup = null;
      document.querySelectorAll('.hw-cobweb').forEach(function (el) { el.remove(); });
    }
  }
  function setTheme(theme, applyNow) {
    theme = theme === 'halloween' ? 'halloween' : 'classic';
    var p = prefs();
    p.theme = theme;
    savePrefs(p);
    if (applyNow) applyTheme(theme);
    document.dispatchEvent(new CustomEvent('tscms:theme-changed', {detail: {theme: theme}}));
  }
  function init() {
    lightningOn = getLightning();
    applyTheme(getTheme());
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearTimeout(stormTimer);
      else if (currentTheme === 'halloween') scheduleStorm();
    });
    window.TSCMSHalloween = {getTheme: getTheme, setTheme: setTheme, applyTheme: applyTheme, getLightning: getLightning, setLightning: setLightning};
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
