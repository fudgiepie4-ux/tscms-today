/* TSCMS Admin Phase 1 — STAGING regression for approved sessions.
 * Node 18+, run: node tests/admin-session-guard-staging.cjs
 * No network, Firebase login, PIN, data keys, or private user records.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','tscms-admin-dual.js'),'utf8');
const start=source.indexOf('function isAllowedPersonalAdmin(user,profile){');
const end=source.indexOf('async function personalLogin(user){',start);
assert(start>0 && end>start,'guard block not found');
const block=source.slice(start,end);
const create=new Function('document','window','setInterval','reload','getIdToken','getDocFromServer','doc','auth','db','signOut','gate','adminBody',
  'let firebaseApproved=true;\n'+block+'\nreturn {isAllowedPersonalAdmin,endPersonalSession,validateOpenPersonalSession};');

function testContext(opts={}) {
 const actions=[],events={};
 const gate={style:{display:'none'}};
 const adminBody={style:{display:'block'},replaceChildren:()=>actions.push('clearDecryptedDOM')};
 const auth={currentUser:opts.user===null?null:{uid:'STAGING_TEST_UID',emailVerified:opts.verified!==false}};
 const window={location:{reload:()=>actions.push('reloadPage')},addEventListener:(event,handler)=>events[event]=handler};
 const document={hidden:false,addEventListener:(event,handler)=>events[event]=handler};
 const guard=create(document,window,(fn,ms)=>{events.interval=fn;events.intervalMs=ms},
  async()=>actions.push('reloadUser'),async()=>actions.push('freshToken'),
  async()=>{actions.push('fetchRole');
   if(opts.offline)throw new Error('test simulated network outage');
   return {exists:()=>opts.exists!==false,data:()=>({status:opts.status||'approved',admin:opts.admin!==false,owner:false})};
  },()=>({}),auth,{},async()=>{actions.push('firebaseSignOut')},gate,adminBody);
 return {guard,auth,adminBody,gate,actions,events};
}
const cases=[
 ['approved admin',true,{emailVerified:true},{status:'approved',admin:true}],
 ['approved owner',true,{emailVerified:true},{status:'approved',owner:true}],
 ['pending',false,{emailVerified:true},{status:'pending',admin:false}],
 ['revoked',false,{emailVerified:true},{status:'revoked',admin:true}],
 ['unverified',false,{emailVerified:false},{status:'approved',admin:true}],
 ['rejected',false,{emailVerified:true},{status:'rejected',admin:false}],
 ['not admin',false,{emailVerified:true},{status:'approved',admin:false}],
 ['missing profile',false,{emailVerified:true},null]
];
(async()=>{
 let passes=0;
 const ctx=testContext();
 for(const [label,expected,user,profile] of cases){
  assert.equal(ctx.guard.isAllowedPersonalAdmin(user,profile),expected,label);passes++;
 }
 assert.equal(ctx.events.intervalMs,60000);assert.equal(typeof ctx.events.visibilitychange,'function');
 assert.equal(typeof ctx.events.focus,'function');passes++;
 await ctx.guard.validateOpenPersonalSession();
 assert.equal(ctx.adminBody.style.display,'block','approved admin unexpectedly hidden');
 assert.deepEqual(ctx.actions,['reloadUser','freshToken','fetchRole'],'unexpected approved-session actions');passes++;
 const revoked=testContext({status:'revoked'});
 await revoked.guard.validateOpenPersonalSession();
 assert.deepEqual(revoked.actions,['reloadUser','freshToken','fetchRole','clearDecryptedDOM','firebaseSignOut','reloadPage']);
 assert.equal(revoked.adminBody.style.display,'none');assert.equal(revoked.gate.style.display,'block');passes++;
 const offline=testContext({offline:true});
 await offline.guard.validateOpenPersonalSession();
 assert(offline.actions.includes('clearDecryptedDOM'),'offline must hide sensitive dashboard');passes++;
 const missing=testContext({user:null});
 await missing.guard.validateOpenPersonalSession();
 assert(missing.actions.includes('clearDecryptedDOM'),'absent user must hide sensitive dashboard');passes++;
 const noCredential=testContext();noCredential.guard.disableWatch?.();
 // The old PIN function is deliberately NOT imported or touched by this file.
 const mc=fs.readFileSync(path.join(__dirname,'..','mc.js'),'utf8');
 assert(mc.includes('async function unlockAdmin()'),'legacy PIN function missing');passes++;
 assert(source.includes('const finalCheck=await getDocFromServer'),'final pre-render profile check missing');passes++;
 assert(source.includes('adminBody.replaceChildren()'),'decrypted DOM clearing missing');passes++;
 assert(source.includes('window.location.reload()'),'reload required after signout');passes++;
 console.log('Admin session security: '+passes+'/'+passes+' PASS (offline unit mocks; NOT full Firebase E2E).');
})().catch(err=>{console.error('FAIL:',err.message);process.exitCode=1});
