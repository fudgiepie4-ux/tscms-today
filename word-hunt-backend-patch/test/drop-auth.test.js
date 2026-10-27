import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {authorized} from '../lib/drop-auth.js';

test('independent dummy tokens and fail-closed authorization', () => {
  const first = randomBytes(32).toString('base64url');
  const second = randomBytes(32).toString('base64url');
  const env = {WORD_HUNT_DROP_TOKEN:first, WORD_HUNT_CHERISH_DROP_TOKEN:second};
  const request = token => ({headers:{authorization:`Bearer ${token}`}});
  assert.equal(authorized(request(first), env), true);
  assert.equal(authorized(request(second), env), true);
  assert.equal(authorized(request(second), {WORD_HUNT_CHERISH_DROP_TOKEN:second}), true);
  assert.equal(authorized(request(first), {WORD_HUNT_DROP_TOKEN:first}), true);
  assert.equal(authorized(request(first), {}), false);
  assert.equal(authorized(request(randomBytes(32).toString('base64url')), env), false);
  assert.equal(authorized({headers:{}}, env), false);
  assert.equal(authorized(request('short'), {WORD_HUNT_DROP_TOKEN:'short'}), false);
  assert.equal(authorized(request(second), {WORD_HUNT_CHERISH_DROP_TOKEN:second+'!'}), false);
  assert.equal(authorized(request(second+'\n'), env), false);
});
