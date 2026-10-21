> **GATE A FINAL — OCTOBER 21, 2026 (CT): PASS / CLOSED (TEST ONLY).** Cherish's final report in the Admin Login Slack hub documents the original cutoff failure, the targeted server-side rule fix, single focused re-rehearsal, and verified final cleanup. TEST v4 rules matched reference before patch; updated ONLY `isPinWindowOpen()`; TEST Firestore rules compiled and published successfully at ~08:53 CT. With `cutoffDate:2026-10-01` and `pinRegistrationOpen:true`, a new PIN-path paired /users + /usernames registration was **DENIED BY SERVER (403 PERMISSION_DENIED)** and /users read-back was absent. Restoring `cutoffDate:2026-11-01` allowed a new profile as pending/admin:false/owner:false only. Cleanup VERIFIED: both disposable Auth accounts deleted, disposable /users and /usernames removed, usernames collection empty, protected test owner remains, original migration config restored word-for-word, test rules remain corrected; no production Firebase or website changes. Standalone real-account + combined browser checks closed as previously documented (Owner UI Approve browser click-path remained unverified in that particular combined run; console fallback was used, and an earlier E2E had covered approval). **Do not retest Gate A.** The corrected rule is **NOT deployed to production**; production rule promotion requires separately authorized release controls. Gates B/C/D remain unauthorised and separate.

# TSCMS Admin individual logins — ONE-PASS completion checklist
**Owner direction:** Fudgie, 2026-10-21 (America/Chicago). **Staging only; no live deployment authorization.**
**Applies to:** Phase 1 personal Admin login + coexistence with the current PIN through October 31, 2026.
**Operating principle:** Test responsibly, record a real PASS once, and STOP. A failing test gets a targeted fix and one affected-function regression, not an entire repeat matrix. Never substitute a mock PASS for a real security/browser PASS.

## CLOSED — do not rerun absent changed behavior or a reproducible defect
- [x] Real Firebase **separate** account flow, isolated test project: registration → unverified denied → verified/pending denied → Owner-approved allowed → revoked denied → logout. **6/6 real PASS**, Cherish Oct 20; disposable account/repo cleaned up.
- [x] AES-256-GCM v2 test data and exact AAD, CLEAN ISO timestamp fixture; valid encrypt/decrypt and tamper/incorrect key denials. Test assets are fictional; **not production**.
- [x] Staging-only loader + simulated integrated-login checks **11/11 + 10/10**; simulated PIN-path integration **13/13**; session invalidation **17/17**. These PASS only for stated mock/synthetic scope. Do not keep repeating them.
- [x] Legacy `mc.js` unchanged on the auth staging branch; staged role checks precede private dashboard display and re-check on focus.
- [x] Reviewed synthetic-only pack builder `tests/prepare-admin-isolated-browser-pack.cjs`, hash-pinned to the corrected CLEAN fixture; static review complete. **Offline pack + isolated real browser checks subsequently completed and recorded above; cutoff retest PASS.**

## OPEN — minimal remaining gates, in order

### A. One real combined Admin browser pass — TEST project + fictional data ONLY
**Clara** owns staging code, safety preflight and QA evidence. **Cherish** owns the networked browser, TEST Firebase console and isolated test vault; no production resources.
- [ ] Run local pack builder on the AUTH staging branch with the two CLEAN fixture files and verify its synthetic allowlist, exact test project ID (`tscms-admin-login-test`), correct branch, valid SHA pins, fake PIN and no production links/secrets. Stop and report if any preflight fails. The builder itself is offline, not a deployment.
- [ ] **Separate Fudgie GO needed before creating a new temporary public Pages host or writing the TEST vault.** No GO inferred from permission to prepare, code, or run offline tests.
- [ ] On an authorized short-lived host, exercise **one combined journey**: wrong fake PIN denied; right fake PIN shows the dashboard and registration affordance; approved/verified individual account decrypts **the same fictional** 5 Danger Zone + 2 flags, generated time readable; pending/unverified and revoked account cannot view it; Owner approval UI cannot be used by a non-Owner; sign-out hides private content; phone-width interface usable. Check real Firestore role/key denials, not just displayed messages. Report PASS/FAIL/NOT TESTED for each critical check.
- [ ] Cherish rehearses November 1 **server-side** cutoff on TEST project with past-date test configuration; new PIN-path registration denied, approved individual login still allowed. Keep production migration settings untouched. The actual website PIN acceptance cutoff needs its own code verification and final-cutover action.
- [ ] Remove test host and disposable test records, confirm removal. Do not repeat the previously passed standalone 6/6 journey unless the combined test exposes a related failure.

**Gate A STOP:** All critical checks PASS and evidence logged, or a concrete blocker identified; no endless new tests. A blocked/failed security boundary blocks production until resolved.

### B. Production encryption and rollback preparation — a DIFFERENT Fudgie GO
**Cherish** creates and safeguards fresh production raw AES-256-GCM v2 key, private vault entry and restricted owner-approved local pipeline key store (0600), regenerates current Admin-only ciphertext; **Clara** verifies ciphertext-only artifact, data-field/count/time parity with authorized source and rollback file references. **Neither** pastes keys, PINs or Admin plaintext into GitHub, Drive or Slack.
- [ ] Fudgie explicitly approves/witnesses key ceremony and selects **manual or approved scheduled** encrypted Admin refresh; no cadence activated implicitly.
- [ ] Prove approved users can retrieve permitted key while non-approved users cannot; ensure private/Admin dataset parity and safe existing PIN rollback through Oct 31.
- [ ] Record artifact SHA/version, recovery instructions and key-rotation caveat. Close on one successful proof; targeted retests only after a change/failure.

### C. Controlled production release — a THIRD, separate Fudgie GO
**Clara** is sole website publisher; **Cherish** independently confirms live login and data provenance.
- [ ] Freeze current `main` SHA immediately before cutover, back up live `admin.html`, `mc.js`, legacy encrypted bundle, protected assets and required rules. **AUTH staging and main are diverged (Oct 21 check: staging 40 commits ahead, 52 behind). DO NOT merge the whole old branch or replace main with a stale page.** Cherry-pick/port only reviewed Admin-specific files onto current main, rerun Protected Features check, review final diff.
- [ ] Fudgie explicitly says GO for publishing the production Admin files, approved encrypted v2 data and relevant Firebase settings; public tabs/other features stay out of scope.
- [ ] One live Owner login, one approved staff login, one unauthorized denial, one logout-clears-data check, and legacy PIN continuity (while still permitted). On failure, targeted repair or planned rollback; do not scatter changes.

### D. November 1 (separate scheduled cutover, not today's release)
- [ ] Retire **website PIN login** at midnight America/Chicago and enforce/verify Firestore PIN-registration cutoff; validate approved individual logins and Owner recovery. PIN legacy ciphertext remains inherently copyable historically; do not describe old data as retroactively erased. Requires Fudgie's explicit cutoff authorization.

## Evidence and communication — no duplicate busywork
Post **one** concise PASS/FAIL/BLOCKED update for each actual gate in the existing Slack **ADMIN LOGINS · PHASE 1** thread: test environment, source commit/artifact, critical checks, blocker if any, next owner. No passwords, key material, tokens, real private content, or repeated test transcripts.

**Scope:** This document updates the *test strategy only*. Nothing here authorizes test hosting, Firebase writes, production key ceremony, Admin deployment or PIN cutoff. All unrelated site rollouts remain on HOLD.

**Relevant authoritative detail:** `ADMIN-PHASE1-RELEASE-PREP-QA-20261020.md` is the longer retained traceability document. This ONE-PASS checklist is the critical path controlling retests and next actions.
