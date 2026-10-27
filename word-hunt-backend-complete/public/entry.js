
(() => {
  'use strict';
  // No answer, drop time, or admin list is stored in this public HTML.
  // Entry persistence and drop status are provided by Clara's server API.
  const statusUrl = '/api/word-hunt/status';
  const checkUrl = '/api/word-hunt/check';
  const form = document.getElementById('entry-form');
  const feedback = document.getElementById('entry-message');
  const button = document.getElementById('submit-word');
  const clue = document.getElementById('today-riddle');
  let live = false, day = '', busy = false;
  const normalize = value => String(value || '').normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US');
  const say = (message,kind='neutral') => { feedback.textContent=message;feedback.dataset.kind=kind; };
  const chicagoTime = iso => {
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return null;
    return new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit',timeZoneName:'short'}).format(date);
  };
  async function refresh() {
    if (location.protocol === 'file:') return; // Keep the design preview visible without pretending to have a checker.
    try {
      const response = await fetch(statusUrl,{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('status unavailable');
      const data = await response.json();
      if (data && data.state === 'live' && typeof data.riddle === 'string' && data.riddle.trim() && /^\d{4}-\d{2}-\d{2}$/.test(data.contestDateCT || '')) {
        live = true; day = data.contestDateCT; clue.textContent=data.riddle.trim();
      } else {
        live = false;day='';clue.textContent='Can you find it?';
      }
    } catch { live=false;day='';clue.textContent='Can you find it?'; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if(busy)return;
    if (!form.reportValidity()) return;
    const word=normalize(form.elements.word.value);
    const name=String(form.elements.name.value).trim().replace(/\s+/gu,' ');
    const email=String(form.elements.email.value).trim();
    if (!word || !name || !email) { say('Please complete all three fields.','error');return; }
    if (location.protocol === 'file:') { say('Design preview only. The private checker is not connected, and no entry has been recorded.','error');return; }
    busy=true; await refresh();
    if (!live) { say('The hunt is not accepting entries right now. Come back when the magnifying glass is glowing.','error');busy=false;return; }
    button.disabled=true;button.textContent='CHECKING…';say('Checking your word securely…');
    try {
      const response=await fetch(checkUrl,{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({word,name,email,contestDateCT:day,clientSubmittedAtUTC:new Date().toISOString()})
      });
      if (!response.ok) throw new Error('checker unavailable');
      const data=await response.json();
      if (data?.result==='incorrect') say('Not quite! You can try again. Keep hunting! 🔎','retry');
      else if (data?.result==='correct' && data.recorded===true && typeof data.acceptedAtUTC==='string' && chicagoTime(data.acceptedAtUTC)) {
        say('Correct! Your entry was recorded at '+chicagoTime(data.acceptedAtUTC)+'. '+data.totalEntries+' chances recorded (1 base + '+data.bonusEntries+' bonus).'+(data.testOnly?' STAGING TEST ONLY.':''),'success');form.elements.word.value='';
      } else if (data?.result==='closed') say('Today\'s entry window has closed at midnight Central.','error');
      else if (data?.result==='ineligible') say('Admins are not eligible for prize entries. No entry was recorded.','error');
      else if (data?.result==='test-only') say('Staging test only: use an email ending in @example.invalid.','error');
      else if (data?.result==='rate-limited') say('Please wait a few seconds, then try again.','error');
      else if (data?.result==='duplicate') say('Your entry for today was already recorded.','neutral');
      else say('Your entry could not be confirmed. Please try again later.','error');
    } catch { say('The checker is unavailable. No entry was confirmed. Please try again later.','error'); }
    finally { busy=false; button.disabled=false; button.textContent='CHECK MY WORD'; }
  });
  refresh();setInterval(() => { if (!document.hidden) refresh(); },5000);
})();
