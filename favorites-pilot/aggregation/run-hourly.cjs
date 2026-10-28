'use strict';

// Only a scheduled or manually approved main-branch workflow may touch Firestore.
const { writeFavoritesAggregate } = require('./count-favorites.cjs');
const EXPECTED_PROJECT = 'tscms-admin';
const EXPECTED_REPO = 'fudgiepie4-ux/tscms-today';

async function main() {
  if (process.env.GITHUB_REPOSITORY !== EXPECTED_REPO ||
      process.env.GITHUB_REF !== 'refs/heads/main' ||
      !['schedule', 'workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME)) {
    throw new Error('Production aggregate writer is restricted to main-branch scheduled/manual runs.');
  }
  if (!process.env.TSCMS_FAVORITES_SERVICE_ACCOUNT_JSON) {
    throw new Error('Required GitHub secret TSCMS_FAVORITES_SERVICE_ACCOUNT_JSON is missing.');
  }
  let credentials;
  try { credentials = JSON.parse(process.env.TSCMS_FAVORITES_SERVICE_ACCOUNT_JSON); }
  catch { throw new Error('Service account secret is not valid JSON.'); }
  if (credentials?.type !== 'service_account' || credentials.project_id !== EXPECTED_PROJECT ||
      typeof credentials.client_email !== 'string' || typeof credentials.private_key !== 'string') {
    throw new Error('Service account secret is invalid or belongs to the wrong Firebase project.');
  }
  const { initializeApp, cert, deleteApp } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const app = initializeApp({ credential: cert(credentials), projectId: EXPECTED_PROJECT });
  try {
    await writeFavoritesAggregate(getFirestore(app));
    console.log('Favorites aggregate updated successfully.'); // No person-level data or credentials.
  } finally {
    await deleteApp(app);
  }
}

if (require.main === module) {
  main().catch(() => {
    // Do not print SDK errors: they can include account metadata.
    console.error('Favorites aggregate job failed; aggregate not confirmed updated.');
    process.exitCode = 1;
  });
}
module.exports = { main };
