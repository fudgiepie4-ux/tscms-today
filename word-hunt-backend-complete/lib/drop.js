import {randomUUID} from 'node:crypto';
import {dateCT,timeCT,activeDay} from './core.js';

// Private Blob storage; one immutable activation record per contest and Central calendar day.
export function dropKey(c,day){if(!/^[a-zA-Z0-9_-]{1,80}$/.test(c.id)||!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Unsafe drop key');return `drops/${c.id}/${day}.json`;}
export async function currentDrop(c,store,now=Date.now()){
 if(!c.manualDrop)return null;
 const day=dateCT(now);
 if(!c.days.some(d=>d.dateCT===day))return null;
 const d=await store.read(dropKey(c,day));
 return activeDay(c,now,d)?d:null;
}
export async function flipDrop(c,store,now=Date.now()){
 if(!c.manualDrop)throw Error('This contest uses scheduled drops');
 const day=dateCT(now),cfg=c.days.find(d=>d.dateCT===day);
 if(!cfg)return {result:'wrong-day',recorded:false};
 const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',hour:'2-digit',hourCycle:'h23'}).format(new Date(now)));
 if(hour<8||hour>=21)return {result:'outside-daytime',recorded:false};
 const key=dropKey(c,day);
 if(await store.read(key))return {result:'already-live',recorded:false};
 const record={id:randomUUID(),contestId:c.id,dateCT:day,activatedAtUTC:new Date(now).toISOString(),activatedAtCT:timeCT(now),testOnly:!!c.testOnly};
 if(!await store.create(key,record))return {result:'already-live',recorded:false};
 const saved=await store.read(key);
 if(!saved||saved.id!==record.id)throw Error('Drop storage verification failed');
 return {result:'flipped',recorded:true,dateCT:day,activatedAtUTC:saved.activatedAtUTC,activatedAtCT:saved.activatedAtCT,testOnly:saved.testOnly};
}
