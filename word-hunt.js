/* TSCMS public checker FRONT END only. No answer embedded. Backend by Cherish. */
(function(){
  'use strict';
  const STATUS='./api/word-hunt/status',CHECK='./api/word-hunt/check';
  const core=window.TSCMSWordHuntCore;
  const clue=document.getElementById('wh-riddle-text');
  const intro=document.getElementById('wh-daily-status');
  const form=document.getElementById('wh-entry-form');
  const message=document.getElementById('wh-result');
  const submit=document.getElementById('wh-submit');
  if(!clue||!form||!message||!core)return;
  let active=false;
  let contestDateCT='';
  let working=false;
  function say(text,kind){message.textContent=text;message.dataset.kind=kind||'neutral';}
  function setEnabled(enabled){
    active=!!enabled;
    Array.from(form.elements).forEach((el)=>{if(el.tagName==='INPUT')el.disabled=!active;});
    submit.disabled=!active||working;
  }
  function renderStatus(data){
    const state=core.validState(data&&data.state);
    if(state==='live'&&core.statusLooksUsable(data)){
      contestDateCT=typeof data.contestDateCT==='string'?data.contestDateCT:'';
      clue.textContent=data.riddle.trim();
      intro.textContent='The glass is glowing! Follow today’s clue to a PUBLIC page, then return here to enter.';
      setEnabled(true);
    }else{
      contestDateCT='';
      setEnabled(false);
      clue.textContent='Today’s clue will appear here after the surprise drop.';
      intro.textContent=state==='complete'?'The four-day hunt has finished.':state==='closed'?'Today’s entry window has closed at midnight Central.':'Not yet — come back later to see today’s clue.';
    }
  }
  async function getStatus(){
    try{
      const r=await fetch(STATUS,{cache:'no-store',credentials:'same-origin',headers:{'Accept':'application/json'}});
      if(!r.ok)throw Error('status');
      const data=await r.json();
      if(!core.statusLooksUsable(data))throw Error('invalid');
      renderStatus(data);
    }catch(e){renderStatus({state:'not-yet'});intro.textContent='Hunt status temporarily unavailable. Please check again later.';}
  }
  form.addEventListener('submit',async function(e){
    e.preventDefault();
    if(working||!active)return;
    const fd=new FormData(form);
    const word=core.normalizeGuess(fd.get('word'));
    const name=String(fd.get('name')||'').trim().replace(/\s+/gu,' ');
    const email=String(fd.get('email')||'').trim();
    if(!word||!name||!email||!form.reportValidity()){
      say('Please enter the hidden word, your name, and a valid email address.','error');return;
    }
    working=true;submit.disabled=true;submit.textContent='Checking…';say('Checking your word securely…','neutral');
    try{
      // Client time is diagnostic only. The BACKEND must timestamp acceptance itself.
      const payload={word,name,email,contestDateCT,clientSubmittedAtUTC:new Date().toISOString()};
      const r=await fetch(CHECK,{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)
      });
      if(!r.ok)throw Error('Entry service unavailable');
      const data=await r.json();
      if(data&&data.result==='incorrect'){
        say('Not quite! You can try again — keep hunting. 🔎','retry');
      }else if(data&&data.result==='correct'&&data.recorded===true&&data.acceptedAtUTC&&core.chicagoTime(data.acceptedAtUTC)){
        say('Correct! Your entry was recorded at '+core.chicagoTime(data.acceptedAtUTC)+'. Good luck! 🎉','success');
        form.elements.namedItem('word').value='';
      }else if(data&&data.result==='closed'){
        setEnabled(false);say('Today’s entry window has closed. Entries must arrive by midnight Central.','error');
      }else if(data&&data.result==='duplicate'){
        say('A correct entry for this day is already recorded for this email.','neutral');
      }else{
        // Do not claim saved without a backend-confirmed acceptance timestamp.
        say('Your entry could not be confirmed. No timestamp was provided. Please try again or contact an admin.','error');
      }
    }catch(e){say('The checker is temporarily unavailable. Your entry is NOT confirmed; please retry later.','error');}
    finally{working=false;submit.textContent='CHECK MY WORD';submit.disabled=!active;}
  });
  setEnabled(false);getStatus();
  window.setInterval(()=>{if(!document.hidden&&!working)getStatus();},90000);
})();
