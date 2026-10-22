'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const terms=fs.readFileSync('drive-in-terms.html','utf8');
const videos=fs.readFileSync('videos.html','utf8');
const cases=[
  ['Date/version header visible',()=>assert.ok(terms.includes('Version 1 · October 22, 2026'))],
  ['Selectable real-text shell',()=>assert.ok(terms.includes('<main class="terms-shell">')&&!terms.includes('<img'))],
  ['Readable 18px screen paragraph text',()=>assert.ok(terms.includes('font:18px/1.43'))],
  ['High contrast print styles',()=>assert.ok(terms.includes('@media print')&&terms.includes('color:#000!important'))],
  ['Letter size paper setup',()=>assert.ok(terms.includes('@page{size:letter;'))],
  ['No nav clutter when printed',()=>assert.ok(terms.includes('.actions{display:none!important}'))],
  ['Accessible terms article',()=>assert.ok(terms.includes('aria-label="Approved Drive-In submission terms"'))],
  ['Exact-source missing gate is visible',()=>assert.ok(terms.includes('id="missing-approved-terms" role="status"'))],
  ['Approved copy not silently substituted',()=>assert.ok(terms.includes('id="approved-terms-copy" hidden'))],
  ['Print disabled until reviewed',()=>assert.ok(terms.includes('<button type="button" disabled'))],
  ['Original source name captured',()=>assert.ok(terms.includes('TSCMS_DriveIn_Printable_Terms_DRAFT_20261022.md'))],
  ['Link positioned beside submission steps',()=>{const p=videos.indexOf('drivein-submission-terms-link');const q=videos.indexOf('<div class="steps">',p);assert.ok(p>=0&&q>p&&q-p<300)}],
  ['Link not yet exposed to members',()=>assert.ok(videos.includes('id="drivein-submission-terms-link" hidden'))],
  ['No accidental approval/consent claims',()=>assert.ok(!terms.includes('I agree to the following'))]
];
for(const [name,fn] of cases){try{fn();}catch(e){console.error(name);throw e;}}
console.log('TSCMS Drive-In terms staging preflight: '+cases.length+'/'+cases.length+' PASS; exact-source publication gate still OPEN.');
