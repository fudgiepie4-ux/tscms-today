/* TSCMS Word Hunt: browser + Node test helpers; NO secret answers or keys here. */
(function(root){
  'use strict';
  const STATES = Object.freeze(['not-yet','live','closed','complete']);
  function normalizeGuess(value){
    return String(value == null ? '' : value).normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('en-US');
  }
  function validState(state){return STATES.includes(state) ? state : 'not-yet';}
  function statusLooksUsable(data){
    return !!data && typeof data==='object' && STATES.includes(data.state) &&
      (data.state!=='live' || (typeof data.riddle==='string' && data.riddle.trim().length>0));
  }
  function chicagoTime(utc){
    const ms=Date.parse(utc);
    if(!Number.isFinite(ms))return null;
    return new Intl.DateTimeFormat('en-US',{
      timeZone:'America/Chicago',month:'short',day:'numeric',year:'numeric',
      hour:'numeric',minute:'2-digit',second:'2-digit',timeZoneName:'short'
    }).format(new Date(ms));
  }
  const api={normalizeGuess, validState,statusLooksUsable,chicagoTime};
  root.TSCMSWordHuntCore=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
