/* TSCMS Phase 1 Gamehouse jukebox — reviewed adaptation of Cherish's 2026-10-17
   isolated audio module. Staging only. Real radio-data.json, no demo playlist.
   The music element is independent of gameplay, ambience, SFX and video.
   No autoplay; user tap is the only starting gesture. */
(function () {
  'use strict';
  var audio = null, tracks = [], index = 0, ready = false, initPromise = null;
  var requestedPlaying = false, playGeneration = 0, streamFailures = 0;

  function announce(state, message) {
    if (typeof document.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      document.dispatchEvent(new CustomEvent('tscms:jukebox', {
        detail: { state: state, message: message || '', track: tracks[index] || null }
      }));
    }
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
          requestPlay();
        });
        audio.addEventListener('timeupdate', function () {
          if (audio.currentTime > 1) streamFailures = 0;
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
            return { title: item.title || 'TSCMS Radio', stream: item.stream };
          });
          ready = tracks.length > 0;
          if (ready) { loadTrack(0); announce('ready'); }
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
    _state: function () {
      return { ready: ready, index: index, count: tracks.length, requestedPlaying: requestedPlaying };
    }
  };

  if (typeof window !== 'undefined') window.TSCMSJukebox = TSCMSJukebox;
  if (typeof module !== 'undefined' && module.exports) module.exports = TSCMSJukebox;
})();
