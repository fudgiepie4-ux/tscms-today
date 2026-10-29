'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { writeFavoritesAggregate } = require('../favorites-pilot/aggregation/count-favorites.cjs');

function fakeDb(profiles) {
  const writes = [];
  let countCalls = 0;
  const docs = profiles.map(([profile, count]) => ({
    data: () => profile,
    ref: { collection(name) {
      assert.equal(name, 'favorites');
      return { count() { return { async get() {
        countCalls++;
        if (count instanceof Error) throw count;
        return { data: () => ({ count }) };
      } }; } };
    } }
  }));
  const db = {
    collection(name) {
      assert.equal(name, 'users');
      return { where(field, op, val) {
        assert.deepEqual([field, op, val], ['status', '==', 'approved']);
        return { async get() { return { docs }; } };
      } };
    },
    doc(path) {
      assert.equal(path, 'pilotAggregates/favorites');
      return { async set(data) { writes.push(data); } };
    }
  };
  return { db, writes, calls: () => countCalls };
}

async function test() {
  let m = fakeDb([
    [{ status: 'approved', admin: true, owner: false }, 3],
    [{ status: 'approved', owner: true, admin: false }, 2],
    [{ status: 'approved', admin: true }, 0],
    [{ status: 'pending', admin: true }, 99],
    [{ status: 'approved', admin: false, owner: false }, 99],
    [{ status: 'revoked', owner: true }, 99]
  ]);
  const expected = { totalHearts: 5, activeMembers: 2, countedAt: '2026-10-28T18:00:00.000Z' };
  assert.deepEqual(await writeFavoritesAggregate(m.db, new Date(expected.countedAt)), expected);
  assert.deepEqual(m.writes, [expected], 'Exactly one aggregate write, no member details');
  assert.equal(m.calls(), 3, 'Only approved admin/owner members counted');
  console.log('PASS approved team-only totals and exact one-document write');

  m = fakeDb([[{ status: 'approved', admin: true }, 0]]);
  assert.deepEqual((await writeFavoritesAggregate(m.db)).totalHearts, 0);
  assert.equal(m.writes[0].activeMembers, 0);
  console.log('PASS zero favorites');

  for (const badCount of [-1, 1.5, NaN, '4', Number.MAX_SAFE_INTEGER + 1, new Error('test failure')]) {
    m = fakeDb([[{ status: 'approved', owner: true }, badCount]]);
    await assert.rejects(() => writeFavoritesAggregate(m.db));
    assert.equal(m.writes.length, 0, 'Never publish partial/invalid totals');
  }
  console.log('PASS bad counts and errors do not overwrite last valid aggregate');

  const owner = fs.readFileSync('tscms-favorites-owner.js', 'utf8');
  const start = owner.indexOf('function isValidAggregate(');
  const end = owner.indexOf('function render(', start);
  assert.ok(start > 0 && end > start, 'Validation routine exists');
  const ctx = {};
  vm.runInNewContext(owner.slice(start, end) + '\nthis.validate = isValidAggregate;', ctx);
  assert.equal(ctx.validate(expected), true);
  for (const invalid of [null, {}, { ...expected, countedAt: 'not a date' },
    { ...expected, totalHearts: -1 }, { ...expected, totalHearts: '5' },
    { ...expected, activeMembers: 10 }, { ...expected, activeMembers: 1.1 }]) {
    assert.equal(ctx.validate(invalid), false);
  }
  assert.match(owner, /getDocFromServer\(doc\(db,'pilotAggregates','favorites'\)\)/);
  assert.doesNotMatch(owner, /httpsCallable|getFunctions|totals unavailable|render\(null\)/i);
  assert.match(owner, /if\(!isValidAggregate\(totals\)\)return;/);
  console.log('PASS owner only reads aggregate; invalid/missing state hides banner');

  const workflow = fs.readFileSync('.github/workflows/tscms-favorites-owner-hourly.yml', 'utf8');
  assert.match(workflow, /cron: '17 \* \* \* \*'/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /secrets\.TSCMS_FAVORITES_SERVICE_ACCOUNT_JSON/);
  assert.doesNotMatch(workflow, /pull_request_target|firebase deploy|functions:deploy|Blaze/i);
  console.log('PASS schedule/main-only, secret-based Spark action; no Functions deployment');
  console.log('Favorites owner aggregate staging tests PASS. Live credentials and real Firestore NOT tested.');
}
test().catch(err => { console.error(err); process.exitCode = 1; });
