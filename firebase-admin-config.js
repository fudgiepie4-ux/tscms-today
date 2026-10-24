/* ISOLATED TEST ONLY — NO PRODUCTION RELEASE. Fudgie approved a throwaway Firebase test project.
   Firebase web config identifies a public test project; it does NOT grant permissions.
   Do not copy this file to main or the production auth staging branch. */
export const tscmsFirebaseConfig = Object.freeze({
  "apiKey": "AIzaSyDHKa7_wmD6fOiwv9mNKk0hmVXRlNkMJC0",
  "authDomain": "tscms-admin-login-test.firebaseapp.com",
  "projectId": "tscms-admin-login-test",
  "storageBucket": "tscms-admin-login-test.firebasestorage.app",
  "messagingSenderId": "723244835526",
  "appId": "1:723244835526:web:5c0562d7e5d4887b04edc7"
});
if (tscmsFirebaseConfig.projectId !== "tscms-admin-login-test") {
  throw new Error("Test-only Firebase configuration guard failed");
}
