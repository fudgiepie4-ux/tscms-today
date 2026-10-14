function mcToggle(id){document.getElementById(id).classList.toggle('open');}
/* DANGER ZONE working queue — personal frontend checklist, 5/10 toggle */
var ZD=[];var ZS=5;var ZN={};var ZE={};
try{ZN=JSON.parse(sessionStorage.getItem('dz_done')||'{}');}catch(e){ZN={};}
function zs(){try{sessionStorage.setItem('dz_done',JSON.stringify(ZN));}catch(e){}}
function zq(n){ZS=n;
document.getElementById('mc-q5').classList.toggle('active',n===5);
document.getElementById('mc-q10').classList.toggle('active',n===10);
zr();}
function zi(dangerData){
ZD=(dangerData||[]).slice().sort(function(a,b){return (b.wait_h||0)-(a.wait_h||0);});
document.getElementById('mc-danger-total').textContent=ZD.length;
zr();}
function zv(){
// Oldest first, exclude done-this-session from the visible batch
var avail=ZD.filter(function(e){return !ZN[e.url];});
return avail.slice(0,ZS);}
function zr(){
var el=document.getElementById('mc-danger-list');if(!el)return;
var list=zv();
var FB='https://facebook.com/groups/1410002804113962/permalink/';
el.innerHTML=list.map(function(e){
var pid=String(e.url||'#').split('/permalink/').pop().replace(/\/$/,'');
var tier=Array.isArray(e.tier)?e.tier[0]:e.tier;
var done=!!ZN[e.url];
return '<div class="erow'+(done?' done':'')+'">'+
'<label class="dz-check"><input type="checkbox"'+(done?' checked':'')+' onchange="zt(\''+e.url.replace(/'/g,"\\'")+'\',this.checked)"><span>✓</span></label>'+
'<div class="emain"><div class="et">'+escHtml(e.author)+'</div>'+
'<div class="etier">'+escHtml(tier)+'</div></div>'+
'<div class="ehrs">'+e.wait_h+'h</div>'+
'<a class="epill" href="'+FB+escHtml(pid)+'" target="_blank">OPEN POST \u2197</a></div>';
}).join('')||'<div class="mc-empty">All clear — nothing waiting.</div>';
var msg=document.getElementById('mc-danger-msg');
if(msg){var remaining=ZD.filter(function(e){return !ZN[e.url];}).length;
msg.textContent=remaining===0?'Queue clear! All eligible posts worked this session.':'';}}
function zt(url,checked){
if(checked){ZN[url]=1;}else{delete ZN[url];}
zs();zr();}
function zf(){
// Keep unchecked, drop checked from view, fill with next oldest
zr();
var msg=document.getElementById('mc-danger-msg');
var remaining=ZD.filter(function(e){return !ZN[e.url];}).length;
if(msg){
if(remaining===0){msg.textContent='Queue clear! All eligible posts worked this session.';}
else if(remaining<=ZS){msg.textContent='No additional eligible posts available.';}
}
setTimeout(function(){var m=document.getElementById('mc-danger-msg');
if(m&&(m.textContent==='No additional eligible posts available.'))m.textContent='';},4000);}
function b64ToBytes(b){const s=atob(b);const a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a;}
function showTab(w){
  document.getElementById('tab-public').style.display=w==='public'?'block':'none';
  document.getElementById('tab-admin').style.display=w==='admin'?'block':'none';
  document.getElementById('tabbtn-public').classList.toggle('on',w==='public');
  document.getElementById('tabbtn-admin').classList.toggle('on',w==='admin');
}
async function unlockAdmin(){
  const v=document.getElementById('apw').value;
  const err=document.getElementById('pwerr');
  if(!v){ err.textContent='ENTER THE PASSWORD FIRST'; return; }
  err.textContent='LOADING…';
  let b;
  try{
    const r=await fetch('admin-data.enc.json');
    if(!r.ok) throw new Error('http '+r.status);
    b=await r.json();
  }catch(e){ err.textContent='COULDN’T LOAD DATA — CHECK CONNECTION & RETRY'; return; }
  err.textContent='DECRYPTING…';
  let d;
  try{
    const enc=new TextEncoder();
    const baseKey=await crypto.subtle.importKey('raw',enc.encode(v),'PBKDF2',false,['deriveKey']);
    const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64ToBytes(b.salt),iterations:b.iter,hash:'SHA-256'},baseKey,{name:'AES-GCM',length:256},false,['decrypt']);
    const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(b.iv)},key,b64ToBytes(b.ct));
    d=JSON.parse(new TextDecoder().decode(pt));
  }catch(e){ err.textContent='WRONG PASSWORD'; return; }
  if(!d||!d.stats){ err.textContent='DATA LOOKS CORRUPT — TRY AGAIN LATER'; return; }
  err.textContent='';
  document.getElementById('admingate').style.display='none';
  document.getElementById('adminbody').style.display='block';
  // Mission Control: init Danger Zone working queue with decrypted data
  if (typeof zi === 'function') zi(d.danger || []);
}
document.getElementById('apw').addEventListener('keydown',e=>{if(e.key==='Enter')unlockAdmin();});
