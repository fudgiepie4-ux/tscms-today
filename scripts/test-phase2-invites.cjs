'use strict';
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
async function main(){
  const {TEST_PROJECT,TTL_MS,assertTestOnly,normalizeEmail,inviteToken,
    recipientCanClaim,isUnexpired,pendingProfile,safeInviteUrl}=
    await import(path.resolve('phase2-invitations-test/phase2-core.mjs'));
  const rules=fs.readFileSync('phase2-invitations-test/phase2-v5-TEST-ONLY.rules','utf8');
  const app=fs.readFileSync('phase2-invitations-test/phase2-app.js','utf8');
  const dual=fs.readFileSync('phase2-invitations-test/tscms-admin-dual-phase2-TEST.js','utf8');
  const real=fs.readFileSync('tscms-admin-dual.js','utf8');
  const cases=[
  ['01 Refuses production Firebase project and domain',()=>{
    assert.throws(()=>assertTestOnly({projectId:'tscms-admin',apiKey:'key',appId:'app'},'test.example'));
    assert.throws(()=>assertTestOnly({projectId:TEST_PROJECT,apiKey:'key',appId:'app'},'tscmsradio.com'));
    assert.throws(()=>assertTestOnly({projectId:TEST_PROJECT,apiKey:'TEST_FIREBASE_CONFIG_REQUIRED',appId:'app'},'test.example'));
  }],
  ['02 Generates random 256-bit base64url tokens',()=>{
    const a=inviteToken(webcrypto),b=inviteToken(webcrypto);
    assert.match(a,/^[A-Za-z0-9_-]{43}$/);assert.notEqual(a,b);
  }],
  ['03 Normalizes and validates bound recipient email',()=>{
    assert.equal(normalizeEmail('  Example@Mail.com '),'example@mail.com');
    assert.throws(()=>normalizeEmail('invalid'));
  }],
  ['04 Expires invite after exactly seven-day maximum',()=>{
    assert.equal(TTL_MS,604800000);
    assert.match(rules,/duration.value\(7,'d'\)/);
  }],
  ['05 Wrong verified email fails claim',()=>{
    const invite={status:'issued',email:'real@example.invalid',expiresAt:{toMillis:()=>2000}};
    assert.equal(recipientCanClaim(invite,'fake@example.invalid',1000),false);
  }],
  ['06 Expired, revoked and used invites fail replays',()=>{
    const base={email:'recipient@example.invalid',expiresAt:{toMillis:()=>2000}};
    assert.equal(isUnexpired({...base,status:'issued'},2000),false);
    assert.equal(isUnexpired({...base,status:'revoked'},1000),false);
    assert.equal(isUnexpired({...base,status:'used'},1000),false);
  }],
  ['07 Only verified Firebase email can build pending user profile',()=>{
    const inviteId=inviteToken(webcrypto);
    assert.throws(()=>pendingProfile({authUser:{uid:'1',emailVerified:false,email:'member@example.invalid'},
      fullName:'TEST',username:'tester',invitationId:inviteId,createdAt:{}}));
    const p=pendingProfile({authUser:{uid:'1',emailVerified:true,email:'member@example.invalid'},
      fullName:'TEST',username:'Test_User',inviteId,createdAt:{}});
    assert.equal(p.status,'pending');assert.equal(p.admin,false);assert.equal(p.owner,false);
    assert.equal(p.username,'test_user');assert.equal(p.registrationPath,'invite');
  }],
  ['08 Rules allow only owner-created and owner-revoked invites',()=>{
    assert.ok(rules.includes('allow create: if isOwner()'));assert.ok(rules.includes("status == 'revoked'"));
    assert.ok(rules.includes('allow delete: if false'));
  }],
  ['09 Rules enforce atomic invite claim and verified email',()=>{
    assert.ok(rules.includes("&& isVerified()"));
    assert.ok(rules.includes("getAfter(/databases/$(database)/documents/invitations/$(id)).data.status == 'used'"));
    assert.ok(rules.includes("getAfter(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'pending'"));
    assert.ok(rules.includes("getAfter(/databases/$(database)/documents/users/$(request.auth.uid)).data.invitationId == inviteId"));
    assert.ok(app.includes("batch.update(doc(db,'invitations',token)"));
  }],
  ['10 Resend cannot extend expiry or grant access',()=>{
    assert.ok(rules.includes("affectedKeys().hasOnly("));
    assert.ok(rules.includes("['lastSentAt','resendCount']"));
    assert.ok(rules.includes('resource.data.resendCount < 5'));
  }],
  ['11 Authenticated refresh repeats full authorization and validation',()=>{
    assert.ok(dual.includes('onAuthStateChanged(auth,user=>'));
    assert.ok(dual.includes('setPersistence(auth,browserLocalPersistence)'));
    assert.ok(dual.includes('void personalLogin(user)'));
    assert.ok(dual.includes('await getIdToken(user,true)'));
    assert.ok(dual.includes('const finalCheck=await getDocFromServer('));
  }],
  ['12 Live Owner inbox listener cleans up on sign-out',()=>{
    assert.ok(dual.includes('onSnapshot(collection(db,"users")'));
    assert.ok(dual.includes('stopOwnerInbox(); // Detach Owner-only'));
    assert.ok(dual.includes('if(snapshot.metadata.fromCache)'));
    assert.ok(dual.includes('setInterval(()=>{void validateOpenPersonalSession();},60000)'));
    assert.ok(dual.includes('armedRevoke.profileId===profile.id'));
  }],
  ['13 Preserves legacy PIN path unchanged in production',()=>{
    assert.ok(dual.includes('offerPersonalSetupAfterPin'));
    assert.ok(real.includes('offerPersonalSetupAfterPin'));
    assert.ok(!real.includes('phase2-v5-TEST-ONLY.rules'));
  }],
  ['14 No secret is persisted in browser storage',()=>{
    assert.ok(!dual.includes('localStorage.setItem('));
    assert.ok(!app.includes('localStorage.setItem('));
    assert.ok(app.includes('inMemoryPersistence'));
  }],
  ['15 Prevents leaking invitation token in server URL query',()=>{
    const url=safeInviteUrl('https://test.example','/phase2/index.html',inviteToken(webcrypto));
    assert.ok(url.includes('#invite='));assert.ok(!url.includes('?invite='));
  }],
  ['16 TEST invitation UX names clear status and owner review',()=>{
    const html=fs.readFileSync('phase2-invitations-test/index.html','utf8');
    assert.ok(html.includes('TEST PROJECT ONLY'));assert.ok(html.includes('PENDING'));assert.ok(html.includes('Fudgie'));
    assert.ok(app.includes('PENDING'));assert.ok(!app.includes('admin:true'));
  }]
  ];
  let pass=0;for(const [name,fn] of cases){try{await fn();pass++;}catch(e){console.error('FAIL '+name);throw e;}}
  console.log('TSCMS Phase 2 isolated static+helper preflight: '+pass+'/'+cases.length+' PASS.');
  console.log('IMPORTANT: This does NOT prove Firestore rules compile nor count as 12 live security tests.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
