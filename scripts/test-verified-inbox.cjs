'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const src=fs.readFileSync('tscms-admin-dual.js','utf8');
let passed=0;
function test(name,fn){return Promise.resolve().then(fn).then(()=>{passed++;console.log('PASS '+passed+' '+name);});}
const helper=src.slice(src.indexOf('async function stampEmailVerification('),src.indexOf('function offerPersonalSetupAfterPin('));
assert.ok(helper.startsWith('async function stampEmailVerification('));
assert.ok(helper.includes('function ownerVerificationLabel('));
function harness(verified,existing,opts={}){
  const auth={currentUser:{uid:'test-user-1'}},db={projectId:'test-only'};
  const user={uid:'test-user-1',emailVerified:verified};
  const logs=[],timestamp={server:true}, docRef={db,path:['users','test-user-1']};
  let writes=0;
  const ctx={
    reload:async u=>{logs.push('reload');assert.equal(u.uid,user.uid);},
    getIdTokenResult:async (_u,forced)=>{assert.equal(forced,true);logs.push('token');return {claims:opts.missingClaim?{}:{email_verified:verified}};},
    doc:(database,...path)=>{assert.equal(database,db);assert.deepEqual(path,['users','test-user-1']);return docRef;},
    getDocFromServer:async ref=>{assert.equal(ref,docRef);logs.push('read');return {exists:()=>!opts.missingDoc,data:()=>existing};},
    updateDoc:async (ref,changes)=>{writes++;logs.push('write');assert.equal(ref,docRef);assert.deepEqual(Object.keys(changes).sort(),['emailVerified','emailVerifiedAt']);assert.equal(changes.emailVerified,verified);assert.equal(changes.emailVerifiedAt,timestamp);if(opts.denied)throw {code:'permission-denied'};},
    serverTimestamp:()=>timestamp,
    console:{warn:()=>{logs.push('denied');}}
  };
  vm.runInNewContext(helper+';this.stamp=stampEmailVerification;this.label=ownerVerificationLabel;',ctx);
  return {ctx,user,auth,db,logs,get writes(){return writes;}};
}
(async()=>{
 await test('A new verified Auth claim writes exactly two self fields',async()=>{
  const h=harness(true,{});assert.equal(await h.ctx.stamp(h.user,h.auth,h.db),true);
  assert.equal(h.writes,1);assert.deepEqual(h.logs,['reload','token','read','write']);
 });
 await test('False claim is stamped as false, never mislabeled as Verified',async()=>{
  const h=harness(false,{});assert.equal(await h.ctx.stamp(h.user,h.auth,h.db),false);assert.equal(h.writes,1);
 });
 await test('Same status does not rewrite server timestamp',async()=>{
  const h=harness(true,{emailVerified:true});await h.ctx.stamp(h.user,h.auth,h.db);assert.equal(h.writes,0);
 });
 await test('Permission-denied rules do not escalate or prevent normal Auth claim check',async()=>{
  const h=harness(true,{}, {denied:true});assert.equal(await h.ctx.stamp(h.user,h.auth,h.db),true);
  assert.equal(h.writes,1);assert.ok(h.logs.includes('denied'));
 });
 await test('Missing ID-token claim is never guessed from user.emailVerified',async()=>{
  const h=harness(true,{}, {missingClaim:true});assert.equal(await h.ctx.stamp(h.user,h.auth,h.db),null);assert.equal(h.writes,0);
 });
 await test('Missing profile never creates another document',async()=>{
  const h=harness(true,{}, {missingDoc:true});assert.equal(await h.ctx.stamp(h.user,h.auth,h.db),true);assert.equal(h.writes,0);
 });
 await test('Cross-account attempt is rejected before any Firestore/Auth access',async()=>{
  const h=harness(true,{});const other={currentUser:{uid:'not-user-1'}};
  assert.equal(await h.ctx.stamp(h.user,other,h.db),null);assert.equal(h.logs.length,0);
 });
 await test('Inbox labels keep true / false / absent separate',()=>{
  const h=harness(true,{});
  assert.equal(h.ctx.label({emailVerified:true}),'Verified ✓');
  assert.equal(h.ctx.label({emailVerified:false}),'Not verified');
  assert.equal(h.ctx.label({}),'No sign-in since update');
  assert.equal(h.ctx.label({emailVerified:null}),'No sign-in since update');
  assert.equal(h.ctx.label({emailVerified:'true'}),'No sign-in since update');
 });
 await test('Registration, manual sign-in and session restore all invoke stamp',()=>{
  assert.match(src,/try\{await stampEmailVerification\(user,signupAuth,signupDb\);\}catch\(_\)\{\}/);
  assert.match(src,/const claim=await stampEmailVerification\(user,auth,db\)/);
  assert.match(src,/onAuthStateChanged\(auth,user=>/);
  assert.match(src,/void personalLogin\(user\)\.catch/);
  assert.match(src,/await personalLogin\(loginResult\.user\)/);
 });
 await test('Owner inbox shows status on each row without changing approval authority',()=>{
  assert.match(src,/verified\.textContent=ownerVerificationLabel\(data\)/);
  assert.match(src,/verified\.setAttribute\("aria-label","Email verification: "\+verified\.textContent\)/);
  assert.match(src,/data\.status==="pending"/);
  assert.match(src,/isAllowedPersonalAdmin\(user,profile\)/);
  assert.match(src,/Tap again to revoke access for /);
  assert.match(src,/signupAuth,inMemoryPersistence/);
  assert.doesNotMatch(helper,/setDoc\(|writeBatch\(/);
 });
 console.log('Verification inbox isolated source tests '+passed+'/'+passed+' PASS. Firebase rules and real Auth E2E still require Cherish TEST project.');
})().catch(err=>{console.error(err);process.exitCode=1;});
