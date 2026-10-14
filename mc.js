function mcToggle(id){document.getElementById(id).classList.toggle('open');}
/* DANGER ZONE working queue — personal frontend checklist, 5/10 toggle */
var ZD=[];var ZS=5;var ZN={};var ZV=[];
try{ZN=JSON.parse(sessionStorage.getItem('dz_done')||'{}');}catch(e){ZN={};}
function zs(){try{sessionStorage.setItem('dz_done',JSON.stringify(ZN));}catch(e){}}
function zq(n){ZS=n;
document.getElementById('mc-q5').classList.toggle('active',n===5);
document.getElementById('mc-q10').classList.toggle('active',n===10);
zFill();zr();}
function zi(dangerData){
ZD=(dangerData||[]).slice().sort(function(a,b){return (b.wait_h||0)-(a.wait_h||0);});
document.getElementById('mc-danger-total').textContent=ZD.length;
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
var list=(flags||[]).filter(function(f){return f.rule===2;});
document.getElementById('mc-issues-count').textContent=list.length;
if(!list.length){el.innerHTML='<div class="mc-empty">No two-post rule flags.<br>Evidence appears here when the detector finds 3+ song posts in a calendar day.</div>';return;}
el.innerHTML=list.map(function(f){
var posts=f.all_posts||[{url:f.url,ts:f.ts,excerpt:f.excerpt}];
var rows=posts.map(function(p,i){
var dt=new Date(p.ts*1000);
var t=dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'});
return '<div class="iss-post"><span class="iss-num">'+(i+1)+'</span>'+
'<span class="iss-time">'+t+'</span>'+
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
document.getElementById('tabbtn-admin').classList.toggle('on',w==='admin');}
async function unlockAdmin(){
if(document.getElementById('signon-stage'))return;
const v=document.getElementById('apw').value;
const err=document.getElementById('pwerr');
if(!v){err.textContent='ENTER THE PASSWORD FIRST';return;}
err.textContent='LOADING…';
const sstage=signonBuild();
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
}catch(e){gateBack('WRONG PASSWORD');return;}
if(!d||!d.stats){gateBack('DATA LOOKS CORRUPT — TRY AGAIN LATER');return;}
err.textContent='';
signonPlay(sstage,function(){
document.getElementById('admingate').style.display='none';
document.getElementById('adminbody').style.display='block';
if(typeof zi==='function')zi(d.danger||[]);
if(typeof ziIssues==='function')ziIssues(d.flags||[]);});}
document.getElementById('apw').addEventListener('keydown',function(e){if(e.key==='Enter')unlockAdmin();});
/* Sign-on video: plays after password unlock, before the admin layout */
var SIGNON_URL='https://q63l42nl0lcqmn6m.public.blob.vercel-storage.com/tscms-control-room-sign-on.mp4';
function signonBuild(){
if(document.getElementById('signon-stage'))return document.getElementById('signon-stage');
var gate=document.getElementById('admingate');
var stage=document.createElement('div');
stage.id='signon-stage';stage.style.visibility='hidden';
stage.innerHTML='<video id="signon-vid" src="'+SIGNON_URL+'" playsinline preload="auto"></video><button id="signon-skip" type="button">SKIP INTRO \u00BB</button>';
document.body.appendChild(stage);
if(gate)gate.style.display='none';
return stage;}
function signonDrop(){var s=document.getElementById('signon-stage');if(s&&s.parentNode)s.parentNode.removeChild(s);}
function signonPlay(stage,done){
var vid=document.getElementById('signon-vid');
var finished=false;
function finish(){if(finished)return;finished=true;try{vid.pause();}catch(e){}signonDrop();done();}
document.getElementById('signon-skip').addEventListener('click',finish);
vid.addEventListener('ended',finish);
vid.addEventListener('error',finish);
setTimeout(function(){if(!finished)finish();},25000);
stage.style.visibility='visible';
var pr=null;try{pr=vid.play();}catch(e){finish();return;}
if(pr&&pr.catch)pr.catch(function(){finish();});}
