// REPLACE ONLY IN CHERISH'S ISOLATED TEST HOST WITH PUBLIC WEB APP IDENTIFIERS
// FROM FIREBASE PROJECT tscms-admin-login-test. DO NOT COMMIT SECRET KEYS OR PRODUCTION CONFIG.
export const firebaseConfig = Object.freeze({projectId:"tscms-admin-login-test",
  apiKey:"TEST_FIREBASE_CONFIG_REQUIRED",authDomain:"tscms-admin-login-test.firebaseapp.com",
  appId:"TEST_FIREBASE_APP_ID_REQUIRED"});

// For controlled TEST browser QA only. Cherish must explicitly allowlist disposable inboxes.
// Empty = absolutely NO recipient invitation or Auth email will be sent.
export const approvedTestRecipients = Object.freeze([]);
