# TSCMS Admin — checkpoint after Owner verification (Oct 20, 2026)

## Confirmed by Cherish's 12:33 AM CT handoff
- **Production Firebase v4 rules are LIVE** for project `tscms-admin`; prior v1 rules preserved for rollback.
- Security emulator result: **39 PASS, 0 FAIL, 5 NOT_TESTED**; these are documented limitations, not 44 passes. This test result predates production deployment.
- Owner's email verification, personal email/password login, and Owner-only Firestore `users` list **worked on the temporary `owner-test.html` page**.
- Existing protected Admin data remains behind the old PIN-encrypted `admin-data.enc.json`. Data migration not complete.
- Cherish is mapping encryption keys and data consumers before changing anything. Do not compete with or shortcut that work.
- PIN retirement **timing is deferred at Owner's instruction**. Do not make an arbitrary cutoff a blocker to personal login. CAUTION: the deployed v4 rules still contain a hard-coded Nov 1 2026 PIN-path limit, so any later extension requires an explicit rules change and test; changing preview text alone has no effect on backend.

## Owner-approved registration experience
1. Enter existing station PIN to initiate registration (PIN cannot authorize private Admin access).
2. A popup gathers full legal name, private email, display username, password and confirmation.
3. Create pending `/users/{uid}` and reserved `/usernames/{username}` in one Firestore batch, with neither Admin nor Owner privileges.
4. Email verification plus Owner approval are both required for protected data. Owner cannot independently check another person's `emailVerified` from client Firestore; user must independently establish verification before approving.
5. Returning approved staff log in with **email + personal password**; username is for display only.

## Existing work on isolated preview branch
- `admin-auth-preview.html`: interactive PIN → signup popup → waiting-for-Owner visual walkthrough. Credential inputs disabled; no real account writes.
- `admin-auth-workflow-staging.js`: prepared dependency-injected signup/role-review functions. Initial mocked behavior tests: 16 PASS, not live proof. Client-side deadline check removed. Not imported by production.
- `admin-firebase-login-staging.html`: **REAL** Firebase Auth and Owner review implementation on a GitHub branch **not published to the live site**. Supports email/password, reset, verification emails, fresh role reads, Owner-only Firestore list, and explicitly confirmed Owner approve/reject/revoke. It does not fetch decrypted Admin data or unlock `admin.html`. Pending verification of all browser/real-account interactions.
- The new page is a separate integration candidate. `admin.html` and the public homepage are unchanged.
- Existing `owner-test.html` on production main was temporarily published by Cherish. Removal is her decision once independent Owner login story is tested.

## Open integration gates
- [ ] Confirm live deployed rules match the reviewed v4 source, including denial cases. Existing 5 untested time/race cases remain documented.
- [ ] Thoroughly test real personal sign-in and the isolated Owner approval UI with controlled test accounts. Do not equate successful sign-in with Admin data access.
- [ ] Resolve PIN migration validation safely. Current v4 rules self-assert `registrationPath:'pin'` and deny that path while `/config/migration` is absent; don't open actual PIN signup until backed configuration is ready and the Owner decides its retirement policy.
- [ ] Review the Owner approval UI's limitation: Firestore client cannot inspect other users' Firebase Auth verified flag; independent verification required. Ensure only authorized accounts get role flags and revoke is effective.
- [ ] Cherish securely inventories and migrates all `admin-data.enc.json` content + key handling to role-protected storage; keep backups. `/vault` not created yet according to handoff.
- [ ] Preserve Danger Zone, moderation evidence links and Queue semantics. Test with migrated data and denial by anonymous/pending/revoked accounts.
- [ ] Only after data migration and real browser security tests, wire private dashboard to Firebase roles and remove legacy decryption access by deliberate Owner-approved cutover.
- [ ] Do not merge/publish staged Auth page or alter `main` without explicit approval.

## Collaboration
No new Cherish requests unless Fudgie asks; she is already mapping the data migration. Codex is not involved.
