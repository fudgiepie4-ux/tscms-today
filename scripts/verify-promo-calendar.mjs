/* Read-only staging regression checks for the isolated TSCMS promo calendar.
   Uses Node's syntax parser; no Firebase network access or production changes. */
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const index=read('index.html'),admin=read('admin.html');
const publicJs=read('tscms-promo-calendar.js');
const adminJs=read('tscms-promo-admin.js');
const css=read('tscms-promo-calendar.css');
const count=(haystack,needle)=>haystack.split(needle).length-1;
for(const [path,source] of [['tscms-promo-calendar.js',publicJs],['tscms-promo-admin.js',adminJs]]){
  const check=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});
  assert.equal(check.status,0,path+' failed syntax check: '+(check.stderr||check.error));
}
assert.equal(count(index,'src="./tscms-promo-calendar.js'),1,'Homepage promo script must appear exactly once');
assert.equal(count(index,'href="./tscms-promo-calendar.css'),1,'Homepage promo CSS must appear exactly once');
assert.equal(count(admin,'src="./tscms-promo-admin.js'),1,'Admin promo uploader must appear exactly once');
assert(index.includes('class="feat"'),'Song of the Week anchor missing');
assert(publicJs.includes("featured.insertAdjacentElement('afterend',section)"),'Promo placement must follow Song of the Week');
assert(publicJs.includes("onSnapshot(q,snapshot=>"),'Public Firestore listener missing');
assert(publicJs.includes("getDownloadURL(ref(storage,promo.imagePath))"),'Promo image resolver missing');
assert(adminJs.includes("getDocFromServer(doc(db,'promoEditors',user.uid))"),'Named editor UID lookup missing');
assert(adminJs.includes("if(p.owner===true)return true"),'Owner publishing route missing');
assert(adminJs.includes("await uploadBytes(imageRef,selected"),'Image upload missing');
assert(adminJs.includes("await setDoc(record,{title:name"),'Firestore publish missing');
assert(!/new Audio\s*\(|\.pause\s*\(|\.volume\s*=|\.muted\s*=/.test(publicJs),'Public promo code must not change music playback');
assert(css.includes('.tscms-coming-up'),'Promo styling must be scoped');
console.log('PASS — Coming Up scripts parse and isolated homepage/admin bindings are intact.');
