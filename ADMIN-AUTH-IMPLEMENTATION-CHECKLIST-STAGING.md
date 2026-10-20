# TSCMS Admin — implementation checkpoint (Oct 19–20, 2026)

## Owner-approved experience
1. Existing station PIN opens a registration **popup** during the migration window.
2. Applicant supplies full legal name, private email, display username, personal password and confirmation.
3. Registration creates **pending**, never Admin or Owner permissions.
4. Applicant verifies email. Owner approves or rejects; both verified email **and** approved Admin role are required before protected data can load.
5. Returning staff sign in with **email + personal password**; username is for display only.
6. Legacy PIN registration window ends **Nov 1, 2026 00:00 Central** (2026-11-01 05:00 UTC). Backend time, not browser time, enforces the deadline.
7. No live changes until separately authorized. Don't publish placeholder users or private data.

## Prepared on isolated staging branch
- `admin-auth-preview.html`: PIN-first, registration popup, email verification/approval walkthrough; **demonstration only**, credential fields disabled.
- `admin-auth-workflow-staging.js`: dependency-injected Firebase-client workflow (not imported by any live page). Implements pending signup, atomic `/users` + `/usernames` writes, email verification mail, email/password sign-in, verified+approved+role checks, owner-only pending queue and approve/reject/revoke, reset and sign-out.
- Local fake-SDK behavior checks: **16 PASS** (PIN only UI; no elevated self-signup; username batch; cleanup on failure; unverified/revoked denied; owner approval/revocation; non-owner queue denial). **Not** proof of live Firebase, browser or security-rules readiness.
- Live `main`, `admin.html`, `mc.js`, `admin-data.enc.json`, Firebase project and public site are **unchanged**.

## Remaining release blockers (do not mistake staging code for approval)
- [ ] Independently read actual **deployed** Firebase Rules, confirm they match accepted proposed version, run emulator/security tests and verify denial by direct SDK calls. The 39-pass/5-not-tested result reported earlier was on an isolated test branch, not a production validation.
- [ ] Create or verify an authenticated Owner account and trusted Owner Firestore record. Never create Owner privileges in public signup UI.
- [ ] Check authorized domains, verification email flow, reset password, and correct approval/revocation behavior on real test accounts.
- [ ] Decide how to validate the legacy PIN. **Website-side PIN checks cannot be a trustworthy server-side gate.** Current proposed rules allow a self-asserted `registrationPath:'pin'`, but it grants no role; all such signups stay pending for Owner approval. Do not describe client PIN entry as backend proof.
- [ ] Confirm `/config/migration.pinRegistrationOpen` and the server-side Nov 1 cutoff. Preserve personal email+password login after cutoff.
- [ ] Decrypt and inventory all legacy protected fields in a secure setting, back them up, and migrate the entire Admin data safely. Firebase login alone cannot decrypt `admin-data.enc.json`.
- [ ] Clarify Owner's ability to see email verification: client Firestore cannot inspect another user's Firebase Auth `emailVerified` status. The current owner queue labels it **UNKNOWN**, and actual Admin access is still denied until verified. Do not falsely label pending accounts verified.
- [ ] Wire the frontend with official Firebase SDK only after rules and data migration pass; perform anonymous, pending, unverified, revoked and approved-owner browser tests.
- [ ] Obtain final Owner go-live approval and have rollback without reopening the legacy PIN as an unintended bypass.

## Collaboration
Cherish is currently busy with September Monthly Spotlight data and system crashes. **Do not send requests or task assignments** unless Fudgie explicitly asks. Codex is not involved.
