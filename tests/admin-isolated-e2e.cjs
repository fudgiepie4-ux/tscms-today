/* TSCMS Admin Phase 1 — isolated test-project E2E driver.
   Local-only, interactive, no production changes. Not a test of the legacy PIN.
   npm i --no-save playwright
   TSCMS_TEST_APPLICANT_EMAIL=... TSCMS_TEST_APPLICANT_PASSWORD=... node tests/admin-isolated-e2e.cjs
   No credentials, Firebase tokens, or member records are persisted/logged by this runner.
*/
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const readline = require('node:readline/promises');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const approvedBranch = 'test/admin-phase1-isolated-firebase-20261020';
const project = 'tscms-admin-login-test';
const email = process.env.TSCMS_TEST_APPLICANT_EMAIL || '';
const password = process.env.TSCMS_TEST_APPLICANT_PASSWORD || '';
const fullName = 'TEST ACCOUNT ONLY';
const username = 'testqa_' + Date.now().toString(36);

function assertTestOnly() {
  let branch;
  try { branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(); }
  catch { throw new Error('Refusing to run: cannot confirm Git checkout branch'); }
  assert.equal(branch, approvedBranch, 'Refusing to run on non-test Git branch');
  const config = fs.readFileSync(path.join(root, 'firebase-admin-config.js'), 'utf8');
  assert.match(config, /"projectId"\s*:\s*"tscms-admin-login-test"/, 'Refusing to run outside isolated project');
  assert.match(config, /tscmsFirebaseConfig\.projectId !== "tscms-admin-login-test"/);
  for (const filename of ['admin-phase1-isolated-e2e.html', 'admin-firebase-login-staging.html', 'tscms-admin-dual.js']) {
    assert(fs.existsSync(path.join(root, filename)), 'Missing ' + filename);
  }
  assert.match(email, /^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Set a CONTROLLED test applicant email');
  assert(password.length >= 12, 'Set a unique test password of at least 12 characters');
  assert.notEqual(email.toLowerCase(), 'testowner.tscms@example.com', 'Applicant must be separate from Owner');
  assert(!email.endsWith('@example.com'), 'Applicant email must be deliverable');
}

function localServer() {
  const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
    '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
    '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp' };
  const server = http.createServer((req, res) => {
    let relative;
    try { relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, ''); }
    catch { res.writeHead(400).end(); return; }
    const target = path.resolve(root, relative || 'admin-phase1-isolated-e2e.html');
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
      res.writeHead(404).end(); return;
    }
    // No production encrypted data or hidden folders are ever served by this test server.
    if (/(?:^|\/)(?:\.git|\.env|vault|admin-data(?:\.v2)?(?:\.enc)?\.json)(?:\/|$)/i.test(relative)) {
      res.writeHead(403).end(); return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
    fs.createReadStream(target).pipe(res);
  });
  return server;
}
function failureSanitized(err) {
  // Print failure message only; don't echo URLs, network tokens, or user-entered secrets.
  const message = String(err && err.message || err).split('\n')[0].replaceAll(email, '[test email hidden]');
  return message.slice(0, 350);
}
function steps() {
  let number = 0;
  return title => console.log('[' + (++number) + '] ' + title);
}
async function waitForStatus(page, pattern, ms = 30000) {
  await page.locator('#status').getByText(pattern).waitFor({state:'visible',timeout:ms});
}
async function accountContains(page, required, ms = 30000) {
  await page.waitForFunction(value =>
    [...document.querySelectorAll('#account-summary')].some(el => el.textContent.includes(value)),
    required,{timeout:ms});
}
async function main() {
  assertTestOnly();
  const { chromium } = require('playwright');
  const srv = localServer();
  await new Promise((resolve,reject) => srv.once('error',reject).listen(8765,'127.0.0.1',resolve));
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  const browser = await chromium.launch({ headless: process.env.TSCMS_HEADLESS !== 'false' });
  try {
    const log=steps();
    const context=await browser.newContext({ viewport:{width:390,height:844}, ignoreHTTPSErrors:false });
    const signup=await context.newPage();
    const issues=[];
    signup.on('pageerror', err => issues.push(failureSanitized(err)));
    const base='http://localhost:8765/';
    console.log('ISOLATED PROJECT: ' + project + ' | TEST USERNAME: ' + username);
    console.log('Do not post screenshots containing emails/passwords to Slack or Github.');
    log('Open isolated signup page; assert test-only banner and controls.');
    await signup.goto(base+'admin-phase1-isolated-e2e.html',{waitUntil:'domcontentloaded'});
    await signup.locator('#test-pin-ok').click();
    const form=signup.locator('#tc-upgrade-form');
    await form.waitFor({state:'visible',timeout:15000});
    log('Register pending Firebase account using controlled applicant inbox.');
    await form.locator('[name="fullName"]').fill(fullName);
    await form.locator('[name="username"]').fill(username);
    await form.locator('[name="email"]').fill(email);
    await form.locator('[name="password"]').fill(password);
    await form.locator('[name="confirm"]').fill(password);
    await form.locator('[type="submit"]').click();
    await signup.locator('#tc-upgrade-status').getByText(/Registration saved|Account saved and awaiting approval/).waitFor({timeout:45000});
    console.log('PASS: registration handler reported pending account saved. Confirm atomic /users + /usernames in TEST console.');
    if(issues.length)console.log('CAUTION: browser page errors occurred; inspect locally (count '+issues.length+').');
    const account=await context.newPage();
    await account.goto(base+'admin-firebase-login-staging.html',{waitUntil:'domcontentloaded'});
    const submitLogin=async() => {
      if (await account.locator('#login').isVisible()) {
        await account.locator('#email').fill(email);
        await account.locator('#password').fill(password);
        await account.locator('#login-button').click();
      }
      await account.locator('#account').waitFor({state:'visible',timeout:40000});
      await accountContains(account,'Admin approved: NO');
    };
    log('Check that an unverified/pending applicant cannot access Admin.');
    await submitLogin();
    await accountContains(account,'Email verified: NO');
    await accountContains(account,'Account status: pending');
    console.log('PASS: pending + unverified denied Admin access.');
    await prompt.question('CHERISH: Click verification email in controlled test inbox, then press Enter here. ');
    await account.locator('#refresh').click();
    await accountContains(account,'Email verified: YES');
    await accountContains(account,'Account status: pending');
    await accountContains(account,'Admin approved: NO');
    console.log('PASS: verified but pending still denied Admin access.');
    log('Cherish now approves TEST applicant via isolated Owner console.');
    console.log('TEST USERNAME: ' + username + ' (find in test Firestore /users; do not use production console).');
    await prompt.question('CHERISH: Set TEST applicant to approved/admin:true in isolated project, then press Enter. ');
    await account.locator('#refresh').click();
    await accountContains(account,'Account status: approved');
    await accountContains(account,'Admin approved: YES');
    await waitForStatus(account,/Approved Admin login verified/);
    console.log('PASS: approved + verified personal login; Admin role accepted.');
    log('Revoke TEST applicant and verify access is denied on refresh.');
    await prompt.question('CHERISH: Revoke TEST applicant (status revoked/admin false), then press Enter. ');
    await account.locator('#refresh').click();
    await accountContains(account,'Account status: revoked');
    await accountContains(account,'Admin approved: NO');
    console.log('PASS: revoked applicant denied Admin access.');
    log('Sign out and verify private account view is removed.');
    await account.locator('#logout').click();
    await account.locator('#login').waitFor({state:'visible',timeout:25000});
    assert(await account.locator('#account').isHidden(), 'Private account summary still visible after signout');
    console.log('PASS: signout hides account data in isolated review page.');
    console.log('RESULT: applicant-side registration / verification / approval / revoke sequence PASSED in isolated project.');
    console.log('NOT TESTED: legacy PIN validity, v2 vault/dashboard decryption, production Firebase, Nov 1 cutoff.');
    console.log('CLEANUP REQUIRED: Cherish must delete applicant Auth account + /users and /usernames TEST records.');
  }finally{
    await browser.close();
    prompt.close();
    await new Promise(resolve => srv.close(resolve));
  }
}
main().catch(err=>{ console.error('FAIL / NOT COMPLETE: '+failureSanitized(err));process.exitCode=1; });
