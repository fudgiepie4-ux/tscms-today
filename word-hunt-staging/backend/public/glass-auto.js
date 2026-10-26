// Final candidate: automatic status only; no user override.
(function(){'use strict';
 const host=document.getElementById('wh-demo-glass-host'),imgs=window.WORD_HUNT_IMAGES;
 if(!host||!imgs)return;
 const labels={live:'Word Hunt Live - View Riddle','not-yet':'Not Yet - Come Back Later',complete:'Four-Day Hunt Complete'};
 function display(state){
  const live=state==='live',label=labels[state]||labels['not-yet'];
  const glass=document.createElement(live?'a':'div');
  glass.className='wh-demo-glass '+(live?'is-lit':'is-dark');
  if(live){glass.href='/final-candidate/word-hunt.html';glass.setAttribute('aria-label',label);}
  else{glass.setAttribute('role','status');glass.setAttribute('aria-label',label);}
  const image=document.createElement('img');image.src=live?imgs.on:imgs.off;image.alt='';
  const caption=document.createElement('span');caption.className='wh-demo-caption';caption.textContent=label;
  glass.append(image,caption);host.dataset.state=state;host.replaceChildren(glass);
 }
 let seq=0;
 async function poll(){
  const thisPoll=++seq;
  try{
    const r=await fetch('/api/word-hunt/status',{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});
    if(!r.ok)throw Error('Not configured');
    const v=await r.json();
    if(thisPoll===seq)display(v?.state==='live'?'live':v?.state==='complete'?'complete':'not-yet');
  }catch{if(thisPoll===seq)display('not-yet');}
 }
 display('not-yet');poll();setInterval(()=>{if(!document.hidden)poll();},5000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
})();
