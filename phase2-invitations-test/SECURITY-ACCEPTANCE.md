# TSCMS Phase 2 — Cherish security acceptance checklist
**Status: TEST ONLY · Not production release · Oct 22, 2026**

Source contract: Cherish's locked `TSCMS_Invitations_Phase2_Build_Spec_20261022.md`, referenced in the ADMIN LOGINS hub but not yet retrievable verbatim here. Cherish must cross-check every point with her exact spec before accepting this as implementation-complete.

Project boundary: **ONLY** Firebase `tscms-admin-login-test`, fictional test Owner, fictional applicants, disposable allowlisted email inboxes. Do not use James/Jim's real email or Firebase production project while testing. No live rules deploy, GitHub main merge, domain activation, PIN switch, or Nov 1 cutover is authorized.

## Phase 2 — twelve independently observed security tests

| # | Case | Expected server/browser result |
|---|---|---|
| 1 | Approved, verified Owner creates token for an explicitly allowlisted test recipient | Only Owner can create; 256-bit random token, email-bound, expiry no later than 7 days |
| 2 | Non-Owner, unverified, pending, or revoked account tries to create token | Server-denied (not just disabled UI) |
| 3 | Invite opened by an unauthenticated browser | No grant; token in fragment alone cannot read invite or create access |
| 4 | Signed-in Firebase user with wrong email tries to claim token | DENY; no user/username/invite changes |
| 5 | Recipient email exists but is not Auth-verified | DENY until verified token; no access |
| 6 | Invite expires (test server clock / safely seeded expiry), then claim attempted | DENY; cannot revive with resend |
| 7 | Owner revokes unconsumed token, then recipient attempts claim | DENY; revocation only modifies status |
| 8 | Recipient claims token once with real paired user + username + invite update | ALLOW once; user status PENDING, admin=false, owner=false |
| 9 | Token replay after successful consumption, including another Auth UID | DENY on server; no duplicate registration |
| 10 | Claim tries to set approved/admin/owner privileges or omit paired reservation | DENY; original Owner approval still required |
| 11 | Resend after issue | At most 5, unchanged email/expiry/privileges; reissued link still single-use; owner-sent fallback must require actual Send |
| 12 | Parallel claims / transaction race on same token | Exactly one wins, never two; no orphan username or profile |

## Two approved Owner Panel checks (additional, NOT substitutes for the 12)

A. Owner signs into TEST room, leaves approval inbox open, synthetic pending user is written by authorized registration → row appears automatically without refresh. Signing out unsubscribes the users listener; no incoming updates or decrypted data remain accessible. Revoke still requires its original two deliberate taps.

B. Approved TEST Owner signs in and refreshes → Firebase restores Auth, then `personalLogin()` must reload user, force token refresh, read server profile, check `isAllowedPersonalAdmin`, decrypt, recheck profile, open room and resume 60-second validator. A revoked Owner refreshing must stay at gate; no client-side bypass or localStorage of decrypted data.

C. PIN is unchanged through October 31; Nov 1 One-Gate spec and production approval are separate. Preserve existing real Owner and Admin accounts untouched.

## Mandatory evidence (no inferred pass)

- Compare candidate v5 delta to the TEST project's actually installed corrected v4 rules. Prove changes are additive and parser compiles with Firebase emulator/deployment validator; do not overwrite unrelated installed rules.
- Use actual Auth and Firestore TEST-project server responses, not merely unit test mocks, for deny/allow and expiration.
- Run the browser journey using allowlisted fictional addresses; capture per-test PASS/FAIL with timestamps, **no tokens, passwords or member PII in Slack**.
- Compare generated invite against exact spec. Determine whether production sender `noreply@tscmsradio.com` is permitted under Spark email-link and authorized domains. Fallback owner-sent link requires explicitly pressing Send in mail app.
- At end, revoke/delete disposable test tokens/accounts and shut down any temporary test host in the prior approved cleanup scope; preserve protected TEST owner and original rules/config where applicable.
- Do not send actual invitation to Jim or change his existing access; he successfully signed in separately.
- Fudgie separately approves activation only **after** Cherish records security PASS and Owner Panel PASS.

## Oct 22 ~6:53 PM CT — Owner activation decisions and repaired TEST candidate

**Decisions from Fudgie, confirmed in ADMIN LOGINS/Junk Drawer:**
- **V1 ACCEPT AS-IS:** verified, exact-email invitee may GET their own issued invite record. Keep existing v5 rules; no production promotion authorized.
- **V3 ACCEPT ONE-TIME EMAIL LINK + NORMAL PASSWORD:** the email link establishes ownership only for invitation claim; final registration step sets/confirm a new password via Firebase `updatePassword`. Everyday logins remain email + password using the normal existing Admin sign-in. User profile remains `pending`, `admin:false`, `owner:false`; invite alone never approves.
- Other variance handling unchanged from Cherish's test report; no additional user decision tonight.

**Cherish's Stage 2 TEST evidence, ~6:00 PM CT:** 38-check server security matrix (12 named tests) PASS; Owner live-watch and refresh restoration PASS; email-link journey reaches registration form. **Hosted claim batch FAILED** because recipient signed in on separate Firebase app but Firestore uses Owner app. An initial static 16/16 pass never certified this host path.

**Clara's incremental TEST-only fixes after that report:**
1. Recipient Firestore now built from `recipientApp`, and all recipient-only invitation reads, user-existence check, and atomic `users + usernames + invitations` write use `recipientDb`; Owner Firestore remains strictly for Owner actions.
2. Candidate Owner Approval Inbox adds a **two-tap Reject** confirmation (same button, same applicant, within five seconds; cancel on focus change/Tab/Escape, outside click, scroll, visibility, re-render). Revoke's original two-tap guard remains.
3. Invitation expiry issuance uses a **75-minute safety buffer** subtracted from 7 days, so a somewhat fast phone clock will not exceed the existing server-side 7-day maximum. Server rules were **NOT** loosened.
4. V3 final claim form now prompts for a new password + confirmation (minimum 12 characters); after verifying the invitee email and rejecting any preexisting user profile, `updatePassword` runs before the pending-only three-document atomic Firestore commit; fields are cleared after setting password. No password is saved in Firestore or browser localStorage. A failed Firestore commit still grants no Admin access.

**Status:** GitHub static/helper preflight can pass but is **not Cherish's real hosted re-test PASS**. Cherish must deploy candidate only to the disposable TEST host (after comparing TEST installed rules), verify full real email link → select password → commit as recipient → pending profile → sign out → normal email+password login remains denied while pending → Owner approval grants access. Independently exercise first tap Reject does NOTHING, same-button second tap performs server update, outside click/scroll/timeout resets; expired/fast-device test for issuance, and all prior protected security cases without weakening rules.

**Release hold:** DO NOT change production auth/rules/PIN or live website; do not send James a new invitation (he already signed in). Cherish records PASS/FIX NEEDED with sanitized evidence; only then Fudgie gives separate activation GO before Nov 1.
