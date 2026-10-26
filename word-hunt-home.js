/* TSCMS homepage indicator: append-only to existing hero. Glass-only early release Oct 26, 2026; full hunt goes live at the final tap. */
(function(){
  'use strict';
  const API='https://tscms-word-hunt-production-candidate-fudgiepie4-7168s-projects.vercel.app/api/word-hunt/status';
  const GLASS={lit:'./assets/glass-lit.webp',dark:'./assets/glass-dark.webp'};
  const TEXT={
    live:'Word Hunt Live - View Riddle',
    'not-yet':'Not Yet - Come Back Later',
    'coming-soon':'Word Hunt Coming Soon - Starts Tuesday, Oct 27',
    closed:'Today’s Hunt Has Ended',
    complete:'Four-Day Hunt Complete'
  };
  // Pre-launch only: before Oct 27 Central, show Coming Soon and never light,
  // even if a backend answered live. From Oct 27 on, normal live/not-yet logic.
  function centralDateStr(){
    return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  }
  function isPreLaunch(){return centralDateStr()<'2026-10-27';}
  const core=window.TSCMSWordHuntCore;
  function makeFrame(state){
    const lit=state==='live',label=TEXT[state]||TEXT['not-yet'];
    const frame=document.createElement(lit?'a':'div');
    frame.className='wh-glass-frame '+(lit?'is-lit':'is-dark');
    if(lit){frame.href='./word-hunt.html';frame.target='_self';frame.setAttribute('aria-label',label);}
    else{frame.setAttribute('role','status');frame.setAttribute('aria-label',label);}
    const img=document.createElement('img');img.alt='';img.width=280;img.height=194;
    img.src=lit?GLASS.lit:GLASS.dark;
    img.decoding='async';img.loading='eager';
    const caption=document.createElement('span');caption.className='wh-glass-label';caption.textContent=label;
    frame.append(img,caption);
    return frame;
  }
  function render(host,state){host.replaceChildren(makeFrame(state));host.dataset.state=state;}
  // Placement: directly ABOVE the Quick Jump bar, never below the hero panels.
  // The Quick Jump bar renders after this script may run, so placement is
  // re-checked on every poll and the container is moved if it is not there yet.
  function place(container){
    const bar=document.getElementById('tscms-qj-bar');
    if(bar&&bar.parentNode){
      if(container.nextSibling!==bar)bar.parentNode.insertBefore(container,bar);
      return true;
    }
    return false;
  }
  async function poll(host){
    const container=document.getElementById('tscms-wordhunt-hero');
    if(container)place(container);
    if(isPreLaunch()){render(host,'coming-soon');return;}
    try{
      const resp=await fetch(API,{cache:'no-store',credentials:'omit',headers:{'Accept':'application/json'}});
      if(!resp.ok)throw new Error('status unavailable');
      const data=await resp.json();
      if(!core.statusLooksUsable(data))throw new Error('invalid status');
      render(host,core.validState(data.state));
    } catch(e) {render(host,'not-yet');} // Fail closed: never enable the hunt on missing backend.
  }
  function initialize(){
    const header=document.querySelector('.wrap header')||document.querySelector('main header');
    if(!header||document.getElementById('tscms-wordhunt-hero')||!core)return;
    const container=document.createElement('section');
    container.id='tscms-wordhunt-hero';container.className='tscms-wordhunt-home';
    container.setAttribute('aria-label','$30 TSCMS Word Hunt');
    const host=document.createElement('div');host.id='tscms-wordhunt-indicator';
    render(host,isPreLaunch()?'coming-soon':'not-yet');container.append(host);
    if(!place(container))header.append(container); // Fallback only until the Quick Jump bar exists.
    poll(host);
    window.setInterval(()=>{if(!document.hidden)poll(host);},5000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll(host);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
