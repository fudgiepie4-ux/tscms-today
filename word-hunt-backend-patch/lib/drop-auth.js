import {createHash, timingSafeEqual} from 'node:crypto';

export function authorized(req, env = process.env) {
  const match = /^Bearer ([A-Za-z0-9_-]{40,256})$/.exec(String(req.headers?.authorization || ''));
  if (!match) return false;
  const supplied = createHash('sha256').update(match[1]).digest();
  let accepted = false;
  for (const expected of [env.WORD_HUNT_DROP_TOKEN, env.WORD_HUNT_CHERISH_DROP_TOKEN]) {
    if (typeof expected !== 'string' || !/^[A-Za-z0-9_-]{40,256}$/.test(expected)) continue;
    const matches = timingSafeEqual(supplied, createHash('sha256').update(expected).digest());
    accepted = matches || accepted;
  }
  return accepted;
}
