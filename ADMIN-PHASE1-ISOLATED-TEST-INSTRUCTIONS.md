# TSCMS Phase 1 — ISOLATED Firebase E2E test lane

**2026-10-20 · TEST ONLY · NOT production.** Owner-approved branch:
`test/admin-phase1-isolated-firebase-20261020`.
Do not merge this branch to `main`. Its `firebase-admin-config.js`,
`tscms-admin-dual.js`, and `admin-firebase-login-staging.html`
enforce projectId `tscms-admin-login-test`. The normal staging branch
still targets production and must **NOT** be used for real test registration.

## New: one-command interactive browser runner for Cherish (2026-10-20)

New script: `tests/admin-isolated-e2e.cjs`. It serves the isolated branch on `localhost:8765`, drives the applicant login/registration UI with Playwright, checks **unverified → verified/pending denied → approved allowed → revoked denied**, then tests signout. It pauses for the controlled inbox email-link click and for Cherish's test-project-only Owner approval/revocation console actions.

**Prerequisites:** Cherish has a networked browser and Node 18+; a cloned checkout of the exact `test/admin-phase1-isolated-firebase-20261020` branch; a deliverable test applicant mailbox SHE controls and a fresh 12+-character password; permission to create throwaway users exclusively in `tscms-admin-login-test`. Never use a real group member's data. Never share test credentials in Slack or GitHub.

Example in her terminal:

```bash
git switch test/admin-phase1-isolated-firebase-20261020
npm install --no-save playwright
# If Playwright needs its browser executable, run: npx playwright install chromium
read -r -p "Controlled TEST applicant email: " TSCMS_TEST_APPLICANT_EMAIL
read -r -s -p "New TEST password (12+ chars): " TSCMS_TEST_APPLICANT_PASSWORD
echo
export TSCMS_TEST_APPLICANT_EMAIL TSCMS_TEST_APPLICANT_PASSWORD
node tests/admin-isolated-e2e.cjs
unset TSCMS_TEST_APPLICANT_EMAIL TSCMS_TEST_APPLICANT_PASSWORD
```

The runner refuses wrong branches/project configuration, omits credentials from logs, and needs **human** input for the verification email and Owner-console flips. Verify the project name in Firebase console before any changes. It does not automatically delete the test user; Cherish cleans up **only** the throwaway Auth UID, `/users`, and `/usernames` after recording sanitized PASS/FAIL results. If a step fails, send exact sanitized error and stop—don't fake the remainder.

**This is still a test harness, not a completed live E2E.** Browser inbox access and actual Firebase responses remain unverified in this chat. The runner deliberately simulates PIN success; legacy PIN regression, synthetic vault decrypt, and production launch need separate gates.

## Scope and exact limitations
- Auth/Firestore: **isolated Firebase project only**, real v4 rules as copied by Cherish.
- `admin-phase1-isolated-e2e.html`: intentionally **simulates a successful PIN check**, no actual PIN is accepted/processed. It invokes the *real staged Firebase signup handler* in `tscms-admin-dual.js` using real Firebase Auth/Firestore. This does NOT prove real PIN decrypt/UI regression.
- `admin-firebase-login-staging.html`: independent Firebase sign-in, Owner approval/reject/revoke, status. It cannot unlock the real Admin dashboard; use it to check the real Owner workflow without the data-key prerequisite.
- Final **dashboard decryption** is a separate gate. Only perform it after a **throwaway synthetic** /vault key is seeded in the test Firestore and the synthetic v2 ciphertext is available to a private LOCAL test server. The project handoff did not confirm /vault/keys setup, and this branch intentionally contains **no key, plaintext, PIN, or real Admin data**.
- Test Owner `testowner.tscms@example.com` uses a reserved example domain; it cannot receive real emails. Have Cherish configure a test Owner account she controls and verify that test owner's Auth emailVerified state in the test console. **Never post any password in Slack, Github, or Drive.**
- For the applicant email-verification test, use a real *controlled test inbox* with explicit Owner/team consent. Do not register other members or use production credentials. A browser and real inbox are needed; mocked tests cannot prove email delivery.

## Run locally, without publishing or copying production secrets
1. Check `firebase-admin-config.js`: `projectId` MUST equal `tscms-admin-login-test`. Both staged scripts throw if it doesn't.
2. On a local clone of the test branch, serve with `python3 -m http.server 8765 --bind 127.0.0.1` and open `http://localhost:8765/admin-phase1-isolated-e2e.html`. The Firebase authorized-domain list must include `localhost` (Cherish confirms it does).
3. Tap **Simulate successful PIN step** and submit an invented non-member name, a controlled applicant email/password, and a unique test username. Check in the **test** Firebase console for atomic `/users/{uid}` `pending/admin:false/owner:false` and `/usernames/{username}`. Try a colliding username (must deny or recover safely).
4. Verify the applicant email **through the actual controlled inbox**; repeat with unverified applicant to confirm denial.
5. Using a separately controlled Test Owner account, open `http://localhost:8765/admin-firebase-login-staging.html` in a private window, sign in, confirm Owner-only queue, manually verify applicant identity and approve test applicant. Before approval, pending applicant must have no privileged vault read or Admin access.
6. Applicant signs in through the separate staging login page. Verify approved+verified state, then revoke and confirm denied status on refreshed Auth/Firestore read. Also test wrong password, rejected, anonymous, and signout/reload. Delete all temporary Auth accounts and `/users`/`/usernames` test records at the end.
7. Dashboard rendering with synthetic v2 key and ciphertext remains **NOT TESTED** until the isolated `/vault/keys` fixture and matching locally served `admin-data.v2.enc.json` exist. Do not create a production key to pass this test.

## Gate before any live release
PIN through Oct 31; separate Nov 1 cutoff check; Owner witnessed production v2 key ceremony; production ciphertext re-encryption; full negative-rule audit and UI mobile QA; independent Owner GO. No production deployment or Firebase changes from this branch.

## Results
Record only PASS / FAIL / NOT TESTED with evidence in the existing 🔐 ADMIN LOGINS · PHASE 1 Slack **hub thread**. Avoid credentials, Firebase keys, personal emails, and private member data in the report.
