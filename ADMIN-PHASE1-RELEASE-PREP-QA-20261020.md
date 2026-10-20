# TSCMS Admin sign-ins — Phase 1 release-prep QA gate
**Status: PREPARING · STAGING ONLY · Not approved for deployment**  
20 October 2026 (CT). Owned by Clara (dual-mode Admin frontend) + Cherish (encrypted dataset and Firebase rules) + Fudgie (all release decisions).

## Scope and hold
Only the Admin sign-in migration is in scope. Fudgie has paused **every unrelated rollout**, including Danger Zone releases and Halloween homepage updates. Cherish's 6-hour pipeline/Drive backups continue as upkeep; their generated files **do not deploy** under the hold. Do not merge/push public files just to release Admin. Keep the existing PIN usable through **October 31** unless Fudgie explicitly changes the transition decision.

**Two separate authorizations, not automatic:** Fudgie must expressly authorize (A) the synchronized *production key ceremony + private data re-encryption* once the build is prepared, and (B) the **final Admin deployment** after acceptance tests. No production Firebase vault writes or Admin publish simply because a test passes.

## Verified evidence (no new claim beyond the evidence)
- **PASS — real Firebase account workflow in isolated test project (Cherish), 6/6:** registration, unverified denied, verified but pending denied, approved login, revoked denied, and sign-out. Temporary applicant Auth/user/username records and throwaway GitHub Pages repo deleted (Cherish confirmed 11:59 CT). This tested **account roles**, not the combined Admin dashboard.
- **PASS — actual test-bundle crypto:** Cherish's synthetic v2 ciphertext and plaintext file hashes match the Oct 20 handoff. Actual AES-256-GCM with exact AAD `tscms-admin-data|formatVersion=2|kid=v2` verified; wrong key/AAD/IV/modified ciphertext fail.
- **PASS — staging loader synthetic tests:** 11/11 loader scenarios with actual test-bundle ciphertext/crypto but mocked Firestore transport; 10/10 combined role/login/decrypt mocks; 13/13 simulated legacy-PIN/personal dashboard paths; 17/17 session revocation/signout simulated checks. These tests do **not** prove a real combined browser/Firebase/PIN session.
- **PASS — source isolation:** `mc.js` legacy PIN code unchanged between `main` and `feature/firebase-admin-auth-preview-20261019`. Main not published with dual-mode changes. The staging script revalidates roles before render, on tab reentry/focus, every minute and signs out/reloads on role loss (best-effort current-session protection).
- **PENDING — real `admin.html` live-browser end-to-end** and actual password/PIN verification on the combined dashboard. **PENDING — production v2 migration and final Owner GO.**

## Gate A — finish frontend + integration testing, synthetic data ONLY
Owner: **Clara** (coordinate with Cherish; no production deploy)
- [ ] Smoke test combined *staging* `admin.html` on supported mobile/desktop Chromium with actual controls (not just DOM mocks). Verify PIN unlock, wrong PIN denial, post-PIN signup dialog appears once (including delayed Firebase module), personal login and logout, status messages, password-reset path, and accessibility at narrow phone widths.
- [ ] Test actual **synthetic** v2 dashboard flow: read only TEST-project `/vault/keys` containing a **throwaway key** and the corrected fictional `admin-data.v2.TEST-DASHBOARD.enc.json`. Verify 5 synthetic Danger Zone entries, 2 flags, stats timestamp and standard render functions. **Do not copy any real Admin data or use the production key.**
- [ ] Denials: anonymous/unverified/pending/rejected/revoked accounts cannot obtain private key or open page; stale `kid`, ciphertext corruption, wrong key, network error, Owner access vs Admin role, missing profile; revoke while page open and confirm rendered private data disappears.
- [ ] Test repeated sign-ins, logout, refresh, browser back, multiple tabs, slow connections and mobile screenshot for sensitive data lingering. Note: browser logout does not erase keys or ciphertext that a user intentionally saved earlier.
- [ ] Test **Owner approval UI** on real browser with controlled test accounts, confirm Firestore rules prohibit non-Owner list/update and that Owner checks identity independently (client cannot inspect another user's Firebase Auth `emailVerified`).
- [ ] Report exact PASS/FAIL/NOT TESTED, account/test-project scope, and sanitized errors in **existing 🔐 Admin hub**. A second temporary public Pages test repo **requires Fudgie's separate explicit approval**, not implied by earlier approval; prefer local, private testing if workable.
- [ ] Distinguish the simulated PIN-success harness from a real PIN test; only actual `mc.js` PIN decryption can close the latter.

**Gate A exit:** every critical access/security/browser acceptance item either PASS with evidence or explicitly called BLOCKED; Fudgie decides whether unresolved items can defer. A browser test of the combined Admin page is *not* currently passed.

## Gate B — production key ceremony & private dataset migration (separate Fudgie GO required)
Owner: **Cherish**, coordinated with Clara; **Fudgie witnesses key entry**
- [ ] Confirm snapshot/rollback artifacts: legacy encrypted bundle and existing v1 rollback rules retained; audit consumers/links/timestamps; use no plaintext in GitHub, Slack, Drive or browser logs.
- [ ] Generate a **fresh production AES-256 raw 32-byte key** via witnessed private ceremony; never reuse or paste the throwaway test key. Keep key handling outside public repo/Drive/Slack. Store in role-protected Firestore `/vault/keys` only after effective rules are confirmed.
- [ ] Re-encrypt *current* private Admin data to `admin-data.v2.enc.json` with fresh 12-byte random IV, `formatVersion:2`, `kid:"v2"`, WebCrypto/Python compatible GCM tag, exact AAD above. Rebuilds must use a fresh IV every time; no unapproved automatic re-encryption pipeline.
- [ ] Verify legacy/v2 plaintext parity for stats, generated time, Danger Zone queues, links, flags/evidence, and all UI-required fields; test wrong/stale key and mismatched envelope fail closed. Validate that the private bundle cannot be fetched with meaningful usable key permissions by anonymous/pending/revoked accounts.
- [ ] Document key-revocation limitation: anyone who retained an earlier raw key *and* matching ciphertext may be able to decrypt that historical copy; rotate key/re-encrypt after high-risk revocations and do not assume logout invalidates previously copied material.
- [ ] Independent result reported **without exposing secrets**; confirm key is present only in proper private storage and release artifacts carry encrypted data only.

**Gate B exit:** Fudgie witnessed ceremony + verified parity/role security + ready rollback. **Not started**.

## Gate C — rules, timing and owner sign-off
Owners: Cherish tests rules; Clara tests UI; Fudgie decides deployment
- [ ] Verify current production Firestore v4 rules match tested source; recheck documented five NOT_TESTED time/race/security-emulator boundary cases. Test denied reads/writes for unauthenticated, pending, revoked, and forged `registrationPath:"pin"` clients; remember `registrationPath` is client-supplied, not cryptographic PIN proof.
- [ ] Confirm active migration setting `/config/migration` and **Nov 1 server-side PIN registration cutoff** behavior; a client UI message alone is insufficient. Confirm the planned treatment of existing PIN dashboard access and individual login at cutoff. Rehearse rollback if Firebase/rules fail.
- [ ] Confirm HTTPS custom domain, cache-busted JS/CSS/HTML, correct icon and Admin shortcut, visible Feedback button and responsive Samsung/mobile navigation without accidental public Admin link.
- [ ] Record exact files, commit, data version, known limitations, rollback steps, and authorized release window. Obtain Fudgie's **independent final GO** before changing GitHub main, public Admin navigation, or Firebase production endpoints.
- [ ] After GO, validate actual production Owner/staff sign-in, PIN while still permitted, Firebase roles, private dashboard counts, denial/revoke, sign-out, feedback, and emergency rollback route. Do not claim release complete before these checks.

## Ownership / next handoff
**Clara:** complete Gate A, prepare comparison of staging `admin.html` and live baseline, provide release-ready commit/diff and QA results in Admin hub. No public commits.  
**Cherish:** key ceremony/migration remains **parked** until Fudgie GO; continue backup upkeep, do not publish anything under hold.  
**Fudgie:** nothing needed now; separate approvals only at Gate B and Gate C.

**Current verdict: Gate A IN PROGRESS; Gate B NOT STARTED; Gate C NOT AUTHORIZED.**
