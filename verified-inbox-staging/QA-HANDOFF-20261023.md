# Email verification stamp + Owner inbox — Oct 23, 2026

**TEST/STAGING ONLY. NOT MERGED, NOT DEPLOYED, NOT VERIFIED AGAINST FIREBASE.**
This feature stacks on draft PR #34 so the earlier Owner inbox createdAt ordering and confirmation safety remain intact.

## Member-side stamp
On newly written registration profile, on manual sign-in, and on Firebase page-session restore, the code reloads that account and forces getIdTokenResult(user,true). Only a boolean claims.email_verified is authoritative; if absent the function does nothing. A fresh Firestore read of that same user UID is compared and, only when unequal, an updateDoc changes exactly emailVerified and emailVerifiedAt:serverTimestamp(). A denied write is tolerated with no escalation or local fake status. The existing verified + approved + admin/owner room gate is unmodified.

## Owner inbox
Every pending, approved, revoked or other row reads emailVerified on the user's document:
- true → Verified ✓
- false → Not verified
- missing/invalid → No sign-in since update

No Auth user list or privilege-changing client query. The Owner view never pretends it has current Firebase Auth state when the user has not performed a post-update sign-in.

## Security/QA dependencies
**Do not open this branch directly against production firebase-admin-config.js.** The branch inherits the existing production Firebase config from PR #34; review source only. In a separate test-only deploy, replace config with the isolated `tscms-admin-login-test` project, enforce a pre-initialization projectId guard, use disposable Auth users and Cherish's deployed *TEST* rules with an exactly-two-field self-write rule. Do not publish production rules or register actual team accounts as a test.

Cherish owns rules clause and verifies denied-before-rule / enabled-after-rule, unverified and verified claims, absent legacy profile field, no-op unchanged stamp, timestamp server value, self-only UID protection, failed write isolation, registration / login / refresh scenarios, Owner status rendering and underlying approval workflows. Test origin and Fudgie S24 pass follow independent Cherish staged verdict. Production rules must precede any production release of the stamp.

The named `TSCMS_Verified_Status_Inbox_Spec_20261023.md` was referenced but not found in connected Drive, Slack, or Library at build time. Cherish must reconcile this branch line-by-line against that canonical spec before clearing QA.

Never merge without Fudgie's separate word. No backend or Firebase rules included in this PR.
