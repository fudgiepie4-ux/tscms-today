/* TSCMS Admin account workflow — STAGING ONLY; NOT IMPORTED BY ANY PAGE.
 * Depends on injected official Firebase modular SDK adapters.
 * No SDK initialization, credentials, production writes, or account access
 * occurs merely by loading this file.
 * PIN checking is only a temporary UI step; it does NOT confer admin rights.
 * Firebase security rules enforce verified + approved roles, not this JS.
 * Other applicants' email-verification status cannot be read via client
 * Firestore, so the Owner queue shows UNKNOWN rather than guessing.
 */
function createTscmsAdminWorkflow(options) {
  'use strict';
  const {auth,db,sdk,validateLegacyPin}=options;
  if(!auth||!db||!sdk)throw Error('MISSING_DEPENDENCIES');
  let didPin=false;
  const fail=code=>{throw Error(code)};
  const clean=v=>typeof v==='string'?v.trim():'';
  const normalizeEmail=v=>clean(v).toLowerCase();
  function validateForm(p){
    const fullName=clean(p.fullName).replace(/\s+/g,' ');
    const email=normalizeEmail(p.email),username=clean(p.username).toLowerCase();
    if(!fullName||fullName.length>100)fail('INVALID_FULL_NAME');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)fail('INVALID_EMAIL');
    if(!/^[a-z0-9_]{3,30}$/.test(username))fail('INVALID_USERNAME');
    if(typeof p.password!=='string'||p.password.length<12)fail('PASSWORD_TOO_SHORT');
    if(p.password!==p.confirmPassword)fail('PASSWORD_CONFIRMATION_MISMATCH');
    return {fullName,email,username};
  }
  async function startPinSetup(pin){
    didPin=false;
    // Do not impose a client-side deadline. The server-side registration
    // policy remains authoritative and requires a separately approved update.
    if(typeof validateLegacyPin!=='function')fail('PIN_VALIDATOR_UNAVAILABLE');
    if(typeof pin!=='string'||!pin)fail('PIN_REQUIRED');
    const valid=await validateLegacyPin(pin);
    if(valid!==true)fail('PIN_NOT_ACCEPTED');
    didPin=true;
    return {showRegistrationPopup:true,authorizedForAdmin:false};
  }
  async function registerPending(form){
    if(!didPin)fail('PIN_STEP_REQUIRED');
    if(auth.currentUser)fail('SIGN_OUT_BEFORE_REGISTRATION');
    const data=validateForm(form);
    let created;
    try{
      const credential=await sdk.createUserWithEmailAndPassword(auth,data.email,form.password);
      created=credential.user;
      const batch=sdk.writeBatch(db);
      batch.set(sdk.doc(db,'users',created.uid),{
        email:data.email,fullName:data.fullName,username:data.username,
        status:'pending',admin:false,owner:false,
        createdAt:sdk.serverTimestamp(),registrationPath:'pin'
      });
      batch.set(sdk.doc(db,'usernames',data.username),{
        uid:created.uid,createdAt:sdk.serverTimestamp()
      });
      await batch.commit();
    }catch(error){
      if(created){
        try{await sdk.deleteUser(created)}
        catch(_){
          try{await sdk.signOut(auth)}catch(__){}
          fail('AUTH_ACCOUNT_EXISTS_BUT_PROFILE_FAILED');
        }
      }
      throw error;
    }finally{didPin=false}
    let verificationSent=false;
    try{await sdk.sendEmailVerification(created);verificationSent=true}catch(_){}
    return {status:'pending',verificationSent,authorizedForAdmin:false};
  }
  async function currentStatus(){
    const user=auth.currentUser;
    if(!user)return {state:'signed_out',authorizedForAdmin:false,isOwner:false};
    await sdk.reload(user);
    await sdk.getIdToken(user,true);
    const snap=await sdk.getDoc(sdk.doc(db,'users',user.uid));
    if(!snap.exists())return {state:'profile_missing',authorizedForAdmin:false,isOwner:false};
    const profile=snap.data();
    const isVerified=user.emailVerified===true,isApproved=profile.status==='approved';
    const role=profile.admin===true||profile.owner===true;
    const canAccess=isVerified&&isApproved&&role;
    return {
      state:!isVerified?'verify_email':!isApproved?(profile.status||'pending'):!role?'no_admin_role':'approved',
      authorizedForAdmin:canAccess,isOwner:canAccess&&profile.owner===true,
      username:profile.username||'',status:profile.status||'pending'
    };
  }
  async function signIn(email,password){
    if(!password||typeof password!=='string')fail('PASSWORD_REQUIRED');
    await sdk.signInWithEmailAndPassword(auth,normalizeEmail(email),password);
    return currentStatus();
  }
  async function ownerGuard(){
    const state=await currentStatus();
    if(!state.isOwner)fail('OWNER_AUTHORIZATION_REQUIRED');
    return auth.currentUser.uid;
  }
  async function pendingRequests(){
    await ownerGuard();
    const result=await sdk.getDocs(sdk.collection(db,'users')),out=[];
    result.forEach(s=>{
      const p=s.data();
      if(p.status==='pending'&&p.owner!==true)out.push({
        uid:s.id,fullName:p.fullName,username:p.username,email:p.email,
        emailVerification:'UNKNOWN_TO_CLIENT'
      });
    });
    return out;
  }
  async function changeApproval(uid,action){
    const ownerUid=await ownerGuard();
    if(!uid||typeof uid!=='string'||uid===ownerUid)fail('INVALID_TARGET');
    if(!['approve','reject','revoke'].includes(action))fail('INVALID_ACTION');
    const ref=sdk.doc(db,'users',uid),snap=await sdk.getDoc(ref);
    if(!snap.exists())fail('USER_NOT_FOUND');
    const target=snap.data();
    if(target.owner===true)fail('CANNOT_CHANGE_OWNER');
    if(action==='approve'&&target.status!=='pending')fail('APPROVAL_REQUIRES_PENDING');
    if(action==='reject'&&target.status!=='pending')fail('REJECTION_REQUIRES_PENDING');
    if(action==='revoke'&&target.status!=='approved')fail('REVOCATION_REQUIRES_APPROVED');
    const change=action==='approve'
      ?{status:'approved',admin:true,approvedAt:sdk.serverTimestamp(),approvedBy:ownerUid}
      :{status:action==='reject'?'rejected':'revoked',admin:false};
    await sdk.updateDoc(ref,change);
    return {uid,status:change.status};
  }
  async function resendVerification(){
    const user=auth.currentUser;
    if(!user)fail('NOT_SIGNED_IN');
    await sdk.reload(user);
    if(user.emailVerified)return {alreadyVerified:true};
    await sdk.sendEmailVerification(user);
    return {verificationSent:true};
  }
  async function resetPassword(email){
    const address=normalizeEmail(email);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))fail('INVALID_EMAIL');
    await sdk.sendPasswordResetEmail(auth,address);
    return {message:'If this account exists, follow the email instructions.'};
  }
  async function signOut(){didPin=false;await sdk.signOut(auth)}
  return Object.freeze({startPinSetup,registerPending,signIn,currentStatus,ownerGuard,
    pendingRequests,changeApproval,resendVerification,resetPassword,signOut});
}

if(typeof module!=='undefined'&&module.exports){
  module.exports={createTscmsAdminWorkflow};
}
