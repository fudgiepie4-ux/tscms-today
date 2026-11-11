/* Read-only staging regression checks for the isolated TSCMS promo calendar.
   No Firebase access, no production changes. Simulates a fresh generator output
   with NO promo tags baked into index.html. */
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const index=read('index.html'),admin=read('admin.html');
const quick=read('tscms-quick-jump.js'),dual=read('tscms-admin-dual.js');
const bootstrap=read('tscms-promo-bootstrap.js');
const publicJs=read('tscms-promo-calendar.js'),adminJs=read('tscms-promo-admin.js');
const css=read('tscms-promo-calendar.css');
const count=(haystack,needle)=>haystack.split(needle).length-1;
for(const [path,source] of Object.entries({
  'tscms-promo-bootstrap.js':bootstrap,
  'tscms-promo-calendar.js':publicJs,
  'tscms-promo-admin.js':adminJs,
  'tscms-quick-jump.js':quick,
  'tscms-admin-dual.js':dual
})){
  const check=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});
  assert.equal(check.status,0,path+' syntax failure: '+(check.stderr||check.error));
}
console.log('PASS — Bootstrap, calendar, uploader, Quick Jump and admin scripts parse.');

function fakeDocument(isHome){
  const nodes=[];
  const document={
    readyState:'complete',
    head:{appendChild(node){nodes.push(node);return node;}},
    createElement(tag){
      return {tagName:tag,attributes:{},
        setAttribute(name,value){this.attributes[name]=value;},
        getAttribute(name){return this.attributes[name]??null;}};
    },
    querySelector(selector){
      if(selector==='.wrap .feat')return isHome?{className:'feat'}:null;
      const match=/^(script|link)\[data-tscms-preserved="([^"]+)"\]$/.exec(selector);
      if(!match)return null;
      return nodes.find(n=>n.tagName===match[1]&&n.attributes['data-tscms-preserved']===match[2])||null;
    }
  };
  return {document,nodes};
}
function runIsolatedProtectedQuickJumpPromoBoot(doc){
  const marker='/* TSCMS Coming Up: protected generator-survival bootloader.';
  assert.equal(count(quick,marker),1,'protected module must contain exactly one promo boot block');
  runInNewContext(quick.slice(quick.indexOf(marker)),{document:doc,console});
}
const {document,nodes}=fakeDocument(true);
assert.match(index,/src="tscms-quick-jump\.js\?v=/,'generator must retain protected Quick Jump');
assert.equal(count(index,'tscms-promo-bootstrap.js'),0,'index should not bake in promo bootstrap');
assert.equal(count(index,'tscms-promo-calendar.js'),0,'index should not bake in promo module');
assert.equal(count(index,'tscms-promo-calendar.css'),0,'index should not bake in promo CSS');
runIsolatedProtectedQuickJumpPromoBoot(document);
runIsolatedProtectedQuickJumpPromoBoot(document);
assert.equal(nodes.length,1,'generator-preserved Quick Jump should load bootstrap exactly once');
assert.match(nodes[0].src,/tscms-promo-bootstrap\.js\?v=/);
runInNewContext(bootstrap,{document,console});
runInNewContext(bootstrap,{document,console});
assert.equal(nodes.length,3,'bootstrap must create exactly one CSS + one JS module');
assert.equal(nodes.filter(n=>n.attributes['data-tscms-preserved']==='promo-calendar-style').length,1);
assert.equal(nodes.filter(n=>n.attributes['data-tscms-preserved']==='promo-calendar-module').length,1);
assert.equal(nodes.find(n=>n.tagName==='script'&&n.type==='module').src,'./tscms-promo-calendar.js?v=20261111');
assert.equal(nodes.find(n=>n.tagName==='link').href,'./tscms-promo-calendar.css?v=20261111');
console.log('PASS — A fresh generator-style homepage with no promo refs still mounts promo JS/CSS once.');

const other=fakeDocument(false);
runIsolatedProtectedQuickJumpPromoBoot(other.document);
runInNewContext(bootstrap,{document:other.document,console});
assert.equal(other.nodes.length,0,'loader must not run on non-homepage pages');
console.log('PASS — Other pages stay untouched.');

assert.equal(count(admin,'tscms-promo-admin.js'),0,'generated admin.html should not embed duplicate uploader');
assert.match(admin,/src="tscms-admin-dual\.js\?v=/,'generator must preserve authenticated admin module');
assert.equal(count(dual,"import('./tscms-promo-admin.js')"),1,'authenticated admin module must load uploader exactly once');
assert.match(adminJs,/getDocFromServer\(doc\(db,'promoEditors',user\.uid\)\)/,'explicit editor UID lookup required');
assert.match(adminJs,/if\(p\.owner===true\)return true/,'owner route required');
assert.match(adminJs,/await uploadBytes\(imageRef,selected/,'Firebase upload required');
assert.match(adminJs,/await setDoc\(record,\{title:name/,'Firestore publish required');
assert.match(publicJs,/onSnapshot\(q,snapshot=>/,'realtime public source required');
assert.match(publicJs,/featured\.insertAdjacentElement\('afterend',section\)/,'Song of Week placement required');
assert.match(publicJs,/getDownloadURL\(ref\(storage,promo\.imagePath\)\)/,'promo image required');
assert(!/new Audio\s*\(|\.pause\s*\(|\.volume\s*=|\.muted\s*=/.test(publicJs+bootstrap),
  'Public promo files must not change audio playback');
assert(css.includes('.tscms-coming-up'),'Promo CSS must be scoped');
console.log('PASS — Uploader retains Firebase approval gate; public calendar remains image-only.');
console.log('PASS — Coming Up generator survival preflight (staging only).');
