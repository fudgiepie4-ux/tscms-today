/* TSCMS Gamehouse jukebox — v2.1 module API (STAGING ONLY — owner-approved 2026-10-18).
 * v2.1 fixes two integration-contract holes found by Clara's independent
 * review of the v2 ZIP (2026-10-18 01:24 CT):
 *   (1) playlist map dropped artist/suno — V7's artist plate and View Song
 *       link couldn't bind. Now preserved with safe URL validation.
 *   (2) seekability guard only checked finite duration — native
 *       audio.seekable TimeRanges can be empty even with known duration.
 *       Now requires an actual seekable range; seekTo clamps into ranges.
 * Base: v2 = Clara's staging gamehouse-jukebox.js behaviors (single detached
 * <audio>, canonical radio-data.json, no arbitrator, stale-play guard,
 * stream-failure skip, legacy `tscms:jukebox` contract intact) + v2 API:
 * next()/prev() wrap-around, setVolume()/getVolume() clamped native,
 * seekTo() guarded, getPosition(), on('trackchange'|'timeupdate').
 * Track changes fire a dedicated `tscms:jukebox:trackchange` event
 * (detail {track,index}) — the legacy channel is untouched. */
(function () {
  'use strict';
  var audio = null, tracks = [], index = 0, ready = false, initPromise = null;
  var requestedPlaying = false, playGeneration = 0, streamFailures = 0;

  var EVT_TRACKCHANGE = 'tscms:jukebox:trackchange';
  var EVT_TIMEUPDATE = 'tscms:jukebox:timeupdate';

  function canDispatch() {
    return typeof document !== 'undefined' &&
      typeof document.dispatchEvent === 'function' &&
      typeof CustomEvent === 'function';
  }

  // v2.1: safe http(s) URL check for the suno link field.
  function safeUrl(u) {
    return (typeof u === 'string' && /^https?:\/\//i.test(u)) ? u : '';
  }

  // v2.1: native seekable TimeRanges as [[start,end],...]; [] when unknown.
  // Seekability is UNVERIFIED unless an actual range exists (Clara's probe:
  // duration can be finite while seekable.length is 0).
  function seekableRanges() {
    var out = [];
    try {
      var r = audio && audio.seekable;
      if (r && r.length) {
        for (var i = 0; i < r.length; i++) out.push([r.start(i), r.end(i)]);
      }
    } catch (e) { /* treat as unseekable */ }
    return out;
  }

  function announce(state, message) {
    if (canDispatch()) {
      document.dispatchEvent(new CustomEvent('tscms:jukebox', {
        detail: { state: state, message: message || '', track: tracks[index] || null }
      }));
    }
  }

  // Dedicated track-change channel (v2). Does NOT reuse the legacy
  // 'tscms:jukebox' event, so the existing tap-target UI keeps its behavior.
  function fireTrackChange() {
    if (!canDispatch()) return;
    document.dispatchEvent(new CustomEvent(EVT_TRACKCHANGE, {
      detail: { track: tracks[index] || null, index: index }
    }));
  }

  function loadTrack(i) {
    if (!tracks.length) return;
    index = ((i % tracks.length) + tracks.length) % tracks.length;
    audio.src = tracks[index].stream;
  }

  function requestPlay() {
    if (!ready) return false;
    requestedPlaying = true;
    var generation = ++playGeneration;
    try {
      // CRITICAL: execute play() synchronously inside the tap handler for Android.
      var attempt = audio.play();
      announce('starting');
      Promise.resolve(attempt).then(function () {
        if (generation === playGeneration && requestedPlaying) {
          announce('playing');
        }
      }, function () {
        if (generation === playGeneration && requestedPlaying) {
          requestedPlaying = false;
          announce('blocked', 'Sound could not start. Tap the jukebox to try again.');
        }
      });
    } catch (e) {
      if (generation === playGeneration) {
        requestedPlaying = false;
        announce('blocked', 'Sound could not start. Tap the jukebox to try again.');
      }
      return false;
    }
    return true;
  }

  var TSCMSJukebox = {
    // Fetch ahead of time on page load. Promise<boolean>. No autoplay.
    init: function (opts) {
      opts = opts || {};
      if (ready) return Promise.resolve(true);
      if (initPromise) return initPromise;
      if (!audio) {
        audio = document.createElement('audio');
        audio.preload = 'none';
        audio.addEventListener('ended', function () {
          if (!requestedPlaying || !tracks.length) return;
          loadTrack(index + 1);
          fireTrackChange();
          requestPlay();
        });
        audio.addEventListener('timeupdate', function () {
          if (audio.currentTime > 1) streamFailures = 0;
          if (canDispatch()) {
            document.dispatchEvent(new CustomEvent(EVT_TIMEUPDATE, {
              detail: { currentTime: audio.currentTime, duration: audio.duration }
            }));
          }
        });
        audio.addEventListener('error', function () {
          // Skip a failed media stream, but stop after one full cycle (no loop).
          if (!requestedPlaying || !tracks.length) return;
          streamFailures++;
          if (streamFailures >= tracks.length) {
            ++playGeneration;
            requestedPlaying = false;
            announce('unavailable', 'Radio streams are temporarily unavailable.');
            return;
          }
          loadTrack(index + 1);
          fireTrackChange();
          requestPlay();
        });
      }
      var url = opts.playlistUrl || 'radio-data.json';
      announce('loading');
      initPromise = fetch(url, { cache: 'no-store' })
        .then(function (response) {
          if (!response || response.ok === false) throw new Error('Radio playlist unavailable');
          return response.json();
        })
        .then(function (data) {
          var list = Array.isArray(data && data.playlist) ? data.playlist : [];
          tracks = list.filter(function (item) {
            return item && typeof item.stream === 'string' && /^https?:\/\//i.test(item.stream);
          }).map(function (item) {
            // v2.1: preserve artist + suno for the V7 artist plate and
            // View Song link (safe URL validation here; UI validates again
            // at final link binding).
            return {
              title: item.title || 'TSCMS Radio',
              artist: item.artist || '',
              stream: item.stream,
              suno: safeUrl(item.suno)
            };
          });
          ready = tracks.length > 0;
          if (ready) { loadTrack(0); fireTrackChange(); announce('ready'); }
          else announce('unavailable', 'No playable TSCMS Radio tracks are available.');
          return ready;
        })
        .catch(function () {
          ready = false;
          announce('unavailable', 'TSCMS Radio could not load. Please try again.');
          return false;
        })
        .then(function (loaded) {
          if (!loaded) initPromise = null; // allow a later retry
          return loaded;
        });
      return initPromise;
    },

    // Synchronous tap toggle; the return value is the requested playing state.
    toggle: function () {
      if (!ready || !audio) {
        announce('not-ready', 'Radio is loading. Please tap again in a moment.');
        return false;
      }
      if (requestedPlaying) {
        requestedPlaying = false;
        ++playGeneration; // ignore stale play() responses
        audio.pause();
        announce('paused');
        return false;
      }
      streamFailures = 0;
      return requestPlay();
    },
    isPlaying: function () { return !!(audio && ready && requestedPlaying && !audio.paused); },
    currentTrack: function () { return tracks.length ? tracks[index] : null; },

    // v2: step the playlist with wrap-around. If music is playing, the new
    // track starts playing; if paused, it just loads. Fires trackchange.
    // Returns false when not ready.
    next: function () { return stepTrack(1); },
    prev: function () { return stepTrack(-1); },

    // v2: native volume only (no GainNode — see audio guidance). Clamped
    // 0..1. Returns the applied volume, or false when no audio element yet.
    // Game pause/Undo/Hint/New Game never call this — volume is the
    // jukebox's own state.
    setVolume: function (v) {
      if (!audio) return false;
      v = Number(v);
      if (!isFinite(v)) return false;
      v = Math.min(1, Math.max(0, v));
      try { audio.volume = v; } catch (e) { return false; }
      return v;
    },
    getVolume: function () { return audio ? audio.volume : 1; },

    // v2.1: guarded seek. Returns false unless an actual seekable TimeRange
    // exists — finite duration alone is NOT enough (Clara's probe). Clamps
    // the target into the nearest valid range. Never throws; never disturbs
    // playback state. UI stays display-only until the S24 real-stream proof.
    seekTo: function (sec) {
      if (!ready || !audio) return false;
      sec = Number(sec);
      if (!isFinite(sec) || sec < 0) return false;
      var ranges = seekableRanges();
      if (!ranges.length) return false;
      var t = sec, i, r, inside = false;
      for (i = 0; i < ranges.length; i++) {
        r = ranges[i];
        if (sec >= r[0] && sec <= r[1]) { inside = true; t = sec; break; }
      }
      if (!inside) {
        var best = ranges[0][0], bestDist = Math.abs(sec - ranges[0][0]);
        for (i = 0; i < ranges.length; i++) {
          r = ranges[i];
          var d0 = Math.abs(sec - r[0]), d1 = Math.abs(sec - r[1]);
          if (d0 < bestDist) { bestDist = d0; best = r[0]; }
          if (d1 < bestDist) { bestDist = d1; best = r[1]; }
        }
        t = best;
      }
      try { audio.currentTime = t; } catch (e) { return false; }
      return true;
    },
    getPosition: function () {
      if (!audio) return { currentTime: 0, duration: NaN, seekable: false, ranges: [] };
      var dur = audio.duration;
      var ranges = seekableRanges();
      return {
        currentTime: audio.currentTime || 0,
        duration: dur,
        seekable: ranges.length > 0,
        ranges: ranges
      };
    },

    // v2: subscribe to 'trackchange' ({ track, index }) or 'timeupdate'
    // ({ currentTime, duration }). Returns an unsubscribe function.
    on: function (name, cb) {
      var noop = function () {};
      var ev = name === 'trackchange' ? EVT_TRACKCHANGE
        : name === 'timeupdate' ? EVT_TIMEUPDATE : null;
      if (!ev || typeof cb !== 'function') return noop;
      if (typeof document === 'undefined' ||
          typeof document.addEventListener !== 'function') return noop;
      var wrap = function (e) { cb((e && e.detail) || {}); };
      document.addEventListener(ev, wrap);
      return function () {
        if (typeof document.removeEventListener === 'function') {
          document.removeEventListener(ev, wrap);
        }
      };
    },

    _state: function () {
      return { ready: ready, index: index, count: tracks.length, requestedPlaying: requestedPlaying };
    }
  };

  // v2 helper: shared step logic for next()/prev().
  function stepTrack(d) {
    if (!ready || !audio || !tracks.length) return false;
    loadTrack(index + d);
    fireTrackChange();
    if (requestedPlaying) return requestPlay();
    return true;
  }

  if (typeof window !== 'undefined') window.TSCMSJukebox = TSCMSJukebox;
  if (typeof module !== 'undefined' && module.exports) module.exports = TSCMSJukebox;
})();