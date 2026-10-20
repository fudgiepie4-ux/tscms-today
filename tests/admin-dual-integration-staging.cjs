/* TSCMS Admin integrated dual-mode STAGING regression.
 * Run: node tests/admin-dual-integration-staging.cjs
 * Uses ACTUAL mc.js PIN function and ACTUAL tscms-admin-dual.js data/role
 * functions; Firebase, DOM, legacy/v2 decryption are MOCKED. No actual PIN,
 * account, Admin data, live network, or encryption key involved.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const legacy=fs.readFileSync(path.join(__dirname,'..','mc.js'),'utf8');
const dual=fs.readFileSync(path.join(__dirname,'..','tscms-admin-dual.js'),'utf8');
function take(str,start,end){
 const at=str.indexOf(start),until=str.indexOf(end,at);
 assert(at>=0&&until>at,'Missing source marker: '+start);
 return str.slice(at,until);
}
const pin=take(legacy,'async function unlockAdmin(){',"document.getElementById('apw').addEventListener");
const personal=take(dual,'function base64Bytes(value){','document.getElementById("tc-login-form").addEventListener');
const promptCode=take(dual,'function offerPersonalSetupAfterPin(){','document.getElementById("tc-notnow").addEventListener');
const fixture={
 generated:'2026-10-20T17:00:00Z',
 danger:Array.from({length:5},(_,i)=>({author:'TEST '+i,wait_h:13+i,tier:'test',url:'https://example.invalid/'+i,excerpt:'synthetic'})),
 flags:[{rule:'TWO',author:'TEST A',all_posts:[]},{rule:'TWO',author:'TEST B',all_posts:[]}],
 stats:{posts_7d:31,zero_comment:5,zero_pct:16,avg_comments:1.3}
};
const status = text => ({textContent:text||''});
const encoder=function(){this.encode=value=>new Uint8Array(Array.from(String(value)).map(c=>c.charCodeAt(0)))};
const decoder=function(){this.decode=()=>JSON.stringify(fixture)};
let tests=0;
const pass=()=>{tests++};

function testPIN(wrong=false){
 const history=[];
 const body={style:{display:'none'}},gate={style:{display:'block'}};
 const els={apw:{value:wrong?'INCORRECT_SYNTHETIC_PIN':'FAKE_SYNTHETIC_PIN'},
   pwerr:status(),admingate:gate,adminbody:body};
 const document={getElementById:key=>els[key]};
 const env={
  document,window:{isSecureContext:true},
  crypto:{subtle:{
   importKey:async(_,raw)=>({text:String.fromCharCode(...raw)}),
   deriveKey:async (_,key)=>key,
   decrypt:async(_,key)=>{
    if(key.text==='INCORRECT_SYNTHETIC_PIN')throw new Error('fake decrypt rejection');
    return new Uint8Array([11]).buffer;
   }
  }},
  fetch:async()=>({ok:true,json:async()=>({salt:'abcdefghijkl',iv:'abcdefghijkl',iter:100,ct:'abcdefghijklmnop'})}),
  TextEncoder:encoder,TextDecoder:decoder,
  b64ToBytes:value=>new Uint8Array(Array.from(value).map(c=>c.charCodeAt(0))),
  zi:data=>history.push('danger:'+data.length),
  ziIssues:data=>history.push('flags:'+data.length),
  SIGNON_ENABLED:false,signonDrop:()=>history.push('returnToGate')
 };
 return {history,body,gate,els,call:new Function('env','with(env){'+pin+'return unlockAdmin;}')(env)};
}
async function checkLegacy(){
 const ok=testPIN();await ok.call();
 assert.equal(ok.body.style.display,'block');
 assert.equal(ok.gate.style.display,'none');
 assert.deepEqual(ok.history,['danger:5','flags:2']);pass();
 const bad=testPIN(true);await bad.call();
 assert.equal(bad.body.style.display,'none');
 assert.notEqual(bad.els.pwerr.textContent,'');
 assert(bad.history.includes('returnToGate'));pass();
}
async function checkLatePINPopup(){
 function instantiate(alreadyUnlocked){
  const body={style:{display:alreadyUnlocked?'block':'none'}};
  const dialog={calls:0,showModal(){this.calls++}};
  const env={adminBody:body,dialog,callback:null,MutationObserver:class{
   constructor(cb){env.callback=cb}
   observe(){/* no state mutation */}
  }};
  const result=new Function('env','with(env){let pinPrompted=false,firebaseApproved=false;'+promptCode+
   'return {trigger:()=>env.callback(),shown:()=>dialog.calls};}')(env);
  return {body,result};
 }
 const early=instantiate(false);
 assert.equal(early.result.shown(),0);
 early.body.style.display='block';early.result.trigger();
 assert.equal(early.result.shown(),1);
 early.result.trigger();assert.equal(early.result.shown(),1);pass();
 const late=instantiate(true);
 assert.equal(late.result.shown(),1);
 late.result.trigger();assert.equal(late.result.shown(),1);pass();
}
function authFixture(overrides={}){
 const history=[],body={style:{display:'none'},prepend:()=>history.push('logoutButton'),replaceChildren:()=>history.push('clear')};
 const gate={style:{display:'block'}};
 const msg=status();
 const user={uid:'STAGING_TEST_ONLY',emailVerified:true};
 let role=overrides.role||'approved';
 let reads=0;
 const env={
  gate,adminBody:body,auth:{currentUser:user},db:{},
  loginMsg:msg,
  document:{hidden:false,addEventListener:()=>{},
   createElement:()=>({style:{cssText:''},addEventListener:()=>{},textContent:''})},
  window:{isSecureContext:true,zi:v=>history.push('danger:'+v.length),
   ziIssues:v=>history.push('flags:'+v.length),location:{reload:()=>history.push('reload')},addEventListener:()=>{}},
  crypto:{subtle:{importKey:async()=>({}),
   decrypt:async params=>{
    assert.equal(params.tagLength,128);
    assert.equal(String.fromCharCode(...params.additionalData),'tscms-admin-data|formatVersion=2|kid=v2');
    if(overrides.corruptCrypto)throw Error('fake GCM rejection');
    return new Uint8Array([17]).buffer;
   }}},
  reload:async u=>{u.emailVerified=overrides.unverified?false:true;history.push('refreshUser')},
  getIdToken:async()=>history.push('refreshToken'),
  getDocFromServer:async ref=>{
   if(ref.kind==='vault')return {exists:()=>!overrides.missingVault,
    data:()=>({current:'v2',keys:{v2:'abcdefghijklmnopqrstuvwx12345678'}})};
   reads++;
   if(overrides.revokeMidLoad&&reads===2)role='revoked';
   return {exists:()=>!overrides.missingProfile,
    data:()=>({status:role,admin:role==='approved',owner:false})};
  },
  doc:(_,kind,id)=>({kind,id}),
  fetch:async()=>({ok:true,json:async()=>({formatVersion:2,kid:'v2',iv:'abcdefghijkl',ct:'abcdefghijklmnop'})}),
  atob:value=>value,Uint8Array,TextDecoder:function(){this.decode=()=>
   JSON.stringify(overrides.badSchema?{danger:[],flags:'wrong',generated:'',stats:{}}:fixture)},
  TextEncoder:encoder,
  signOut:async()=>history.push('signedOut'),setInterval:()=>{},
  updateStatus:(el,msg)=>{el.textContent=msg}
 };
 const api=new Function('env','with(env){let firebaseApproved=false;'+personal+
  'return {personalLogin,loadNewAdminData};}')(env);
 return {api,history,body,gate,msg,user};
}
async function checkPersonal(){
 const good=authFixture();
 await good.api.personalLogin(good.user);
 assert.deepEqual(good.history.slice(-3),['danger:5','flags:2','logoutButton']);
 assert.equal(good.body.style.display,'block');pass();
 const pending=authFixture({role:'pending'});
 await pending.api.personalLogin(pending.user);
 assert.equal(pending.body.style.display,'none');
 assert(!pending.history.some(x=>x.startsWith('danger:')));pass();
 const unverified=authFixture({unverified:true});
 await unverified.api.personalLogin(unverified.user);
 assert.equal(unverified.body.style.display,'none');pass();
 const revoked=authFixture({role:'revoked'});
 await revoked.api.personalLogin(revoked.user);
 assert.equal(revoked.body.style.display,'none');pass();
 const midload=authFixture({revokeMidLoad:true});
 await assert.rejects(midload.api.personalLogin(midload.user),e=>e.code==='permission-denied');
 assert.equal(midload.body.style.display,'none');pass();
 const missingVault=authFixture({missingVault:true});
 await assert.rejects(missingVault.api.personalLogin(missingVault.user));
 assert.equal(missingVault.body.style.display,'none');pass();
 const corrupt=authFixture({corruptCrypto:true});
 await assert.rejects(corrupt.api.personalLogin(corrupt.user));
 assert.equal(corrupt.body.style.display,'none');pass();
 const badSchema=authFixture({badSchema:true});
 await assert.rejects(badSchema.api.personalLogin(badSchema.user));
 assert.equal(badSchema.body.style.display,'none');pass();
}
(async()=>{
 await checkLegacy();await checkLatePINPopup();await checkPersonal();
 assert(dual.includes('const finalCheck=await getDocFromServer'));
 assert(legacy.includes('async function unlockAdmin()'));
 pass();
 console.log('Dual-mode Admin STAGING: '+tests+'/'+tests+' integration-mock checks PASS.');
 console.log('NOT a real Firebase, actual PIN, production vault, or real-browser test.');
})().catch(err=>{console.error('FAIL: '+err.stack);process.exitCode=1});
