/* TSCMS Coming Up uploader: authenticated and approved staff only.
   The Firebase rules are the actual authorization boundary. No shared-PIN bypass. */
import {initializeApp,getApp,getApps} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js';
import {getAuth,onAuthStateChanged,reload,getIdToken} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import {getFirestore,doc,collection,getDocFromServer,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';
import {getStorage,ref,uploadBytes,deleteObject} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-storage.js';
import {tscmsFirebaseConfig} from './firebase-admin-config.js';

const app=getApps().length?getApp():initializeApp(tscmsFirebaseConfig);
const auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
const MAX_SIZE=4*1024*1024;
const mimeToExtension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const host=document.getElementById('adminbody');
let panel=null,checking=0;
function nowCT(){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
    timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return parts.year+'-'+parts.month+'-'+parts.day+'T'+parts.hour+':'+parts.minute;
}
async function approvedEditor(user){
  if(!user||!user.uid)return false;
  await reload(user);
  await getIdToken(user,true);
  if(auth.currentUser?.uid!==user.uid||user.emailVerified!==true)return false;
  const snap=await getDocFromServer(doc(db,'users',user.uid));
  if(!snap.exists())return false;
  const p=snap.data();
  if(p.status!=='approved'||(p.admin!==true&&p.owner!==true))return false;
  if(p.owner===true)return true;
  const editor=await getDocFromServer(doc(db,'promoEditors',user.uid));
  return editor.exists()&&editor.data().enabled===true;
}
function addStyles(){
  if(document.getElementById('tscms-promo-admin-style'))return;
  const style=document.createElement('style');
  style.id='tscms-promo-admin-style';
  style.textContent=
    '.tscms-promo-admin{margin:24px auto;padding:19px;max-width:800px;background:#231a10;border:2px solid #bc975e;border-radius:14px;color:#f6e6ca;font:15px/1.5 system-ui,sans-serif}'+
    '.tscms-promo-admin h2{font:700 23px/1.3 Georgia,serif;color:#ffd88a;margin:0 0 6px}'+
    '.tscms-promo-admin p{margin:0 0 12px}'+
    '.tscms-promo-admin label{display:block;font-weight:700;margin:12px 0 4px}'+
    '.tscms-promo-admin input{width:100%;max-width:100%;min-height:45px;border:1px solid #97784a;border-radius:7px;padding:10px;background:#0e0b09;color:#fff8e9;font:16px system-ui,sans-serif}'+
    '.tscms-promo-admin input[type=file]{height:auto;line-height:1.5}'+
    '.tscms-promo-admin button{min-height:46px;margin-top:16px;padding:10px 18px;background:#e8b76b;color:#201405;border:1px solid #ffe0a1;border-radius:8px;font:700 16px system-ui,sans-serif;cursor:pointer}'+
    '.tscms-promo-admin button:disabled{cursor:wait;opacity:.65}'+
    '.tscms-promo-admin .tscms-promo-admin-status{margin:12px 0 0;color:#ffdd9c;min-height:24px}';
  document.head.appendChild(style);
}
function removePanel(){panel?.remove();panel=null;}
function showPanel(user){
  if(!host||panel||auth.currentUser?.uid!==user.uid)return;
  addStyles();
  panel=document.createElement('section');
  panel.id='tscms-promo-admin';
  panel.className='tscms-promo-admin';
  panel.setAttribute('aria-labelledby','tscms-promo-admin-title');
  const heading=document.createElement('h2');
  heading.id='tscms-promo-admin-title';
  heading.textContent='📅 Coming Up — Promo Calendar';
  const help=document.createElement('p');
  help.textContent='Upload a promo image and schedule its public listing. The homepage updates as soon as publishing succeeds. All dates and times below are Central Time (CT).';
  const form=document.createElement('form');
  function field(label,type,opts={}){
    const wrap=document.createElement('label');
    wrap.textContent=label;
    const input=document.createElement('input');
    input.type=type;input.required=true;
    input.name=opts.name||'';input.maxLength=opts.maxLength||524288;
    if(opts.accept)input.accept=opts.accept;
    if(opts.placeholder)input.placeholder=opts.placeholder;
    if(opts.min)input.min=opts.min;
    wrap.append(input);form.append(wrap);
    return input;
  }
  const title=field('What is the promo? (short title)','text',{name:'title',maxLength:120,placeholder:'Songwriters Workshop promo'});
  const postingBy=field('Who is posting it?','text',{name:'postingBy',maxLength:80,placeholder:'Vickie Gibson'});
  const when=field('Scheduled date and time (Central Time)','datetime-local',{name:'when'});
  when.min=nowCT();
  const file=field('Promo image (JPG, PNG, or WebP — max 4 MB)','file',{name:'image',accept:'image/jpeg,image/png,image/webp'});
  const submit=document.createElement('button');
  submit.type='submit';submit.textContent='Publish Promo';
  const status=document.createElement('p');
  status.className='tscms-promo-admin-status';
  status.setAttribute('role','status');
  form.append(submit,status);
  panel.append(heading,help,form);
  host.prepend(panel);
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const selected=file.files?.[0],extension=mimeToExtension[selected?.type];
    const scheduledAtCT=when.value;
    const name=title.value.trim(),poster=postingBy.value.trim();
    if(!name||name.length>120||!poster||poster.length>80||
       !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(scheduledAtCT)||scheduledAtCT<nowCT()){
      status.textContent='Enter a valid title, poster and future Central Time schedule.';return;
    }
    if(!selected||!extension||selected.size===0||selected.size>MAX_SIZE){
      status.textContent='Choose a JPG, PNG, or WebP image no larger than 4 MB.';return;
    }
    submit.disabled=true;
    let imageRef=null,published=false;
    try{
      status.textContent='Confirming your publishing permission…';
      if(!await approvedEditor(user))throw Error('Permission not approved.');
      if(auth.currentUser?.uid!==user.uid)throw Error('Your session changed.');
      const record=doc(collection(db,'promoEntries'));
      const path='promo-images/'+user.uid+'/'+record.id+'.'+extension;
      imageRef=ref(storage,path);
      status.textContent='Uploading image…';
      await uploadBytes(imageRef,selected,{contentType:selected.type});
      status.textContent='Publishing to the live calendar…';
      await setDoc(record,{title:name,postingBy:poster,scheduledAtCT,
        imagePath:path,createdBy:user.uid,createdAt:serverTimestamp()});
      published=true;
      form.reset();when.min=nowCT();
      status.textContent='✅ Published! Members can see this promo on the homepage now.';
    }catch(err){
      if(imageRef&&!published){try{await deleteObject(imageRef);}catch(_){}}
      status.textContent='Promo was not published. Check your connection, account approval and Firebase rules, then try again.';
      console.warn('TSCMS promo publishing failed:',err?.code||err?.message||'unknown');
    }finally{submit.disabled=false;}
  });
}
if(host){
  onAuthStateChanged(auth,user=>{
    const check=++checking;
    removePanel();
    if(!user)return;
    void approvedEditor(user).then(ok=>{
      if(check!==checking||auth.currentUser?.uid!==user.uid)return;
      if(ok)showPanel(user);
    }).catch(()=>{if(check===checking)removePanel();});
  });
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&auth.currentUser){
      const user=auth.currentUser,check=++checking;
      void approvedEditor(user).then(ok=>{
        if(check!==checking||auth.currentUser?.uid!==user.uid)return;
        if(ok)showPanel(user);else removePanel();
      }).catch(()=>{if(check===checking)removePanel();});
    }
  });
}
