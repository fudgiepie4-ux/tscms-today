function mcToggle(id){document.getElementById(id).classList.toggle('open');}
/* DANGER ZONE working queue — personal frontend checklist, 5/10 toggle */
var ZD=[];var ZS=5;var ZN={};var ZV=[];
try{ZN=JSON.parse(sessionStorage.getItem('dz_done')||'{}');}catch(e){ZN={};}
function zs(){try{sessionStorage.setItem('dz_done',JSON.stringify(ZN));}catch(e){}}
function zq(n){ZS=n;
document.getElementById('mc-q5').classList.toggle('active',n===5);
document.getElementById('mc-q10').classList.toggle('active',n===10);
zFill();zr();}
function zi(dangerData,generated){
ZD=(dangerData||[]).slice().sort(function(a,b){return (b.wait_h||0)-(a.wait_h||0);});
document.getElementById('mc-danger-total').textContent=ZD.length;
var tsEl=document.getElementById('mc-danger-ts');
if(tsEl&&generated){
  var dt=new Date(generated);
  var opts={month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'};
  tsEl.textContent='Last updated '+dt.toLocaleString('en-US',opts)+' CT · Refreshes when admin data is rebuilt';
}
zFill();zr();}
function zFill(){
// Fill visible batch with oldest eligible (non-done) posts
var avail=ZD.filter(function(e){return !ZN[e.url];});
ZV=avail.slice(0,ZS);}
function zr(){
var el=document.getElementById('mc-danger-list');if(!el)return;
var FB='https://facebook.com/groups/1410002804113962/permalink/';
el.innerHTML=ZV.map(function(e){
var pid=String(e.url||'#').split('/permalink/').pop().replace(/\/$/,'');
var tier=Array.isArray(e.tier)?e.tier[0]:e.tier;
var done=!!ZN[e.url];
return '<div class="erow'+(done?' done':'')+'">'+
'<label class="dz-check"><input type="checkbox"'+(done?' checked':'')+' onchange="zt(\''+String(e.url).replace(/'/g,"\\'")+'\',this.checked)"><span>\u2713</span></label>'+
'<div class="emain"><div class="et">'+escHtml(e.author)+'</div>'+
'<div class="etier">'+escHtml(tier)+'</div></div>'+
'<div class="ehrs">'+e.wait_h+'h</div>'+
'<a class="epill" href="'+FB+escHtml(pid)+'" target="_blank">OPEN POST \u2197</a></div>';
}).join('')||'<div class="mc-empty">All clear — nothing waiting.</div>';
var msg=document.getElementById('mc-danger-msg');
if(msg){var remaining=ZD.filter(function(e){return !ZN[e.url];}).length;
msg.textContent=remaining===0?'Queue clear! All eligible posts worked this session.':'';}}
function zt(url,checked){
// Mark Done: entry STAYS visible, appears checked. Removed only on Refresh.
if(checked){ZN[url]=1;}else{delete ZN[url];}
zs();zr();}
function zf(){
// Refresh: drop checked from visible batch, fill with next oldest eligible
var kept=ZV.filter(function(e){return !ZN[e.url];});
var inBatch={};kept.forEach(function(e){inBatch[e.url]=1;});
var avail=ZD.filter(function(e){return !ZN[e.url]&&!inBatch[e.url];});
ZV=kept.concat(avail.slice(0,ZS-kept.length));
zr();
var msg=document.getElementById('mc-danger-msg');
var remaining=ZD.filter(function(e){return !ZN[e.url];}).length;
if(msg){
if(remaining===0){msg.textContent='Queue clear! All eligible posts worked this session.';}
else if(ZV.length<ZS){msg.textContent='No additional eligible posts available.';}}
setTimeout(function(){var m=document.getElementById('mc-danger-msg');
if(m&&m.textContent==='No additional eligible posts available.')m.textContent='';},4000);}
/* POTENTIAL ISSUES — evidence review, all posts shown */
function ziIssues(flags){
var el=document.getElementById('mc-issues-list');if(!el)return;
var list=(flags||[]);
document.getElementById('mc-issues-count').textContent=list.length;
if(!list.length){el.innerHTML='<div class="mc-empty">No two-post rule flags.<br>Evidence appears here when the detector finds 3+ song posts in a calendar day.</div>';return;}
el.innerHTML=list.map(function(f){
var posts=f.all_posts||[{url:f.url,ts:f.ts,excerpt:f.excerpt}];
var rows=posts.map(function(p,i){
var dt=new Date(p.ts*1000);
var t=dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'});
var dstr=dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Chicago'});
return '<div class="iss-post"><span class="iss-num">'+(i+1)+'</span>'+
'<span class="iss-time">'+dstr+' · '+t+'</span>'+
'<span class="iss-ex">'+escHtml(p.excerpt||'')+'</span>'+
'<a class="iss-link" href="'+escHtml(p.url)+'" target="_blank">OPEN ↗</a></div>';
}).join('');
return '<div class="iss"><div class="iss-head">'+
'<span class="iss-rule">RULE 2</span>'+
'<span class="iss-author">'+escHtml(f.author)+'</span>'+
'<span class="iss-day">'+escHtml(f.calendar_day||'')+'</span></div>'+
'<div class="iss-ev">'+escHtml(f.evidence)+'<br>All '+posts.length+' posts shown below — admin review required.</div>'+
'<div class="iss-posts">'+rows+'</div></div>';
}).join('');
}
/* Admin gate — password unlock with encrypted data */
function b64ToBytes(b){const s=atob(b);const a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a;}
function showTab(w){
document.getElementById('tab-public').style.display=w==='public'?'block':'none';
document.getElementById('tab-admin').style.display=w==='admin'?'block':'none';
document.getElementById('tabbtn-public').classList.toggle('on',w==='public');
document.getElementById('tabbtn-admin').classList.toggle('on',w==='admin');
// PUBLIC uses the full-width lounge and viewport leaves; ADMIN keeps its original layout.
document.body.classList.toggle('public-view',w==='public');}
async function unlockAdmin(){
if(document.getElementById('signon-stage'))return;
const usernameInput=document.getElementById('auser');
const username=usernameInput?usernameInput.value.trim().toLowerCase():'';
const v=document.getElementById('apw').value;
const err=document.getElementById('pwerr');
// Encrypted Admin data requires Web Crypto, which browsers disable on HTTP.
// Never treat a missing secure context as an incorrect password.
if(!window.isSecureContext || typeof crypto==='undefined' || !crypto.subtle){
  err.textContent='SECURE CONNECTION REQUIRED — Admin sign-in needs HTTPS. Your password has NOT been checked. Please wait for https://tscmsradio.com/admin.html to be secure.';
  return;
}
if(!username||!v){err.textContent='ENTER USERNAME AND PASSWORD';return;}
if(username!=='admin'){err.textContent='USERNAME OR PASSWORD NOT ACCEPTED';return;}
err.textContent='LOADING…';
const sstage=SIGNON_ENABLED?signonBuild():null;
// Start video playback NOW, synchronously in the tap gesture — after the
// async fetch/decrypt below, mobile browsers will have expired the gesture
// and block play(). We kick it off here; signonPlay() later just makes it visible.
if(SIGNON_ENABLED){(function(){
var v=document.getElementById('signon-vid');
if(!v)return;
try{
var pr=v.play();
if(pr&&pr.catch)pr.catch(function(){try{v.muted=true;v.play().catch(function(){});}catch(e){}});
}catch(e){
try{v.muted=true;v.play().catch(function(){});}catch(e2){}
}
})();}
function gateBack(msg){signonDrop();document.getElementById('admingate').style.display='';err.textContent=msg;}
let b;
try{
const r=await fetch('admin-data.enc.json');
if(!r.ok)throw new Error('http '+r.status);
b=await r.json();
}catch(e){gateBack('COULDN’T LOAD DATA — CHECK CONNECTION & RETRY');return;}
err.textContent='DECRYPTING…';
let d;
try{
const enc=new TextEncoder();
const baseKey=await crypto.subtle.importKey('raw',enc.encode(v),'PBKDF2',false,['deriveKey']);
const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64ToBytes(b.salt),iterations:b.iter,hash:'SHA-256'},baseKey,{name:'AES-GCM',length:256},false,['decrypt']);
const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(b.iv)},key,b64ToBytes(b.ct));
d=JSON.parse(new TextDecoder().decode(pt));
}catch(e){
  // OperationError includes a wrong password, but can also mean incompatible
  // or corrupt ciphertext; report that without claiming to know which.
  gateBack('UNABLE TO UNLOCK — password not accepted by current encrypted data. Confirm HTTPS, then verify the password or ask an admin to check the encrypted data version.');
  return;
}
if(!d||!d.stats){gateBack('DATA LOOKS CORRUPT — TRY AGAIN LATER');return;}
err.textContent='';
function showAdmin(){
document.getElementById('admingate').style.display='none';
document.getElementById('adminbody').style.display='block';
if(typeof zi==='function')zi(d.danger||[],d.generated);
if(typeof ziIssues==='function')ziIssues(d.flags||[]);}
if(SIGNON_ENABLED){signonPlay(sstage,showAdmin);}else{showAdmin();}}
document.getElementById('auser').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();document.getElementById('apw').focus();}});
document.getElementById('apw').addEventListener('keydown',function(e){if(e.key==='Enter')unlockAdmin();});
/* Sign-on video: plays after password unlock, before the admin layout */
var SIGNON_ENABLED=false; /* TEMPORARILY OFF — set true to bring the intro video back */
var SIGNON_URL='https://q63l42nl0lcqmn6m.public.blob.vercel-storage.com/tscms-control-room-sign-on.mp4?v=2';
function signonBuild(){
if(document.getElementById('signon-stage'))return document.getElementById('signon-stage');
var gate=document.getElementById('admingate');
var stage=document.createElement('div');
stage.id='signon-stage';stage.style.visibility='hidden';
stage.innerHTML='<video id="signon-vid" src="'+SIGNON_URL+'" playsinline preload="auto"></video><button id="signon-skip" type="button">SKIP INTRO \u00BB</button><button id="signon-sound" type="button" style="display:none">TAP FOR SOUND</button>';
document.body.appendChild(stage);
if(gate)gate.style.display='none';
return stage;}
function signonDrop(){var s=document.getElementById('signon-stage');if(s&&s.parentNode)s.parentNode.removeChild(s);}
/* Inline studio intro: tap the banner, video plays right in the header.
   Per Clara's review: don't lock the UI before load succeeds — surface real
   errors and offer retry instead of silently swallowing failures. */
function playStudioIntro(){
var btn=document.getElementById('studio-intro-btn');
var wrap=document.getElementById('studio-intro-vid');
if(!btn||!wrap||wrap.dataset.playing)return;
btn.disabled=true;
btn.innerHTML='&#9654; LOADING VIDEO&hellip;';
wrap.style.display='block';
wrap.innerHTML='<video src="'+SIGNON_URL+'" controls playsinline preload="auto" style="width:100%"></video><div class="studio-intro-err" id="studio-intro-err" style="display:none"></div>';
var v=wrap.querySelector('video');
var errBox=document.getElementById('studio-intro-err');
function showError(msg){
  wrap.dataset.playing='';
  btn.disabled=false;
  btn.innerHTML='&#9654; RETRY STUDIO INTRO';
  btn.style.display='';
  if(errBox){errBox.style.display='block';errBox.textContent='Video failed: '+msg+' — tap retry or check connection.';}
}
if(!v){showError('no video element');return;}
v.addEventListener('error',function(){
  var code=v.error?v.error.code:'unknown';
  var detail={1:'aborted',2:'network',3:'decode',4:'unsupported'}[code]||('code '+code);
  showError(detail);
});
v.addEventListener('playing',function(){
  wrap.dataset.playing='1';
  btn.style.display='none';
  if(errBox)errBox.style.display='none';
});
/* Wait for the browser to load enough to know it can play, before calling play().
   Calling play() immediately on a fresh src can throw NotSupportedError even
   for valid files, because no metadata has loaded yet. */
var playAttempted=false;
function tryPlay(){
  if(playAttempted)return; playAttempted=true;
  try{
    var pr=v.play();
    if(pr&&pr.catch)pr.catch(function(e){showError(e&&e.name?e.name:'play blocked');});
  }catch(e){showError(e&&e.message?e.message:'play threw');}
}
v.addEventListener('canplay',tryPlay);
v.addEventListener('loadedmetadata',function(){setTimeout(tryPlay,300);});
/* Fallback: if metadata never arrives within 8s, surface it instead of hanging */
setTimeout(function(){if(!playAttempted&&!wrap.dataset.playing)showError('timeout waiting for video data');},8000);
v.load();
}
function signonPlay(stage,done){
var vid=document.getElementById('signon-vid');
var finished=false;
function finish(){if(finished)return;finished=true;try{vid.pause();}catch(e){}signonDrop();done();}
document.getElementById('signon-skip').addEventListener('click',finish);
vid.addEventListener('ended',finish);
vid.addEventListener('error',finish);
setTimeout(function(){if(!finished)finish();},25000);
stage.style.visibility='visible';
// Playback was already kicked off in unlockAdmin (in the tap gesture).
// If it's not playing by now (e.g. still buffering), ensure it's going.
try{
if(vid.paused){
var pr=vid.play();
if(pr&&pr.catch)pr.catch(function(){vid.muted=true;vid.play().catch(function(){finish();});});
}
}catch(e){finish();}
var sb=document.getElementById('signon-sound');
if(sb&&vid.muted){sb.style.display='block';sb.addEventListener('click',function(){try{vid.muted=false;}catch(e){}sb.style.display='none';});}}

/* ============ READABILITY TOGGLE (2026-10-15, Fudgie-approved) ============ */
/* Larger Text button: uniform scaling for older admins, saved per device */
function mcToggleLargeText(){
  var on = document.body.classList.toggle('large-text');
  var btn = document.getElementById('mc-text-toggle-btn');
  if(btn){
    btn.classList.toggle('active', on);
    btn.innerHTML = '<span class="tt-ico">🔍</span> Larger Text: ' + (on ? 'ON' : 'OFF');
  }
  try{ localStorage.setItem('tscms_large_text', on ? '1' : '0'); }catch(e){}
}
/* Restore saved preference on load */
(function(){
  try{
    if(localStorage.getItem('tscms_large_text')==='1'){
      document.body.classList.add('large-text');
      // Button label updated when admin HTML renders it
      document.addEventListener('DOMContentLoaded', function(){
        var btn = document.getElementById('mc-text-toggle-btn');
        if(btn){ btn.classList.add('active'); btn.innerHTML='<span class="tt-ico">🔍</span> Larger Text: ON'; }
      });
    }
  }catch(e){}
})();
