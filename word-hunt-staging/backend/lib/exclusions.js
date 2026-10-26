// Owner-directed mandatory exclusions, 2026-10-26. SERVER ONLY.
// Personal-login signup, approval, and account state never affect this list.
export const EXCLUDED_NAMES=Object.freeze([
 'Rachel Kulesa','Jenna Alexander-Lehman','Zoë Titterton','Victoria Gibson',
 'Stephanie McGlennon','James Kulesa','Mary Workman','Brenda McSweeney',
 'Charles E Easterday','John Coleman','CaseyJane Rattlinggourd','Scott Cagle',
 'Michael Streeter','Rick Mann','Justin Randolph','Kay Hodder'
]);
export function nameKey(value){return String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('en-US').replace(/[\p{P}\p{Z}\s]+/gu,' ').trim();}
const mandatory=new Set(EXCLUDED_NAMES.map(nameKey));
export function isExcluded(name,email='',config={}){
 const key=nameKey(name);
 return mandatory.has(key)||(config.adminNames||[]).some(n=>nameKey(n)===key)||(config.adminEmails||[]).some(e=>String(e).trim().toLocaleLowerCase('en-US')===String(email).trim().toLocaleLowerCase('en-US'));
}
// Apply again before any drawing export, including to previously stored rows.
// This does not perform a draw; Cherish retains verification and drawing ownership.
export function filterEntriesForDrawing(entries,config={}){
 return entries.filter(e=>e.testOnly!==true&&!isExcluded(e.name,e.email,config));
}
