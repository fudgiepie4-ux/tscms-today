import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {markPayload} from '../lib/mark.js';
import {flipDrop,currentDrop} from '../lib/drop.js';
import {dateCT,validateConfig} from '../lib/core.js';
import flipHandler from '../api/word-hunt/flip.js';
import statusHandler from '../api/word-hunt/status.js';
import markHandler from '../api/word-hunt/mark.js';
const base={id:'synthetic',manualDrop:true,testOnly:true,rosterConfirmed:true,adminNames:[],adminEmails:[],days:[27,28,29,30].map(n=>({dateCT:'2026-10-'+n,answer:'synthetic',riddle:'synthetic test',target:{path:'/example-'+n+'.html',marker:'k_'+n,word:'sample'}}))};
const at=Date.parse('2026-10-27T14:00:00Z'),ct='2026-10-27';
function memory(){const db=new Map();return {async create(k,v){if(db.has(k))return false;db.set(k,structuredClone(v));return true},async read(k){return db.get(k)||null}};}
function response(){return {code:200,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(c){this.code=c;return this},json(value){this.body=value;return this},end(){return this}}}
test('inactive mark never leaks marker, word, future-day info',async()=>{
 const store=memory(),before=await currentDrop(base,store,at);
 assert.deepEqual(markPayload(base,at,before,'/example-27.html'),{active:false});
 assert.deepEqual(markPayload(base,at,before,'/example-30.html'),{active:false});
 const drop=await flipDrop(base,store,at);
 assert.equal(drop.result,'flipped');
 const current=await currentDrop(base,store,at+1);
 assert.deepEqual(markPayload(base,at+1,current,'/example-27.html'),{active:true,marker:'k_27',word:'sample',contestDateCT:ct});
 assert.deepEqual(markPayload(base,at+1,current,'/example-28.html'),{active:false});
 const midnight=Date.parse('2026-10-28T05:00:00Z');
 assert.deepEqual(markPayload(base,midnight,await currentDrop(base,store,midnight),'/example-27.html'),{active:false});
});
test('server rejects out-of-window and wrong-day flips',async()=>{
 assert.equal((await flipDrop(base,memory(),Date.parse('2026-10-27T05:10:00Z'))).result,'outside-daytime');
 assert.equal((await flipDrop(base,memory(),Date.parse('2026-11-01T15:00:00Z'))).result,'wrong-day');
});
test('real config requires a private exact single-word target for each of four distinct pages',()=>{
 const c={...base,testOnly:false,rosterConfirmed:true,adminNames:Array.from({length:16},(_,i)=>'Fictional '+i),adminEmails:[]};
 assert.doesNotThrow(()=>validateConfig(c));
 assert.throws(()=>validateConfig({...c,days:c.days.map(x=>({...x,target:{path:x.target.path,marker:x.target.marker}}))}));
 assert.throws(()=>validateConfig({...c,days:c.days.map(x=>({...x,target:{...x.target,word:'not a single word'}}))}));
 assert.throws(()=>validateConfig({...c,days:c.days.map(x=>({...x,target:{...x.target,path:'/same.html'}}))}));
});
test('unauthenticated and wrong-origin flip HTTP requests are rejected before mutation',async()=>{
 const req={method:'POST',headers:{host:'backend.vercel.app','content-type':'application/json'},body:{}};
 const noToken=response();await flipHandler(req,noToken);
 assert.equal(noToken.code,401);
 const badOrigin=response();await flipHandler({...req,headers:{...req.headers,origin:'https://elsewhere.example'}},badOrigin);
 assert.equal(badOrigin.code,403);
});
test('disabled service responds without revealing page words or accepting entries',async()=>{
 const old=process.env.WORD_HUNT_ENABLE_REAL;process.env.WORD_HUNT_ENABLE_REAL='false';
 try{
  const req={method:'GET',headers:{host:'backend.vercel.app'},query:{path:'/example-27.html'}};
  const s=response();await statusHandler(req,s);assert.equal(s.code,200);assert.deepEqual(s.body,{state:'not-yet'});
  const m=response();await markHandler(req,m);assert.equal(m.code,200);assert.deepEqual(m.body,{active:false});
 }finally{if(old===undefined)delete process.env.WORD_HUNT_ENABLE_REAL;else process.env.WORD_HUNT_ENABLE_REAL=old}
});
test('trusted CORS only, no wildcard',async()=>{
 const req={method:'GET',headers:{host:'backend.vercel.app',origin:'https://tscmsradio.com'},query:{path:'/example-27.html'}};
 const res=response();await markHandler(req,res);
 assert.equal(res.headers['Access-Control-Allow-Origin'],'https://tscmsradio.com');
 assert.equal(res.headers.Vary,'Origin');
 const denied=response();await markHandler({...req,headers:{...req.headers,origin:'https://elsewhere.example'}},denied);
 assert.equal(denied.code,403);assert.equal(denied.headers['Access-Control-Allow-Origin'],undefined);
});
const source=readFileSync(new URL('../public/paw-auto.js',import.meta.url),'utf8');
class Text {
 constructor(value){this.nodeType=3;this.nodeValue=value;this.parentNode=null;}
 get parentElement(){return this.parentNode;}
 get textContent(){return this.nodeValue;}
 set textContent(v){this.nodeValue=v;}
 splitText(offset){
  const tail=new Text(this.nodeValue.slice(offset));this.nodeValue=this.nodeValue.slice(0,offset);
  const p=this.parentNode,idx=p.children.indexOf(this);p.children.splice(idx+1,0,tail);tail.parentNode=p;return tail;
 }
 replaceWith(n){const p=this.parentNode;if(!p)return;const i=p.children.indexOf(this);p.children.splice(i,1,n);n.parentNode=p;this.parentNode=null}
}
class Element {
 constructor(tag){this.nodeType=1;this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.parentNode=null;this.hidden=false;this.className='';}
 get parentElement(){return this.parentNode;}
 append(...nodes){for(const n of nodes){n.parentNode=this;this.children.push(n)}}
 get textContent(){return this.children.map(c=>c.textContent).join('');}
 set textContent(value){this.children=[];this.append(new Text(String(value)));}
 getAttribute(name){return Object.hasOwn(this.attrs,name)?this.attrs[name]:null;}
 setAttribute(name,value){this.attrs[name]=String(value);}
 replaceWith(n){const p=this.parentNode;if(!p)return;const i=p.children.indexOf(this);p.children.splice(i,1,n);n.parentNode=p;this.parentNode=null;}
 normalize(){
  for(let i=0;i<this.children.length;i++){
   const c=this.children[i];if(c.nodeType===1)c.normalize();
   if(c.nodeType===3&&this.children[i+1]?.nodeType===3){c.nodeValue+=this.children[i+1].nodeValue;this.children.splice(i+1,1);i--;}
  }
 }
 matchesSelector(s){
  if(s==='p')return this.tagName==='P';
  if(s==='span[data-wh-runtime="1"]'||s==='[data-wh-runtime="1"]')return this.tagName==='SPAN'&&this.attrs['data-wh-runtime']==='1';
  if(s==='[hidden]')return this.hidden;
  if(s==='[aria-hidden="true"]')return this.attrs['aria-hidden']==='true';
  return this.tagName===s.toUpperCase();
 }
 closest(selector){
  const selectors=selector.split(',');
  for(let e=this;e;e=e.parentElement)if(selectors.some(x=>e.matchesSelector(x.trim())))return e;
  return null;
 }
 querySelectorAll(selector){
  const result=[];
  function walk(node){for(const c of node.children||[]){if(c.nodeType===1){if(c.matchesSelector(selector))result.push(c);walk(c)}}}
  walk(this);return result;
 }
}
function p(text){const el=new Element('p');el.textContent=text;return el}
function setup(pageText,extra=[],pathname='/example-27.html'){
 let now=at,api={active:false},fetchCalls=0;const main=new Element('main');
 main.append(p(pageText),...extra);
 const doc={
  hidden:false,body:main,querySelector:selector=>selector==='main'?main:null,
  createTreeWalker(root){const texts=[];function walk(n){for(const c of n.children||[]){if(c.nodeType===3)texts.push(c);else walk(c)}}walk(root);let i=0;return {nextNode:()=>texts[i++]||null}},
  createTextNode:value=>new Text(value),createElement:tag=>new Element(tag),addEventListener(){},
 };
 const timers=[];const listeners=[];const fakeDate=class extends Date{static now(){return now}};
 const sourceWithHook=source.replace(/\}\)\(\);\s*$/,'window.__v2={reconcile,unwrap,poll,centralDate,nextCentralMidnight};})();');
 assert.notEqual(sourceWithHook,source);
 const context={document:doc,window:{},location:{pathname},Date:fakeDate,Intl,NodeFilter:{SHOW_TEXT:4},
  getComputedStyle:()=>({display:'block',visibility:'visible'}),
  fetch:async()=>{fetchCalls++;return {ok:true,json:async()=>api}},
  setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},
  clearTimeout:()=>{},
  setInterval:(fn,ms)=>{listeners.push({fn,ms});return listeners.length},
  MutationObserver:class{constructor(fn){this.cb=fn;doc.mutation=this;}observe(){}},
  console,encodeURIComponent
 };
 vm.runInNewContext(sourceWithHook,context,{filename:'paw-auto.js'});
 const flush=async()=>{await Promise.resolve();await Promise.resolve();await new Promise(resolve=>setImmediate(resolve))};
 return {main,doc,api(v){api=v},time(n){now=n},async poll(){await context.window.__v2.poll();await flush()},reconcile(){context.window.__v2.reconcile()},flush,
  count:()=>main.querySelectorAll('span[data-wh-runtime="1"]').length,
  wrap:()=>main.querySelectorAll('span[data-wh-runtime="1"]')[0],get calls(){return fetchCalls},
  rerender(text,extras=[]){main.children=[];main.append(p(text),...extras);doc.mutation.cb();},
  observerTick(){const pending=timers.splice(0).filter(t=>t.ms===0);for(const task of pending)task.fn();}
 };
}
test('DOM: no static span before a drop; exact text unchanged',async()=>{
 const d=setup('Before sample after');await d.poll();
 assert.equal(d.count(),0);assert.equal(d.main.textContent,'Before sample after');
 assert.doesNotMatch(source,/data-word-hunt-marker|answer:/i);
});
test('DOM: correct active word gets one readable paw; repeated polling never double-wraps',async()=>{
 const d=setup('Before sample after');d.api({active:true,marker:'opaque_91',word:'sample',contestDateCT:ct});await d.poll();
 assert.equal(d.count(),1);assert.equal(d.wrap().textContent,'sample');
 assert.equal(d.main.textContent,'Before sample after');
 const original=d.wrap();await d.poll();await d.poll();
 assert.equal(d.count(),1);assert.equal(d.wrap(),original);
});
test('DOM: multiple visible matches refuse to guess; figure caption excluded',async()=>{
 const d=setup('A sample on the page',[p('Another sample on the same page')]);
 d.api({active:true,marker:'opaque_91',word:'sample',contestDateCT:ct});await d.poll();assert.equal(d.count(),0);
 const figure=new Element('figcaption');figure.textContent='A second sample caption';
 const e=setup('The sample is found',[figure]);e.api({active:true,marker:'opaque_91',word:'sample',contestDateCT:ct});await e.poll();
 assert.equal(e.count(),1);
});
test('DOM: journal re-render removes old node, observer finds only current page and no duplicates',async()=>{
 const d=setup('Founding text sample here');d.api({active:true,marker:'opaque_91',word:'sample',contestDateCT:ct});await d.poll();
 assert.equal(d.count(),1);
 d.rerender('A different journal entry');d.observerTick();assert.equal(d.count(),0);
 d.rerender('Founding text sample here');d.observerTick();assert.equal(d.count(),1);
 d.reconcile();d.reconcile();assert.equal(d.count(),1);
});
test('DOM: midnight and inactive polling unwrap span back into one plain text node',async()=>{
 const d=setup('Founding text sample here');d.api({active:true,marker:'opaque_91',word:'sample',contestDateCT:ct});await d.poll();
 assert.equal(d.count(),1);d.time(Date.parse('2026-10-28T05:00:00Z'));d.reconcile();
 assert.equal(d.count(),0);assert.equal(d.main.textContent,'Founding text sample here');assert.equal(d.main.children[0].children.length,1);
 d.api({active:true,marker:'opaque_91',word:'sample',contestDateCT:ct});await d.poll();assert.equal(d.count(),0);
 d.api({active:false});await d.poll();assert.equal(d.count(),0);
});
test('DOM: other-page inactive response contains no word and leaves no paw',async()=>{
 const d=setup('Before sample after',[],'/other.html');d.api({active:false});await d.poll();assert.equal(d.count(),0);
});
test('DST: next midnight is correct on Central spring and autumn switches',()=>{
 const d=setup('Example');let f=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'});
 assert.equal(dateCT(Date.parse('2026-11-01T05:59:59Z')),'2026-11-01');
});
