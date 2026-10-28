/* TSCMS owner-only Favorites pilot totals — Spark-safe aggregate reader.
 * Privileged GitHub Actions job writes pilotAggregates/favorites hourly.
 * Browser reads only that one owner-protected document, never member favorites.
 * Missing, malformed or inaccessible data means NO banner, not an error banner.
 */
import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js';
import {getAuth,onAuthStateChanged,reload} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import {getFirestore,doc,getDocFromServer} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';
import {tscmsFirebaseConfig} from './firebase-admin-config.js';
const app=getApps().length?getApp():initializeApp(tscmsFirebaseConfig);
const auth=getAuth(app),db=getFirestore(app);
let epoch=0,panel=null;
function clear(){if(panel){panel.remove();panel=null;}}
function isValidAggregate(totals){
  return totals != null &&
    Number.isSafeInteger(totals.totalHearts) && totals.totalHearts>=0 &&
    Number.isSafeInteger(totals.activeMembers) && totals.activeMembers>=0 &&
    totals.activeMembers<=totals.totalHearts &&
    typeof totals.countedAt==='string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(totals.countedAt) &&
    Number.isFinite(Date.parse(totals.countedAt));
}
function render(totals){
  clear();
  if(!isValidAggregate(totals))return;
  const host=document.getElementById('adminbody');
  if(!host)return;
  const section=document.createElement('section');section.className='tc-owner-favorites-aggregate';
  section.setAttribute('aria-label','Owner Favorites pilot summary');
  section.style.cssText='border:2px solid #cca45d;border-radius:12px;margin:14px auto;padding:16px;max-width:880px;background:#25190f;color:#fceac8;font:15px/1.5 system-ui,sans-serif';
  const heading=document.createElement('h2');heading.textContent='♥ Favorites pilot · Team totals';heading.style.cssText='margin:0 0 9px;font:700 19px Georgia,serif';
  const copy=document.createElement('p');copy.setAttribute('role','status');copy.setAttribute('aria-live','polite');copy.style.margin='0';
  copy.textContent=totals.totalHearts+' hearts saved by '+totals.activeMembers+' team members · Checked '+totals.countedAt;
  section.append(heading,copy);host.prepend(section);panel=section;
}
async function checkOwner(user,ticket){
  clear();
  if(!user)return;
  try{
    await reload(user);
    if(ticket!==epoch||auth.currentUser?.uid!==user.uid||!user.emailVerified)return;
    const snap=await getDocFromServer(doc(db,'users',user.uid));
    if(ticket!==epoch||auth.currentUser?.uid!==user.uid)return;
    const p=snap.exists()?snap.data():null;
    if(p?.status!=='approved'||p?.owner!==true)return;
    const aggregate=await getDocFromServer(doc(db,'pilotAggregates','favorites'));
    if(ticket===epoch&&auth.currentUser?.uid===user.uid)
      render(aggregate.exists()?aggregate.data():null);
  }catch(_){if(ticket===epoch)clear();}
}
onAuthStateChanged(auth,user=>{const ticket=++epoch;void checkOwner(user,ticket);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&auth.currentUser){const ticket=++epoch;void checkOwner(auth.currentUser,ticket);}});
