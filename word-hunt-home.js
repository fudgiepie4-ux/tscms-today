/* TSCMS homepage indicator: append-only to existing hero, STAGING until approved. */
(function(){
  'use strict';
  const API='https://tscms-word-hunt-production-candidate-fudgiepie4-7168s-projects.vercel.app/api/word-hunt/status';
  const GLASS={lit:'./assets/glass-lit.webp',dark:'./assets/glass-dark.webp'};
  const TEXT={
    live:'Word Hunt Live - View Riddle',
    'not-yet':'Not Yet - Come Back Later',
    closed:'Today’s Hunt Has Ended',
    complete:'Four-Day Hunt Complete'
  };
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
  async function poll(host){
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
    render(host,'not-yet');container.append(host);
    header.append(container); // Preserve all original homepage songs, navigation, and hero markup.
    poll(host);
    window.setInterval(()=>{if(!document.hidden)poll(host);},5000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll(host);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
