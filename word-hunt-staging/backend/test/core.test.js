import test from 'node:test';import assert from 'node:assert/strict';
import {check,status,dateCT,nextMidnight,timeCT,validateConfig} from '../lib/core.js';
const c={id:'test',testOnly:true,rosterConfirmed:true,adminNames:['Test Admin'],adminEmails:['admin@example.invalid'],days:[26,27,28,29].map(n=>({dateCT:`2026-10-${n}`,dropAtUTC:`2026-10-${n}T16:00:00.000Z`,answer:'Lantern',riddle:'test clue'}))};
const now=Date.parse(c.days[0].dropAtUTC),body={word:'  LaNtErN  ',name:'Test Entrant',email:'one@example.invalid',contestDateCT:'2026-10-26',clientSubmittedAtUTC:'1900-01-01T00:00:00Z'};
function memory(){const values=new Map();return {values,async create(k,v){if(values.has(k))return false;values.set(k,structuredClone(v));return true;},async read(k){return values.get(k);}};}
test('four distinct CT days and confirmed admin roster required',()=>{validateConfig(c);assert.throws(()=>validateConfig({...c,rosterConfirmed:false}));assert.throws(()=>validateConfig({...c,days:c.days.slice(1)}));});
test('dark before drop, lit at drop; no secret data',()=>{assert.equal(status(c,now-1).state,'not-yet');assert.deepEqual(status(c,now),{state:'live',contestDateCT:'2026-10-26',riddle:'test clue'});assert.equal(status(c,Date.parse('2026-10-30T05:00:00Z')).state,'complete');});
test('case/space normalization, verified server time, 1+5 chances and readback',async()=>{const s=memory(),r=await check(c,body,s,now+123);assert.equal(r.totalEntries,6);assert.equal(r.acceptedAtCT,'2026-10-26T11:00:00.123-05:00');assert.equal(s.values.size,1);assert.equal([...s.values.values()][0].word,'lantern');assert.equal(r.acceptedAtUTC,'2026-10-26T16:00:00.123Z');});
test('wrong guesses store no entries and allow a correct retry',async()=>{const s=memory();assert.equal((await check(c,{...body,word:'wrong'},s,now)).result,'incorrect');assert.equal(s.values.size,0);assert.equal((await check(c,body,s,now)).result,'correct');});
test('one-hour exclusive boundary: 59:59.999 has bonus, 60:00 does not',async()=>{assert.equal((await check(c,body,memory(),now+3599999)).bonusEntries,5);assert.equal((await check(c,body,memory(),now+3600000)).totalEntries,1);});
test('midnight exclusive; stale day rejected even when next day live',async()=>{const midnight=Date.parse('2026-10-27T05:00:00Z');assert.equal((await check(c,body,memory(),midnight-1)).result,'correct');assert.equal((await check(c,body,memory(),midnight)).result,'closed');assert.equal((await check(c,body,memory(),now+86400000)).result,'closed');});
test('admin email OR name blocks all chances without writing',async()=>{const s=memory();for(const b of [{...body,email:' ADMIN@example.invalid '},{...body,name:' test  ADMIN '}])assert.equal((await check(c,b,s,now)).result,'ineligible');assert.equal(s.values.size,0);});
test('concurrent duplicate requests create exactly one record',async()=>{const s=memory(),r=await Promise.all(Array.from({length:20},()=>check(c,body,s,now)));assert.equal(r.filter(x=>x.recorded).length,1);assert.equal(r.filter(x=>x.result==='duplicate').length,19);assert.equal(s.values.size,1);});
test('storage write/read failures never claim success',async()=>{await assert.rejects(check(c,body,{create:async()=>{throw Error('offline');}},now));await assert.rejects(check(c,body,{create:async()=>true,read:async()=>null},now));});
test('test environment rejects real contact details',async()=>{assert.equal((await check(c,{...body,email:'person@example.com'},memory(),now)).result,'test-only');});
test('DST spring and fall midnight boundaries use Chicago dates',()=>{assert.equal(new Date(nextMidnight(Date.parse('2026-03-08T06:00:00Z'))).toISOString(),'2026-03-09T05:00:00.000Z');assert.equal(new Date(nextMidnight(Date.parse('2026-11-01T05:00:00Z'))).toISOString(),'2026-11-02T06:00:00.000Z');assert.equal(dateCT(Date.parse('2026-11-02T05:59:59Z')),'2026-11-01');assert.equal(timeCT(Date.parse('2026-11-02T06:00:00Z')),'2026-11-02T00:00:00.000-06:00');});

import {filterEntriesForDrawing} from '../lib/exclusions.js';
const fakeRoster=Array.from({length:16},(_,i)=>`Test Excluded ${String(i+1).padStart(2,'0')}`);
for(const name of fakeRoster){
 test('private configuration exclusion: '+name+' is independent of signup',async()=>{
  let writes=0;const store={async create(){writes++;throw Error('Excluded name must not be stored');}};
  const privateConfig={...c,adminNames:fakeRoster};
  for(const login of [true,false])for(const variant of [name,'  '+name.toUpperCase().replaceAll(' ','   ')+'  ']){
   const r=await check(privateConfig,{...body,name:variant,personalLogin:login},store,now);
   assert.deepEqual(r,{result:'ineligible',recorded:false,baseEntries:0,bonusEntries:0,totalEntries:0});
  }assert.equal(writes,0);
 });
}
test('drawing filter requires private roster and removes matching names/test rows',()=>{
 const rows=fakeRoster.map(name=>({name,email:'unknown@example.invalid',totalEntries:6}));
 rows.push({name:'Eligible Member',email:'member@example.invalid',totalEntries:1});
 rows.push({name:'Dummy Test',email:'test@example.invalid',testOnly:true,totalEntries:6});
 assert.throws(()=>filterEntriesForDrawing(rows));
 assert.deepEqual(filterEntriesForDrawing(rows,{...c,adminNames:fakeRoster}).map(e=>e.name),['Eligible Member']);
});
test('real mode requires Oct 27-30 and all 16 private names',()=>{
 const real={...c,testOnly:false,manualDrop:true,adminNames:fakeRoster,days:[27,28,29,30].map(n=>({dateCT:`2026-10-${n}`,answer:'fictional-word',riddle:'fictional hint',target:{path:`/trial-${n}.html`,marker:`mark-${n}`,word:'synthetic'}}))};
 assert.doesNotThrow(()=>validateConfig(real));
 assert.throws(()=>validateConfig({...real,adminNames:fakeRoster.slice(0,8)}));
 assert.throws(()=>validateConfig({...real,days:c.days}));
});

import {flipDrop,currentDrop} from '../lib/drop.js';
test('manual flip drives glass, paw target, bonus and midnight cutoff without a daily page push',async()=>{
 const d='2026-10-27',start=Date.parse('2026-10-27T14:00:00Z');
 const c2={...c,id:'simulated-flip',manualDrop:true,days:[27,28,29,30].map(n=>({dateCT:`2026-10-${n}`,answer:'lantern',riddle:'test',target:{path:'/paw-demo.html',marker:'test-lantern'}}))};
 const s=memory();
 assert.equal(status(c2,start).state,'not-yet');
 const flipped=await flipDrop(c2,s,start);
 assert.equal(flipped.result,'flipped');
 const rec=await currentDrop(c2,s,start+1000);
 assert.equal(status(c2,start+1000,rec).state,'live');
 assert.equal((await check(c2,{...body,contestDateCT:d},s,start+5000,rec)).totalEntries,6);
 assert.equal((await flipDrop(c2,s,start+6000)).result,'already-live');
 const lastMs=Date.parse('2026-10-28T04:59:59.999Z');
 assert.equal(status(c2,lastMs,await currentDrop(c2,s,lastMs)).state,'live');
 const midnight=Date.parse('2026-10-28T05:00:00Z');
 assert.equal(await currentDrop(c2,s,midnight),null);
 assert.equal(status(c2,midnight).state,'not-yet');
 assert.equal((await check(c2,{...body,contestDateCT:d},s,midnight,null)).result,'closed');
});
test('manual drop refuses a day not configured and outside daytime Central',async()=>{
 const c2={...c,id:'simulated-restrictions',manualDrop:true};
 assert.equal((await flipDrop(c2,memory(),Date.parse('2026-10-27T05:10:00Z'))).result,'outside-daytime');
 assert.equal((await flipDrop(c2,memory(),Date.parse('2026-11-01T15:00:00Z'))).result,'wrong-day');
});
test('private target config validation blocks invalid selectors',()=>{
 const d=[27,28,29,30].map(n=>({dateCT:`2026-10-${n}`,answer:'fake',riddle:'fake',target:{path:'/test.html',marker:'safe'}}));
 const c2={...c,manualDrop:true,testOnly:true,days:d};
 assert.doesNotThrow(()=>validateConfig(c2));
 assert.throws(()=>validateConfig({...c2,days:d.map(x=>({...x,target:{path:'https://elsewhere.test',marker:'safe'}}))}));
});
