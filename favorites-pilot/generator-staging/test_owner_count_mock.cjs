'use strict';
// TEST-ONLY fast preflight of ACTUAL draft PR #28 function source, with stubbed
// Admin SDK and Functions call transport. Not a Firebase Emulator integration run.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','backend','team-favorites-aggregate.cjs'),'utf8');

const fixture=[
  {uid:'owner-test',status:'approved',owner:true,admin:true,hearts:2},
  {uid:'admin-test',status:'approved',owner:false,admin:true,hearts:3},
  {uid:'empty-admin-test',status:'approved',owner:false,admin:true,hearts:0},
  {uid:'regular-test',status:'approved',owner:false,admin:false,hearts:5},
  {uid:'revoked-test',status:'revoked',owner:false,admin:true,hearts:4},
  {uid:'pending-test',status:'pending',owner:false,admin:true,hearts:7},
];
let reads=0,writes=0;
const firestore={
 doc(p) {
   assert.ok(p.startsWith('users/'));
   return {get:async()=>{reads++;const found=fixture.find(x=>x.uid===p.slice(6));return {exists:!!found,data:()=>found};}};
 },
 collection(p) {
   assert.equal(p,'users');
   return {where(field,op,value){
     assert.deepEqual([field,op,value],['status','==','approved']);
     return {get:async()=>({docs:fixture.filter(x=>x.status==='approved').map(x=>({
       data:()=>x,
       ref:{collection(name){
         assert.equal(name,'favorites');
         return {count(){return {get:async()=>{reads++;return {data:()=>({count:x.hearts})};}}};}};
       }}
     }))})};
   }};
 }
};
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
const sandbox={exports:{},require(module){
 if(module==='firebase-functions/v2/https')return {onCall:(options,fn)=>{
   assert.equal(options.region,'us-central1');return fn;},HttpsError};
 if(module==='firebase-admin/app')return {getApps:()=>[],initializeApp:()=>({})};
 if(module==='firebase-admin/firestore')return {getFirestore:()=>firestore};
 throw Error('unexpected require '+module);
},Date};
vm.runInNewContext(source,sandbox,{filename:'team-favorites-aggregate.cjs'});
const call=sandbox.exports.getTeamFavoritesAggregate;
assert.equal(typeof call,'function');
(async()=>{
 const test=async(name,fn)=>{await fn();console.log('PASS '+name);};
 await test('Approved verified owner: exact 5 hearts in 2 active team accounts',async()=>{
   const out=await call({auth:{uid:'owner-test',token:{email_verified:true}},data:{}});
   assert.equal(out.totalHearts,5);
   assert.equal(out.activeMembers,2);
   assert.deepEqual(Object.keys(out).sort(),['activeMembers','countedAt','totalHearts']);
   assert.ok(!Number.isNaN(Date.parse(out.countedAt)));
 });
 async function denied(name,request,code){
   await test(name,async()=>{await assert.rejects(call(request),e=>e.code===code);});
 }
 await denied('Signed-out request blocked',{auth:null},'unauthenticated');
 await denied('Unverified owner blocked',{auth:{uid:'owner-test',token:{email_verified:false}}},'unauthenticated');
 await denied('Regular approved user cannot spoof owner',{auth:{uid:'regular-test',token:{email_verified:true}},data:{owner:true}},'permission-denied');
 await denied('Revoked admin blocked',{auth:{uid:'revoked-test',token:{email_verified:true}}},'permission-denied');
 await denied('Pending admin blocked',{auth:{uid:'pending-test',token:{email_verified:true}}},'permission-denied');
 await denied('Unknown profile blocked',{auth:{uid:'ghost-test',token:{email_verified:true}}},'permission-denied');
 assert.equal(writes,0);
 console.log('Owner aggregate mock preflight: 7/7 PASS; reads='+reads+
   ' writes=0. NOT a Firebase emulator / deployed function / real-account PASS.');
})().catch(e=>{console.error(e);process.exitCode=1;});
