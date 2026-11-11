/* The generated TSCMS homepage retains tscms-quick-jump.js.
   This bootstrap survives a clean rebuild that replaces index.html in full.
   It never plays, pauses, mutes, or creates media. */
(function () {
  'use strict';
  function start() {
    if (!document.querySelector('.wrap .feat')) return;
    if (!document.querySelector('link[data-tscms-preserved="promo-calendar-style"]')) {
      var style=document.createElement('link');
      style.rel='stylesheet';
      style.href='./tscms-promo-calendar.css?v=20261111';
      style.setAttribute('data-tscms-preserved','promo-calendar-style');
      document.head.appendChild(style);
    }
    if (!document.querySelector('script[data-tscms-preserved="promo-calendar-module"]')) {
      var script=document.createElement('script');
      script.type='module';
      script.src='./tscms-promo-calendar.js?v=20261111';
      script.setAttribute('data-tscms-preserved','promo-calendar-module');
      script.onerror=function () {
        console.warn('TSCMS Coming Up could not load; the existing homepage is unchanged.');
      };
      document.head.appendChild(script);
    }
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
