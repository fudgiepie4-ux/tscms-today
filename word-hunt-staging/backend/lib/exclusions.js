// Eligibility loaded ONLY from private server configuration; no real names stored in public source.
export function nameKey(value){return String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('en-US').replace(/[\p{P}\p{Z}\s]+/gu,' ').trim();}
export function isExcluded(name,email='',config={}){
 const n=nameKey(name),e=String(email).trim().toLocaleLowerCase('en-US');
 return (config.adminNames||[]).some(x=>nameKey(x)===n)||(config.adminEmails||[]).some(x=>String(x).trim().toLocaleLowerCase('en-US')===e);
}
export function filterEntriesForDrawing(entries,config){
 if(!config||config.rosterConfirmed!==true||!Array.isArray(config.adminNames)||!Array.isArray(config.adminEmails))throw Error('Private eligibility roster required for drawing');
 return entries.filter(entry=>entry.testOnly!==true&&!isExcluded(entry.name,entry.email,config));
}
