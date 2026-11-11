/* TSCMS Coming Up: independent, read-only public promo calendar.
   Firestore is the live source. Images only: never creates or touches audio/video. */
import {initializeApp,getApp,getApps} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js';
import {getFirestore,collection,onSnapshot,query,where,orderBy,limit} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';
import {getStorage,ref,getDownloadURL} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-storage.js';
import {tscmsFirebaseConfig} from './firebase-admin-config.js';

const app=getApps().length?getApp():initializeApp(tscmsFirebaseConfig);
const db=getFirestore(app),storage=getStorage(app);
const weekdays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const chicagoClock=()=>Object.fromEntries(new Intl.DateTimeFormat('en-US',{
  timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',hourCycle:'h23'
}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
function nowCT(){
  const t=chicagoClock();
  return t.year+'-'+t.month+'-'+t.day+'T'+t.hour+':'+t.minute;
}
function prettyCT(value){
  if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value))return 'Time to be announced';
  const [date,time]=value.split('T'),[year,month,day]=date.split('-').map(Number);
  const hour=Number(time.slice(0,2)),minute=time.slice(3);
  const weekday=weekdays[new Date(Date.UTC(year,month-1,day)).getUTCDay()];
  return weekday+', '+month+'/'+day+'/'+year+' · '+(hour%12||12)+':'+minute+(hour>=12?' PM':' AM')+' CT';
}
function make(tag,className,text){
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(text!==undefined)el.textContent=text;
  return el;
}
let renderSerial=0,latest=[],status,list;
async function render(){
  if(!list)return;
  const serial=++renderSerial;
  const entries=latest.filter(p=>typeof p.scheduledAtCT==='string'&&p.scheduledAtCT>=nowCT());
  list.replaceChildren();
  if(!entries.length){status.textContent='No upcoming promos scheduled yet. Check back soon!';return;}
  status.textContent=entries.length+' upcoming '+(entries.length===1?'promo':'promos');
  for(const promo of entries){
    const card=make('article','tscms-promo-card');
    const art=make('div','tscms-promo-art');
    const image=make('img','tscms-promo-image');
    image.alt='Artwork for '+promo.title;
    image.loading='lazy';
    image.decoding='async';
    art.append(image);
    const body=make('div','tscms-promo-copy');
    body.append(make('p','tscms-promo-when',prettyCT(promo.scheduledAtCT)));
    body.append(make('h3','tscms-promo-title',promo.title));
    body.append(make('p','tscms-promo-poster','Posting: '+promo.postingBy));
    card.append(art,body);
    list.append(card);
    if(typeof promo.imagePath==='string'&&
       /^promo-images\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(promo.imagePath)){
      getDownloadURL(ref(storage,promo.imagePath)).then(url=>{
        if(serial===renderSerial)image.src=url;
      }).catch(()=>{if(serial===renderSerial){image.remove();art.textContent='Promo image unavailable';}});
    }else{image.remove();art.textContent='Promo image unavailable';}
  }
}
function init(){
  const wrap=document.querySelector('.wrap');
  const featured=wrap?.querySelector('.feat');
  if(!featured||document.getElementById('tscms-coming-up'))return;
  const section=make('section','tscms-coming-up');
  section.id='tscms-coming-up';
  section.setAttribute('aria-labelledby','tscms-coming-up-title');
  const heading=make('h2','tscms-coming-up-heading','📅 Coming Up');
  heading.id='tscms-coming-up-title';
  status=make('p','tscms-promo-status','Loading upcoming promos…');
  status.setAttribute('role','status');
  list=make('div','tscms-promo-list');
  section.append(heading,status,list);
  // The Sponsor TV module inserts itself after Song of the Week as well.
  // Anchor after the featured card, ahead of Sponsor TV, regardless of boot order.
  featured.insertAdjacentElement('afterend',section);
  const q=query(collection(db,'promoEntries'),where('scheduledAtCT','>=',nowCT()),
    orderBy('scheduledAtCT','asc'),limit(30));
  onSnapshot(q,snapshot=>{
    latest=snapshot.docs.map(d=>d.data()).filter(d=>
      typeof d.title==='string'&&typeof d.postingBy==='string'&&
      d.title.length<=120&&d.postingBy.length<=80);
    void render();
  },()=>{list.replaceChildren();status.textContent='Upcoming promos are temporarily unavailable.';});
  window.setInterval(()=>{if(!document.hidden)void render();},60_000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
