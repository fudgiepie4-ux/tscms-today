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

import {EXCLUDED_NAMES,filterEntriesForDrawing} from '../lib/exclusions.js';
for(const name of EXCLUDED_NAMES){
 test('mandatory exclusion: '+name+' regardless of signup or smaller config roster',async()=>{
  let writes=0;const s={async create(){writes++;throw Error('Excluded name must not be stored');}};
  for(const personalLogin of [true,false])for(const variant of [name,'  '+name.toUpperCase().replaceAll(' ','   ')+'  ',name.normalize('NFD').replace(/\p{M}/gu,'').replaceAll('-',' ')]){
   const r=await check({...c,adminNames:[]},{...body,name:variant,personalLogin},s,now);
   assert.deepEqual(r,{result:'ineligible',recorded:false,baseEntries:0,bonusEntries:0,totalEntries:0});
  }assert.equal(writes,0);
 });
}
test('drawing filter excludes all 16 even from old rows; test rows excluded',()=>{
 const rows=EXCLUDED_NAMES.map(name=>({name,email:'unknown@example.invalid',totalEntries:6}));
 rows.push({name:'Eligible Member',email:'member@example.invalid',totalEntries:1});
 rows.push({name:'Dummy Test',email:'test@example.invalid',testOnly:true,totalEntries:6});
 assert.deepEqual(filterEntriesForDrawing(rows).map(e=>e.name),['Eligible Member']);
});
