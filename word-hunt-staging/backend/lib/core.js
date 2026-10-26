import {isExcluded} from './exclusions.js';
import {createHash, randomUUID, timingSafeEqual} from 'node:crypto';
export const zone='America/Chicago';
export const normalize=v=>String(v??'').normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('en-US');
export function dateCT(ms){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));}
export function timeCT(ms){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZoneName:'longOffset'}).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
 return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.${String(ms%1000).padStart(3,'0')}${p.timeZoneName.replace('GMT','')}`;
}
export function nextMidnight(ms){const day=dateCT(ms);let lo=ms,hi=ms+27*3600000;while(hi-lo>1){let mid=Math.floor((lo+hi)/2);if(dateCT(mid)===day)lo=mid;else hi=mid;}return hi;}
export function validateConfig(c){
 if(!c||!c.id||!Array.isArray(c.days)||c.days.length!==4||!Array.isArray(c.adminNames)||!Array.isArray(c.adminEmails)||c.rosterConfirmed!==true)throw Error('Contest configuration incomplete');
 const dates=new Set();let last=-Infinity;
 for(const d of c.days){const ms=Date.parse(d.dropAtUTC);if(!Number.isFinite(ms)||dateCT(ms)!==d.dateCT||dates.has(d.dateCT)||ms<=last||!d.answer||!d.riddle)throw Error('Invalid four-day schedule');dates.add(d.dateCT);last=ms;}
 return c;
}
export function activeDay(c,now){return c.days.find(d=>d.dateCT===dateCT(now)&&now>=Date.parse(d.dropAtUTC));}
export function status(c,now){
 const d=activeDay(c,now);if(d)return {state:'live',contestDateCT:d.dateCT,riddle:d.riddle};
 return {state:now>=nextMidnight(Date.parse(c.days[3].dropAtUTC))?'complete':'not-yet'};
}
export const hash=v=>createHash('sha256').update(v).digest('hex');
export async function check(c,body,store,now=Date.now()){
 const d=activeDay(c,now);if(!d||body.contestDateCT!==d.dateCT)return {result:'closed'};
 if(typeof body.word!=='string'||typeof body.name!=='string'||typeof body.email!=='string'||body.word.length>100||body.name.length>120||body.email.length>254)return {result:'invalid'};
 const word=normalize(body.word),name=body.name.trim().replace(/\s+/gu,' '),email=normalize(body.email);
 if(!word||!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {result:'invalid'};
 if(isExcluded(name,email,c))return {result:'ineligible',recorded:false,baseEntries:0,bonusEntries:0,totalEntries:0};
 if(c.testOnly&&!email.endsWith('@example.invalid'))return {result:'test-only'};

 if(!timingSafeEqual(Buffer.from(hash(word)),Buffer.from(hash(normalize(d.answer)))))return {result:'incorrect'};
 const entry={id:randomUUID(),contestId:c.id,contestDateCT:d.dateCT,word:normalize(d.answer),name,email,acceptedAtUTC:new Date(now).toISOString(),acceptedAtCT:timeCT(now),timeZone:zone,dropAtUTC:d.dropAtUTC,baseEntries:1,bonusEntries:now-Date.parse(d.dropAtUTC)<3600000?5:0,testOnly:!!c.testOnly};
 entry.totalEntries=entry.baseEntries+entry.bonusEntries;
 const key=`entries/${c.id}/${d.dateCT}/${hash(email)}.json`;
 if(!await store.create(key,entry))return {result:'duplicate'};
 // Independent uncached readback: never report success on an unverified write.
 const saved=await store.read(key);if(!saved||saved.id!==entry.id)throw Error('Persistence confirmation failed');
 return {result:'correct',recorded:true,entryId:saved.id,acceptedAtUTC:saved.acceptedAtUTC,acceptedAtCT:saved.acceptedAtCT,baseEntries:saved.baseEntries,bonusEntries:saved.bonusEntries,totalEntries:saved.totalEntries,testOnly:saved.testOnly};
}
