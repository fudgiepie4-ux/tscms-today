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
