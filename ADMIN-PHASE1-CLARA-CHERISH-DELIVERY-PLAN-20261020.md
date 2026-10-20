# TSCMS — Phase 1 PIN-to-Personal-Admin Release Plan
**Date:** October 20, 2026
**Owner:** Fudgie
**Design state:** LOCKED under `ADMIN-OWNER-LOCKED-PHASE1-PHASE2-PLAN-20261020.md`
**Release state:** PLANNING + STAGING ONLY. No live site, Firebase, or scheduled automation changes authorized by this document.

## Owner commitments that cannot change mid-phase
1. Existing PIN continues giving full Admin Control Room access through **Oct 31, 2026**, whether or not a personal account is approved.
2. After successful PIN unlock, offer popup for real name, PRIVATE login email, display username, and personal password.
3. Registration creates a Firebase Auth UID and a PENDING unprivileged Firestore profile with reserved unique username. It does not activate personal Admin access.
4. Firebase verifies the email. Fudgie personally verifies and approves the person (aim within 24 hours); personal email/password login works only after both checks.
5. Approved personal login and old PIN coexist through Oct 31. Owner-only dashboard shows pending and approved profiles; roster tracks Needs Setup without exposing private data.
6. **Nov 1, 2026 00:00 CT:** PIN is retired. Verify the website PIN acceptance cutoff independently of the already-deployed v4 Firestore PIN-registration cutoff.
7. Phase 2 automatic, preapproved invitation Route A remains separate and follows only after Phase 1; it never blocks Phase 1. No v5 rules during Phase 1.

## Explicit responsibility agreement
| Work | Clara — accountable for DELIVERY | Cherish — accountable for SOURCE/PREPARATION |
|---|---|---|
| Every website page/site asset push and deployment | **SOLE PUBLISHER**: commit/rebase, publish, rollback, and verify all site pages, JS/CSS, generated assets and encrypted bundles | Provide finished source files/bundles and instructions; **do not publish pages** |
| Legacy PIN | Preserve existing `mc.js` decryption and the old bundle until approved cutover | Validate pipeline never overwrites old bundle; assist regression tests |
| Firebase phase-1 UI | Code account popup, pending/verified states, personal email/password login, forgot-password and Owner approval/reject/revoke, Owner-only queue | Confirm v4 deployed/authorized domain/migration config; supply test evidence |
| New encrypted Admin data | Browser SDK role-check, decryption integration, dataset parity, publish approved ciphertext | Key ceremony, v2 format and key storage, generator `encrypt_admin.py`, staging ciphertext, hashes and recovery assets |
| Admin functionality | Render Danger Zone 5/10, moderation evidence, generated stats, public-safe links, older display settings in both login paths | Supply exact current source payload/field schema and parity report |
| Security testing | Browser/E2E integration, deny states, accessible mobile UI, smoke checks and rollback drills; request Owner signoff | Rules emulator/security matrix, Firebase data safety, authenticated key access and migration checks |
| Public generator refreshes | Preserve approved homepage features; reconcile current `main` before all releases; push only after approval | Generate/public-safe data and upload complete files to shared Drive; no page push |

## Ordered release gates and detailed responsibilities
### Gate 0 — source synchronization / frozen baseline
- Clara snapshots latest `main`, `admin.html`, `mc.js`, old encrypted bundle, and current approved public assets, with commit/blob hashes. Stage on current main; do **not** bulk merge the existing stale auth branch (at review it was six commits behind and diverged).
- Keep public refresh separate: Cherish's Oct 20 05:54 CT Drive files are confirmed (`index-20261020-0554.html` 223,297 B; `tscms-today-20261020-0554.html` 285,817 B; `danger-zone-public-20261020-104.json` 22,580 B). New raw homepage misses the already-live `tscms-public-runtime.js` inclusion/September Spotlight; Clara must preserve those in reconciliation before any public push.
- Cherish supplies public refresh filenames, source date range, link QA and count evidence; Clara compares to current main; Fudgie authorizes public deployment separately.
### Gate 1 — Firebase state readback (Cherish lead, Clara independent check)
- Verify v4 really deployed, `/config/migration` pinRegistrationOpen:true, eligible authorized domains, Owner verified/role-list works, and email verification sender works. Re-run tested negative cases before inviting staff.
- **Known evidence:** Cherish reports 39 PASS, 0 FAIL, 5 NOT_TESTED (time/race/boundary). Do not label these 44 passes; document remaining risks and cutover verification plan.
- Existing v4 `registrationPath:'pin'` is client-asserted and does NOT cryptographically prove PIN knowledge. It grants pending-only registration; Owner verification/approval is the privilege barrier. Do not claim Firebase enforces PIN validation independently.
### Gate 2 — finish account workflow in staging (Clara lead)
- Reconcile auth code against current `admin.html`. Add a PIN-success-triggered popup without replacing the existing PIN entry/decryption function.
- Build atomic Firestore pair of `/users/{uid}` and `/usernames/{username}`; normalize usernames; reject collisions and malformed info; never expose private email publicly.
- Guard against partial registrations: Auth created but Firestore denied, duplicate/retry and verification-email failure must have user-safe recovery, not abandoned accounts.
- Personal login must require authenticated+email-verified+approved Admin/Owner record. Implement pending, rejected, revoked, wrong password, reset and sign-out behavior. Fail closed when vault/bundle unavailable.
- Owner approval UI must review applicant real name/email/username and allow Fudgie to verify identity OUTSIDE the site before pressing Approve. The Owner view cannot automatically read another Firebase Auth user's `emailVerified` value; approval may be recorded, but protected Admin access remains blocked until that user proves email verification.
- Owner queue from `/users` is already permitted by v4 Owner list read. **Needs Setup** for people who have not registered requires a private roster source; use existing encrypted Admin dataset or another owner-only mechanism that works without changing v4. Confirm privacy and update cadence; do not insert a world-readable roster.
- Target Fudgie approvals within 24 hours, but no artificial approval deadline or unattended privilege activation.
### Gate 3 — v2 data encryption contract (Cherish prepares, Clara consumes)
- Cherish proposes/generates a fresh random AES-256-GCM raw encryption key, stores only in Firebase `/vault/keys` under approved verified-Admin read security and in restricted local pipeline storage. Key generation/entry happens ONLY at the agreed release-prep gate, with Fudgie witnessing as planned. **Never put keys, PINs or plaintext Admin data in GitHub, Drive handoffs, Slack, logs, or browser-source constants.**
- Confirm exact v2 contract BEFORE coding pipeline: new public ciphertext filename, JSON keys `kid`/`iv`/`ct`, base64 encoding, random nonce, AES-GCM tag placement, key lookup, and **AAD choice/byte encoding**. Cherish proposes binding format+key-id as AAD; Clara's draft decryptor currently uses no AAD, so the two implementations MUST be aligned and tested together before shipping.
- Cherish prepares `encrypt_admin.py` raw-key encryption and SHA-256 hashes plus rollback package; validates complete Danger Zone, flags, stats, generated timestamps field parity with legacy source.
- Decide whether v2 bundle updates remain manual or follow six-hour refresh. If manual, define on-call freshness check; if automated, protect access to secrets and prevent accidental publishing of plaintext.
- Clara integrates v2 decrypt into approved personal login, preserving the old PIN decrypt through Oct 31. Treat a client-readable key as copyable: revocation requires planned key rotation and next-bundle re-encryption, not merely changing a user flag; already-downloaded ciphertext remains accessible with saved old keys.
### Gate 4 — test and release readiness (joint)
- Run real browser and Firebase test accounts: PIN unlock existing dataset and prompt; create pending; verify email; Owner sees application; Owner approves; personal login succeeds; wrong email/password, anonymous, pending, unverified, rejected, revoked denied; signout; existing PIN continues working.
- Check account setup popup on Android/mobile and desktop; proper copy, keyboard, back buttons, focus; current Admin queue 5/10 + stats/flags parity; no public-facing leaks; no console errors.
- Verify personal path denies if vault or new ciphertext missing; test fresh and stale key versions; wrong ciphertext/key/AAD fail; verify both paths render same dataset at same snapshot.
- Check November 1 cutover separately using controlled time simulations plus practical release plan. Lock cutoff in page CODE and Firestore; old PIN must not open live new data after cutover.
- Check no unexpected Firebase billing. No live publish before Fudgie reviews a concise PASS/FAIL report and explicitly says GO.
### Gate 5 — controlled dual-mode launch (Clara only after Fudgie GO)
- Clara rebases/cherry-picks precisely reviewed changes onto latest main (avoid stale file overwrite), records pre-release commit for rollback, publishes approved Admin page, JS/CSS, protected-data ciphertext and related assets via GitHub, and watches deployment state.
- Cherish verifies Firebase/key and encrypted bundle parity after Clara's push. Clara verifies custom-domain HTTPS, both login methods end to end and permission denial; if issues, Clara alone executes page rollback, coordinating safe backend state with Cherish.
- Begin onboarding only after successful dual-mode release tests. Fudgie retains final approval authority.
### Gate 6 — November 1 approved cutover
- Under Fudgie's express approval, Clara removes PIN UI/acceptance and retires public legacy bundle. Cherish confirms Firestore PIN-registration cutoff and current-key bundle refresh. Test existing personal Admin accounts and Owner recovery.
- **Historical limitation:** previously copied legacy ciphertext remains decryptable by anyone with old PIN. Future new ciphertext no longer uses that PIN.

## Free and simpler-first working agreement
- First reuse the existing GitHub repository, current staging branch and free GitHub Actions tests; create new free repos only with a concrete isolation need. Do not create extra repos automatically.
- GitHub Pages serves PUBLIC files and ciphertext only. Do not mistake unlisted URLs, private repo names, `.gitignore`, or browser-side JS for server authorization.
- Reuse Firebase Spark/Firestore/Auth; use Firebase Emulator Suite and GitHub Actions for tests when feasible. Free plan eligibility, quotas and any limits must be checked before adopting tools.
- Cherish may later automate Drive delivery after Fudgie explicitly approves; upload-only pipeline does not authorize pushing pages. Clara remains sole page publisher; separate publish approval remains necessary.
- Prefer one source-of-truth handoff with version/hash and short QA evidence. No serial rewriting of locked design.

## Current snapshot / blockers
- Cherish lane handoff read: `TSCMS_Phase1_Cherish_Lane_Handoff_20261020.md` **ACCEPT, no blockers**, with outstanding AAD contract and rebuild cadence choices.
- Firebase v4 deployed/migration switch live per Cherish's verified console evidence. Original PIN still present. Phase-1 staging code exists but browser/E2E tests and v2 pipeline integration not yet complete; DO NOT CALL READY.
- Public Oct 20 handoff now visible in shared Drive. Do not release raw index as-is because it omits current September Spotlight runtime.
- **No production publication or additional Firebase change has been authorized by this plan.** Any change to locked product behavior, security posture, schedule, or paid-plan needs Fudgie approval.