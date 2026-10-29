'use strict';

// Privileged server-side only: never return member identities or favorite records.
// Do not expose this module to the public website.
async function computeFavoritesAggregate(db, at = new Date()) {
  const approved = await db.collection('users').where('status', '==', 'approved').get();
  let totalHearts = 0;
  let activeMembers = 0;
  for (const member of approved.docs) {
    const profile = member.data();
    // Verify in code too, even though the Firestore query filters status.
    if (profile?.status !== 'approved' || (profile.admin !== true && profile.owner !== true)) continue;
    // Firestore count() reads indexed counts, not individual song documents.
    const snapshot = await member.ref.collection('favorites').count().get();
    const count = snapshot.data()?.count;
    if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(totalHearts + count)) {
      throw new Error('Invalid Firestore favorites count; aggregate not written.');
    }
    totalHearts += count;
    if (count > 0) activeMembers += 1;
  }
  const countedAt = at instanceof Date ? at.toISOString() : new Date(at).toISOString();
  return { totalHearts, activeMembers, countedAt };
}

async function writeFavoritesAggregate(db, at = new Date()) {
  const totals = await computeFavoritesAggregate(db, at);
  // Exactly one write, to the known aggregate document; never per-person data.
  await db.doc('pilotAggregates/favorites').set(totals);
  return totals;
}

module.exports = { computeFavoritesAggregate, writeFavoritesAggregate };
