/* TSCMS Admin Phase 1: build ONLY throwaway browser-test files locally.
 * STAGING-ONLY. DO NOT publish to any repo/Pages until Fudgie's NEW explicit GO.
 * Usage (in local Git checkout of feature/firebase-admin-auth-preview-20261019):
 * node tests/prepare-admin-isolated-browser-pack.cjs --fixture /absolute/path/test-fixture-dashboard.json --bundle /absolute/path/admin-data.v2.TEST-DASHBOARD.enc.json
 * Requires the already vetted test/admin-phase1-isolated-firebase-20261020 branch to be available locally.
 * Output: .local-admin-phase1-browser-pack/ (untracked; use ONLY after approval).
 * Never reads, imports, or uploads real admin-data.enc.json or production key.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'.local-admin-phase1-browser-pack');
const requireArg=name=>{
  const i=process.argv.indexOf(name);
  if(i<0||!process.argv[i+1])throw Error('Missing '+name+' (synthetic test material only)');
  return path.resolve(process.argv[i+1]);
};
function readStaging(filename){return fs.readFileSync(path.join(root,filename),'utf8')}
function one(text,from,to,label){
  assert.equal(text.split(from).length-1,1, 'Expected one '+label);
  return text.replace(from,to);
}
function branchCheck(){
  const name=execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim();
  assert.equal(name,'feature/firebase-admin-auth-preview-20261019',
    'STOP: use the Admin Phase 1 staging branch, not main or release');
}
function v1Encrypt(synthetic,pin){
  const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12);
  const iterations=210000;
  const key=crypto.pbkdf2Sync(Buffer.from(pin,'utf8'),salt,iterations,32,'sha256');
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  const bytes=Buffer.from(JSON.stringify(synthetic),'utf8');
  const ciphertext=Buffer.concat([cipher.update(bytes),cipher.final(),cipher.getAuthTag()]);
  return JSON.stringify({salt:salt.toString('base64'),iv:iv.toString('base64'),
    iter:iterations,ct:ciphertext.toString('base64')});
}
function write(name,bytes){fs.writeFileSync(path.join(output,name),bytes,{mode:0o600})}
function main(){
 branchCheck();
 const fixturePath=requireArg('--fixture'),bundlePath=requireArg('--bundle');
 const fixtureBuffer=fs.readFileSync(fixturePath),bundleBuffer=fs.readFileSync(bundlePath);
 const sha=input=>crypto.createHash('sha256').update(input).digest('hex');
 assert.equal(sha(fixtureBuffer),'a37aa97ff7b757eb16798fd143f78472679b88d3291d9035affd1d0d6898e0b2',
    'Unknown synthetic dashboard plaintext fixture');
 assert.equal(sha(bundleBuffer),'f25b838aea79aeba2aedfb5c78245e1df5f5c90f7df00426a5edeb97152ac6d6',
    'Unknown synthetic dashboard v2 ciphertext bundle');
 const fixture=JSON.parse(fixtureBuffer);
 assert.equal(fixture.danger.length,5,'Only the 5-member fictional fixture is approved');
 assert.equal(fixture.flags.length,2,'Only the 2-flag fictional fixture is approved');
 for(const entry of fixture.danger)assert(String(entry.author).startsWith('TEST MEMBER '),'Unexpected real member record');
 const envelope=JSON.parse(bundleBuffer);
 assert.equal(envelope.formatVersion,2);assert.equal(envelope.kid,'v2');
 // Only copy the public synthetic ciphertext. TEST raw v2 key must stay
 // exclusively in the role-protected TEST Firebase project's /vault/keys.
 const testConfig=execFileSync('git',
   ['show','test/admin-phase1-isolated-firebase-20261020:firebase-admin-config.js'],
   {cwd:root,encoding:'utf8'});
 assert.match(testConfig,/projectId"\s*:\s*"tscms-admin-login-test"/,
   'Test config does not target isolated Firebase project');
 assert(!testConfig.includes('"tscms-admin"'),'Production Firebase project forbidden');
 let dual=readStaging('tscms-admin-dual.js');
 dual=one(dual,'const app=initializeApp(tscmsFirebaseConfig),auth=getAuth(app),db=getFirestore(app);',
   'if(tscmsFirebaseConfig.projectId!=="tscms-admin-login-test")throw new Error("TEST ONLY: refused production project");\n'+
   'const app=initializeApp(tscmsFirebaseConfig),auth=getAuth(app),db=getFirestore(app);',
   'Firebase initialization guard');
 // The normal Admin script remains the actual staging source except the
 // additional fail-closed project guard. No private data/key is baked in.
 let html=readStaging('admin.html');
 html=one(html,
   '<script data-goatcounter="https://fudgiepielabsai.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>',
   '', 'remove analytics');
 html=one(html,'<script src="tscms-feedback.js" defer></script>','', 'remove unrelated feedback script');
 html=html.replace(/<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*>/g,'');
 html=html.replace(/<meta property="og:(?:url|image)"[^>]*>/g,'');
 html=html.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/g,'');
 html=html.replace(/<link href="https:\/\/fonts\.googleapis\.com[^"]+" rel="stylesheet">/g,'');
 html=html.replace(/<script>fetch\('admin-banner\.jpg'\)[\s\S]*?<\/script>/,'');
 html=html.replace(/src="public-assets\/TSCMS%20Studio%20Intro%20v3%20Final\.mp4"/g,'');
 html=one(html,'<body>','<body><div role="alert" style="position:relative;z-index:99999;background:#4a1b08;color:#fff4de;padding:15px;text-align:center;font:700 16px system-ui">TEST ONLY — fictional Admin records; not the live TSCMS Admin site; PIN simulation uses a throwaway test-only value.</div>', 'test warning');
 html=one(html,'<!DOCTYPE html><html lang="en"><head>',
  '<!DOCTYPE html><html lang="en"><head><meta name="robots" content="noindex,nofollow">','test noindex');
 // Ensure no third-party analytics, real private data, or accidental outbound
 // asset dependencies survive the transformation.
 assert(!/gc\.zgo\.at|goatcounter|tscms-feedback\.js|admin-banner\.jpg|public-assets\//.test(html),
   'Unapproved linked asset remained in sanitized Admin HTML');
 const scripts=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m=>m[1].split('?')[0]).sort();
 assert.deepEqual(scripts,['mc.js','tscms-admin-dual.js'],
   'Only the legacy PIN and dual-mode modules may run');
 assert(dual.includes('tscms-admin-login-test'),'Staging module not guarded for TEST project');
 let mc=readStaging('mc.js');
 assert(mc.includes('async function unlockAdmin()'),'Original PIN decrypt function not found');
 // Disable external intro-video requests in the isolated, PUBLIC test preview.
 // The PIN decrypt function itself remains unchanged.
 assert.equal((mc.match(/var SIGNON_URL='https:[^']*';/g)||[]).length,1,
  'Unexpected sign-on URL: audit media dependencies before test hosting');
 mc=mc.replace(/var SIGNON_URL='https:[^']*';/, "var SIGNON_URL='about:blank';");
 const css=readStaging('mc.css');
 const fakePin='SYNTHETIC_PIN_FOR_ADMIN_QA_20261020'; // NOT a real station PIN.
 // Remove any prior generated pack first; never use it as a Git source tree.
 fs.rmSync(output,{recursive:true,force:true});
 fs.mkdirSync(output,{recursive:true,mode:0o700});
 write('admin.html',html);
 write('mc.js',mc);
 write('mc.css',css);
 write('tscms-admin-dual.js',dual);
 write('firebase-admin-config.js',testConfig);
 write('admin-data.enc.json',v1Encrypt(fixture,fakePin));
 write('admin-data.v2.enc.json',bundleBuffer);
 write('robots.txt','User-agent: *\nDisallow: /\n');
 write('index.html','<!doctype html><meta name="robots" content="noindex,nofollow"><h1>ISOLATED ADMIN TEST ONLY</h1><p>Do not use with real credentials, station PIN, or member data.</p>');
 if(Number.isNaN(Date.parse(fixture.generated))){
  console.log('KNOWN TEST FIXTURE LIMITATION: annotated generated field is not a valid ISO timestamp; snapshot time may render Invalid Date.');
  console.log('Do not count date formatting PASS unless Cherish issues a new clean ISO synthetic fixture/bundle.');
 }
 console.log('Prepared 9 synthetic-only files in .local-admin-phase1-browser-pack (NOT uploaded).');
 console.log('Firebase isolated project: tscms-admin-login-test. Fake PIN is test-only.');
 console.log('To examine the fake PIN string, read source before running. Never type real station PIN in public test site.');
 console.log('This is NOT a completed real-browser test and NOT permission to publish.');
}
main();
