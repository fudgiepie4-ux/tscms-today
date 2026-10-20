/* STAGING-ONLY: TSCMS dual-mode Admin. Keep old PIN in mc.js unchanged.
   NO production deployment without Owner approval, verified rules and v2 bundle QA. */
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,
  sendEmailVerification,sendPasswordResetEmail,reload,signOut,getIdToken,setPersistence,inMemoryPersistence,deleteUser} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {getFirestore,doc,collection,writeBatch,serverTimestamp,
  getDocFromServer,getDocs,updateDoc} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import {tscmsFirebaseConfig} from "./firebase-admin-config.js";

// Separate in-memory Auth context: registering staff must NEVER sign out the Owner.
const app=initializeApp(tscmsFirebaseConfig),auth=getAuth(app),db=getFirestore(app);
const registrationApp=initializeApp(tscmsFirebaseConfig,"tcms-staff-registration");
const signupAuth=getAuth(registrationApp),signupDb=getFirestore(registrationApp);
const gate=document.getElementById("admingate"),adminBody=document.getElementById("adminbody");
if(!gate||!adminBody||!gate.querySelector(".staff-panel"))throw new Error("Admin page structure changed");
const styles=document.createElement("style");
styles.textContent=".tc-auth{max-width:480px;margin:20px auto;padding:20px;background:#201b17;color:#fff0d3;border:1px solid #ad884c;border-radius:14px;font:15px system-ui,sans-serif}"
+".tc-auth h2{color:#ffda8d;margin:0 0 8px}.tc-auth p{line-height:1.5}.tc-auth label{display:block;font-size:13px;margin-top:12px}"
+".tc-auth input{width:100%;box-sizing:border-box;min-height:44px;padding:12px;margin:5px 0;background:#101314;color:white;border:1px solid #ac8e5d;border-radius:8px}"
+".tc-auth button,.tc-owner button{min-height:44px;margin:9px 6px 0 0;padding:9px 15px;background:#dfae54;border:1px solid #edc77d;border-radius:8px;color:#211602;font-weight:700;cursor:pointer}"
+".tc-auth .tc-later{background:#162326;color:#9ae2d9;border-color:#6ebcb1}.tc-auth-status{color:#ffda8d;min-height:20px;font-size:13px;padding:7px 0}"
+"dialog.tc-auth{width:min(95vw,500px);max-height:90vh;overflow:auto;box-shadow:0 10px 45px #000c}"
+"dialog.tc-auth::backdrop{background:#000c}.tc-owner{max-width:940px;margin:12px auto;padding:14px;background:#192421;color:#ecf9f4;border:1px solid #6bada4;border-radius:12px}"
+".tc-owner-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid #57796f}";
document.head.appendChild(styles);
const login=document.createElement("section");
login.className="tc-auth";
login.innerHTML='<h2>👤 Personal Admin Login</h2><p>Approved administrators: sign in with your private email and password. Your display username is separate.</p>'
+'<form id="tc-login-form"><label>Email address<input name="email" type="email" autocomplete="username" required></label>'
+'<label>Personal password<input name="password" type="password" autocomplete="current-password" required></label>'
+'<button type="submit">Enter Control Room</button><button class="tc-later" id="tc-reset" type="button">Forgot password?</button></form>'
+'<p>Still using the shared PIN? Enter it in the original panel above. After it unlocks the room, you can create your personal account.</p>'
+'<div id="tc-login-status" class="tc-auth-status" role="status"></div>';
gate.appendChild(login);
const dialog=document.createElement("dialog");
dialog.className="tc-auth";
dialog.setAttribute("aria-label","Create your personal Admin account");
dialog.innerHTML='<h2>👑 Create Your Personal Admin Account</h2>'
+'<p>Your PIN has unlocked the Admin Control Room. You may continue using it through October 31. Set up your personal login now for November 1 and later. New accounts require email verification and Fudgie’s approval.</p>'
+'<form id="tc-upgrade-form"><label>Real full name<input name="fullName" autocomplete="name" required maxlength="100"></label>'
+'<label>Choose a display username<input name="username" autocomplete="nickname" pattern="[a-zA-Z0-9_]{3,30}" minlength="3" maxlength="30" required></label>'
+'<label>Private login email<input name="email" type="email" autocomplete="email" required></label>'
+'<label>Personal password<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>'
+'<label>Confirm personal password<input name="confirm" type="password" autocomplete="new-password" minlength="8" required></label>'
+'<button type="submit">Create Account & Request Approval</button>'
+'<button type="button" class="tc-later" id="tc-resend-verify" hidden>Resend Verification Email</button>'
+'<button type="button" class="tc-later" id="tc-notnow">Not now — continue with PIN</button>'
+'<div id="tc-upgrade-status" class="tc-auth-status" role="status"></div></form>';
document.body.appendChild(dialog);
const loginMsg=document.getElementById("tc-login-status"),signupMsg=document.getElementById("tc-upgrade-status");
const updateStatus=(node,message)=>node.textContent=message;
let pinPrompted=false,firebaseApproved=false,orphanSignupUid=null,registeredUser=null;
const pinObserver=new MutationObserver(()=>{
  // Watches the EXISTING PIN decrypt success. Nothing about unlockAdmin() is changed.
  if(adminBody.style.display==="block"&&!pinPrompted&&!firebaseApproved){
    pinPrompted=true;
    if(dialog.showModal)dialog.showModal();else dialog.setAttribute("open","");
  }
});
pinObserver.observe(adminBody,{attributes:true,attributeFilter:["style"]});
document.getElementById("tc-notnow").addEventListener("click",()=>dialog.close());
function readableError(err){
  if(err?.code==="auth/weak-password")return "Please choose a stronger password.";
  if(err?.code==="auth/retry-original-email")return "Finish the earlier registration using the same email, or contact Fudgie for assistance.";
  if(err?.code==="auth/email-already-in-use")return "This email already has an account. Use Personal Admin Login; if your profile is incomplete, ask Fudgie for help.";
  if(err?.code==="auth/too-many-requests")return "Too many attempts. Please wait and try again.";
  if(err?.name==="OperationError"||err?.name==="DataError")
    return "The protected Admin data could not be unlocked. Please contact Fudgie. The shared PIN is unaffected.";
  if(err?.code?.includes("permission-denied"))return "The registration was blocked by Firebase rules. Your email login might already exist; ask Fudgie to check before trying another account.";
  return "Unable to complete the request. Please try again or ask Fudgie for help. ("+(err?.code||"connection error")+")";
}
document.getElementById("tc-upgrade-form").addEventListener("submit",async(event)=>{
  event.preventDefault();
  const form=event.currentTarget,submit=form.querySelector('button[type="submit"]');
  const name=form.elements.fullName.value.trim();
  const username=form.elements.username.value.trim().toLowerCase();
  const email=form.elements.email.value.trim().toLowerCase();
  const password=form.elements.password.value;
  if(password!==form.elements.confirm.value){updateStatus(signupMsg,"Passwords do not match.");return;}
  if(!/^[a-z0-9_]{3,30}$/.test(username)||!name||name.length>100){
    updateStatus(signupMsg,"Check the full name and display username (3–30 letters, numbers, underscores).");return;
  }
  submit.disabled=true;updateStatus(signupMsg,"Creating account and pending request…");
  let newlyCreated=false,user=null,profileSaved=false;
  try{
    // In-memory registration context avoids replacing Fudgie's signed-in account.
    await setPersistence(signupAuth,inMemoryPersistence);
    if(orphanSignupUid && signupAuth.currentUser?.uid===orphanSignupUid){
      user=signupAuth.currentUser;
      if(user.email?.toLowerCase()!==email)throw {code:"auth/retry-original-email"};
    }else{
      const credential=await createUserWithEmailAndPassword(signupAuth,email,password);
      user=credential.user;newlyCreated=true;orphanSignupUid=user.uid;
    }
    // v4 rules require the two documents to be written atomically.
    const batch=writeBatch(signupDb),createdAt=serverTimestamp();
    batch.set(doc(signupDb,"usernames",username),{uid:user.uid,createdAt});
    batch.set(doc(signupDb,"users",user.uid),{
      email:user.email,username,fullName:name,admin:false,owner:false,
      status:"pending",createdAt,registrationPath:"pin"
    });
    await batch.commit();
    profileSaved=true;orphanSignupUid=null;registeredUser=user;
    document.getElementById("tc-resend-verify").hidden=false;
    submit.hidden=true;
    try{
      await sendEmailVerification(user);
      updateStatus(signupMsg,"Registration saved! Verify the email in your inbox, then wait for Fudgie to verify your identity and approve. You can continue with the PIN through Oct 31.");
    }catch(err){
      updateStatus(signupMsg,"Account saved and awaiting approval, but the verification email could not be sent. Use Resend Verification Email below, or ask Fudgie for assistance.");
    }
  }catch(err){
    if(newlyCreated && user && !profileSaved){
      try{
        // Remove an unusable Auth-only record, allowing a clean username retry.
        await deleteUser(user);orphanSignupUid=null;
        await signOut(signupAuth);
      }catch(_){
        updateStatus(signupMsg,"Registration was not completed, and your email sign-in may exist. Ask Fudgie for help before creating another account.");return;
      }
    }
    updateStatus(signupMsg,readableError(err));
  }finally{
    form.elements.password.value="";form.elements.confirm.value="";
    submit.disabled=false;
  }
});
document.getElementById("tc-resend-verify").addEventListener("click",async()=>{
  if(!registeredUser)return;
  try{
    await sendEmailVerification(registeredUser);
    updateStatus(signupMsg,"New verification email requested. Check your inbox.");
  }catch(_){updateStatus(signupMsg,"Could not resend now. Please try again later or contact Fudgie.");}
});
document.getElementById("tc-reset").addEventListener("click",async()=>{
  const email=document.getElementById("tc-login-form").elements.email.value.trim();
  if(!email){updateStatus(loginMsg,"Enter your email first.");return;}
  try{await sendPasswordResetEmail(auth,email);updateStatus(loginMsg,"If the account exists, check that inbox for a reset link.");}
  catch(e){updateStatus(loginMsg,"Password reset request could not be sent right now.");}
});
function base64Bytes(value){
  if(typeof value!=="string")throw new Error("Missing key or ciphertext");
  const decoded=atob(value),out=new Uint8Array(decoded.length);
  for(let i=0;i<decoded.length;i++)out[i]=decoded.charCodeAt(i);
  return out;
}
async function loadNewAdminData(){
  // Cherish/Clara confirmed v2 crypto contract. Production bundle NOT YET PREPARED:
  // Firestore /vault/keys {keys:{v2:<base64 of raw 32 bytes>}, current:"v2"}
  // CONFIRMED by Cherish at 06:52 CT Oct 20, 2026; still STAGING ONLY.
  // admin-data.v2.enc.json {formatVersion:2,kid:"v2",iv:<base64 12-byte GCM nonce>,ct:<base64 ciphertext+tag>}
  // AAD UTF8: tscms-admin-data|formatVersion=2|kid=v2 (no newline).
  // Cherish's 274-byte crypto-only synthetic fixture uses `danger_zone` rather than
  // the actual Admin UI's `danger` and omits `flags`; it validates crypto, NOT
  // dashboard schema parity. Request an actual Admin-shaped synthetic fixture.
  // Python AESGCM.encrypt and WebCrypto AES-GCM append the 16-byte tag to ct.
  const vaultSnapshot=await getDocFromServer(doc(db,"vault","keys"));
  if(!vaultSnapshot.exists())throw new Error("Personal-login data key is not prepared yet");
  const vault=vaultSnapshot.data();
  const response=await fetch("./admin-data.v2.enc.json",{cache:"no-store"});
  if(!response.ok)throw new Error("Personal-login dataset is not prepared yet");
  const envelope=await response.json();
  if(envelope.formatVersion!==2||envelope.kid!==vault.current||!envelope.iv||!envelope.ct)
    throw new Error("Personal-login data format or key version does not match bundle");
  const raw=base64Bytes(vault.keys?.[envelope.kid]);
  const iv=base64Bytes(envelope.iv),ct=base64Bytes(envelope.ct);
  if(raw.byteLength!==32)throw new Error("Expected a 256-bit encryption key");
  if(iv.byteLength!==12||ct.byteLength<16)throw new Error("Invalid encrypted Admin envelope");
  const key=await crypto.subtle.importKey("raw",raw,{name:"AES-GCM"},false,["decrypt"]);
  const aad=new TextEncoder().encode("tscms-admin-data|formatVersion=2|kid="+envelope.kid);
  const clear=await crypto.subtle.decrypt(
    {name:"AES-GCM",iv,additionalData:aad,tagLength:128},key,ct);
  const data=JSON.parse(new TextDecoder().decode(clear));
  if(!data||typeof data.stats!=="object"||data.stats===null||!Array.isArray(data.danger)||!Array.isArray(data.flags)||typeof data.generated!=="string")throw new Error("New Admin dataset is incomplete");
  return data;
}
async function personalLogin(user){
  await reload(user);
  await getIdToken(user,true); // Refresh the email_verified security-rules claim.
  if(!user.emailVerified){updateStatus(loginMsg,"Check your email verification link first. Then sign in again.");return;}
  const ref=await getDocFromServer(doc(db,"users",user.uid));
  if(!ref.exists()){updateStatus(loginMsg,"Account registration incomplete. Contact Fudgie.");return;}
  const profile=ref.data();
  if(profile.status!=="approved"||!(profile.admin===true||profile.owner===true)){
    updateStatus(loginMsg,"Your account is not approved or is no longer active. Only Fudgie can grant access.");return;
  }
  if(!window.isSecureContext||!crypto?.subtle)throw new Error("HTTPS required");
  updateStatus(loginMsg,"Account approved. Loading the Control Room…");
  const data=await loadNewAdminData();
  firebaseApproved=true;
  gate.style.display="none";adminBody.style.display="block";
  if(typeof window.zi==="function")window.zi(data.danger,data.generated);
  if(typeof window.ziIssues==="function")window.ziIssues(data.flags||[]);
  const logout=document.createElement("button");
  logout.textContent="Sign Out of Personal Admin";
  logout.style.cssText="min-height:44px;display:block;margin:8px auto;";
  logout.addEventListener("click",async()=>{
    await signOut(auth);
    window.location.reload();
  });
  adminBody.prepend(logout);
  if(profile.owner===true)await showOwnerApprovals(user.uid);
}
document.getElementById("tc-login-form").addEventListener("submit",async(ev)=>{
  ev.preventDefault();
  const form=ev.currentTarget,button=form.querySelector('button[type="submit"]');
  button.disabled=true;updateStatus(loginMsg,"Signing in…");
  try{
    const loginResult=await signInWithEmailAndPassword(auth,form.elements.email.value.trim(),form.elements.password.value);
    form.elements.password.value="";
    await personalLogin(loginResult.user);
  }catch(err){updateStatus(loginMsg,readableError(err));form.elements.password.value="";}
  finally{button.disabled=false;}
});
async function showOwnerApprovals(ownerUid){
  const panel=document.createElement("section");panel.id="tc-owner-panel";panel.className="tc-owner";
  panel.innerHTML="<h2>👑 Pending Admin Approvals</h2><p>Only Fudgie can review private names and emails or approve access.</p>";
  adminBody.prepend(panel);
  async function refresh(){
    panel.querySelectorAll(".tc-owner-row").forEach(n=>n.remove());
    const profiles=await getDocs(collection(db,"users")); // Firestore v4 Owner-only list
    const others=profiles.docs.filter(d=>d.id!==ownerUid);
    for(const profile of others){
      const data=profile.data(),row=document.createElement("div");row.className="tc-owner-row";
      const label=document.createElement("span");
      label.textContent=[data.fullName,data.username,data.email,"Status: "+data.status].filter(Boolean).join(" · ");
      row.appendChild(label);
      async function update(changes){
        try{await updateDoc(doc(db,"users",profile.id),changes);await refresh();}
        catch(err){updateStatus(loginMsg,"Account review action failed. No change was confirmed.");}
      }
      if(data.status==="pending"){
        for(const [text,changes] of [
          ["Approve",{status:"approved",admin:true,approvedAt:serverTimestamp(),approvedBy:ownerUid}],
          ["Reject",{status:"rejected",admin:false}]
        ]){
          const button=document.createElement("button");button.textContent=text;
          button.addEventListener("click",()=>{
            const identityConfirmed=text!=="Approve" || window.confirm(
              "Have you personally contacted and verified "+(data.fullName||data.username||"this person")+
              " and confirmed their email? Approve only after your own identity check."
            );
            if(identityConfirmed)update(changes);
          });row.appendChild(button);
        }
      }else if(data.status==="approved"){
        const revoke=document.createElement("button");revoke.textContent="Revoke";
        revoke.addEventListener("click",()=>update({status:"revoked",admin:false}));row.appendChild(revoke);
      }
      panel.appendChild(row);
    }
    if(!others.length){const p=document.createElement("p");p.className="tc-owner-row";p.textContent="No registrations yet.";panel.appendChild(p);}
  }
  await refresh();
}
