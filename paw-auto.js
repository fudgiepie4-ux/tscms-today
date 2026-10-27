/* Dynamic paw v2: no hidden words or marker IDs are embedded in page source. */
(function () {
 'use strict';
 const endpoint='https://tscms-word-hunt-public-gateway-2026.vercel.app/api/word-hunt/mark';
 const root=document.querySelector('main')||document.body;
 if(!root)return;
 const wrapperSelector='span[data-wh-runtime="1"]';
 const centralParts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'});
 function centralDate(ms){
  const parts=Object.fromEntries(centralParts.formatToParts(new Date(ms)).map(p=>[p.type,p.value]));
  return parts.year+'-'+parts.month+'-'+parts.day;
 }
 function nextCentralMidnight(ms){
  const day=centralDate(ms);let lo=ms,hi=ms+27*3600000;
  while(centralDate(hi)===day)hi+=86400000;
  while(hi-lo>1){const mid=Math.floor((hi+lo)/2);if(centralDate(mid)===day)lo=mid;else hi=mid;}
  return hi;
 }
 function validWord(word){return typeof word==='string'&&word.length>=1&&word.length<=100&&!/\s/u.test(word);}
 function validMarker(marker){return typeof marker==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(marker);}
 function validPayload(d){return d&&d.active===true&&validMarker(d.marker)&&validWord(d.word)&&typeof d.contestDateCT==='string'&&d.contestDateCT===centralDate(Date.now());}
 const isLetter=ch=>!!ch&&/[\p{L}\p{M}\p{N}_]/u.test(ch);
 function offsets(text,word){
  const hits=[];let at=-1;
  while((at=text.indexOf(word,at+1))!==-1){
   if(!isLetter(text[at-1])&&!isLetter(text[at+word.length]))hits.push(at);
  }
  return hits;
 }
 function wraps(){return [...root.querySelectorAll(wrapperSelector)];}
 function unwrap(){
  for(const el of wraps()){
   const parent=el.parentNode;
   if(!parent)continue;
   el.replaceWith(document.createTextNode(el.textContent||''));
   parent.normalize();
  }
 }
 function paragraphVisible(p){
  if(p.closest('[hidden],[aria-hidden="true"],script,style,template,nav,footer,figcaption'))return false;
  for(let el=p;el&&el.nodeType===1;el=el.parentElement){
   if(el.hidden||el.getAttribute('aria-hidden')==='true')return false;
   const css=typeof getComputedStyle==='function'?getComputedStyle(el):null;
   if(css&&(css.display==='none'||css.visibility==='hidden'||css.visibility==='collapse'))return false;
  }
  return true;
 }
 function matches(word){
  const found=[];
  for(const p of root.querySelectorAll('p')){
   if(!paragraphVisible(p))continue;
   const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);
   let node;
   while((node=walker.nextNode())){
    if(node.parentElement?.closest(wrapperSelector))continue;
    for(const start of offsets(node.nodeValue||'',word))found.push({node,start});
   }
  }
  return found;
 }
 let active=null, seq=0,midnightTimer=0,syncPending=false;
 function reconcile(){
  syncPending=false;
  if(!active||centralDate(Date.now())!==active.day){active=null;unwrap();return;}
  let current=wraps(),found=matches(active.word);
  if(current.length===1&&found.length===0&&current[0].getAttribute('data-wh-id')===active.marker&&current[0].textContent===active.word)return;
  if(current.length>0){unwrap();current=[];found=matches(active.word);}
  if(found.length!==1)return; // zero or multiple matches = no guessing and no paw
  const {node,start}=found[0];
  const wordNode=node.splitText(start);
  wordNode.splitText(active.word.length);
  const span=document.createElement('span');
  span.className='wh-paw-live';
  span.setAttribute('data-wh-runtime','1');
  span.setAttribute('data-wh-id',active.marker);
  span.textContent=wordNode.nodeValue;
  wordNode.replaceWith(span);
 }
 function queueReconcile(){
  if(syncPending)return;
  syncPending=true;
  setTimeout(reconcile,0);
 }
 function scheduleMidnight(){
  clearTimeout(midnightTimer);
  if(!active)return;
  const wait=Math.max(0,nextCentralMidnight(Date.now())-Date.now());
  midnightTimer=setTimeout(()=>{active=null;unwrap();poll();},wait);
 }
 async function poll(){
  const thisSeq=++seq;
  try{
   const res=await fetch(endpoint+'?path='+encodeURIComponent(location.pathname),{
    cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}
   });
   if(!res.ok)throw Error('unavailable');
   const data=await res.json();
   if(thisSeq!==seq)return;
   if(!validPayload(data)){active=null;clearTimeout(midnightTimer);unwrap();return;}
   active={marker:data.marker,word:data.word,day:data.contestDateCT};
   reconcile();scheduleMidnight();
  }catch{if(thisSeq===seq){active=null;clearTimeout(midnightTimer);unwrap();}}
 }
 // Journal replaces the founding narrative via innerHTML. Observe it without ever inferring a word.
 const observer=new MutationObserver(()=>{if(active)queueReconcile();else if(wraps().length)queueReconcile();});
 observer.observe(root,{childList:true,characterData:true,subtree:true});
 unwrap();poll();
 setInterval(()=>{if(!document.hidden)poll();},5000);
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden){
   if(active&&centralDate(Date.now())!==active.day){active=null;unwrap();}
   poll();
  }
 });
})();
