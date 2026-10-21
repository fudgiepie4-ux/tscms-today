# TSCMS Admin data migration inventory — staging audit, October 19, 2026

**READ-ONLY findings.** Based on GitHub `main` source `mc.js` and `admin.html` as inspected today. The ciphertext `admin-data.enc.json` was NOT decrypted; no password was accessed, requested or stored. No production Firebase or website changes are approved.

## Existing protected data and UI consumers
| Existing source | Observed `mc.js` use | Preserve during migration |
|---|---|---|
| `d.stats` | Nonempty data sanity check in `unlockAdmin()` | Source inventory + validation; inspect contents via trusted local decrypt; never assume unused or discard without verifying |
| `d.danger || []` | Passed to `zi(d.danger, d.generated)` | Entire eligible no-comment pool, post URL, author, tier, wait hours, generated timestamp |
| `d.flags || []` | Passed to `ziIssues(d.flags)` | Evidence-first moderation flags with author, calendar day, evidence and all linked timestamped posts |
| `d.generated` | Queue snapshot timestamp shown in CT | Last-refresh transparency; preserve with each snapshot |

Other keys MAY exist inside the ciphertext beyond those referenced in the current JS. Cherish or an authorized Admin must enumerate **all** top-level decrypted keys securely before choosing Firestore collection mapping. `admin-data.enc.json` exposes only `salt`, `iv`, `iter`, and `ct` in publicly hosted encrypted payload; these metadata keys cannot establish the internal content.

## Behavior that MUST NOT break
1. **Danger Zone**: render five oldest/no-comment posts by default; toggle to ten; sort by greatest `wait_h`; checkboxes mark handled entries **session-only** in `sessionStorage['dz_done']`; checked entries remain until `Refresh Queue`; refresh fills next oldest. These checked states are **not** permanent backend deletions. Count and last-pull time reflect the source snapshot, and source pool remains independent of public SONGS BY DAY music filtering.
2. **Facebook OPEN POST**: clicking a Danger Zone row must reach the exact original Facebook post, even if no Suno URL/playback exists. The UI uses the source post permalink ID with group URL `https://facebook.com/groups/1410002804113962/permalink/`.
3. **Moderation**: flags carry `all_posts` (or legacy fallback `url`, `ts`, `excerpt`), `author`, `calendar_day`, `evidence`; dates render in CT. Preserve every underlying timestamp/link, no automated sanctions. Current HTML contains `#mc-issues{display:none!important}` (module intentionally hidden); do not automatically re-enable as part of migration.
4. **Admin gate**: currently, `mc.js unlockAdmin()` fetches the public encrypted file, derives AES-GCM key from the shared password, decrypts, then shows `#adminbody`. New design must **not** keep this decrypt path as an alternative authorization method. Add Firebase Auth + explicit Owner/approved Admin role + verified-email check for protected reads, and protect data through Firestore rules.
5. **Other UI features**: `mc.js` also handles sign-on intro video, studio banner/video, text sizing, Danger Zone and Dicey-linked structures. Do not remove or unconditionally enable those features. Keep the public homepage, Solitaire, Dicey public widget, jukebox/radio, and Feedback independent.
6. **No false migration success**: a visually successful Firebase login says NOTHING about whether Danger Zone or moderation data was fully migrated.

## Proposed safe target architecture — not yet approved
- Restrict `/dangerZone/{postId}`, `/moderation/{flagId}`, and snapshot metadata reads to verified accounts with `status:'approved'` plus `admin:true` or `owner:true`. Do not allow public/anonymous/pending/revoked users to read or list them.
- Initially allow protected dataset writes only via trusted authorized import/update workflow, **not arbitrary client UI writes**. Ownership approvals and data-pipeline writes are separate permissions.
- Preserve original `url`, `wait_h`, `author`, `tier`, `generated`, flag evidence, timestamps and reference ordering. Design for 6-hour source refresh/atomic snapshot version, not stale per-row overwrites.
- Keep a private, independently verified backup before cutover. Count and compare every record and field. Temporarily test staging rendering against migrated data as an approved user and confirm denial as anonymous, pending, ordinary revoked and unverified users.
- Do not delete `admin-data.enc.json` until verified migration and explicit Fudgie approval. Old Git commits and prior downloads cannot be revoked by deleting current branch file. Do not post decrypted sensitive content to public GitHub, Slack, or chat.

## Acceptance checklist for the eventual cutover
- [ ] Enumerate actual decrypted top-level keys, counts and checksum in secure environment, no plaintext publicly posted.
- [ ] Owner Firebase Auth sign-in and verified email works; Owner `/users/{uid}` record recognized by tested rules.
- [ ] Full Firestore rules pass Emulator test suite with secure signup and atomic username reservation.
- [ ] Dataset import preserves all records and crucial properties (`danger`, `flags`, `stats`, `generated` plus any other keys).
- [ ] Admin Danger Zone visible pool/count/5-10 toggle/checked-refresh semantics and original FB links match before and after.
- [ ] Moderation evidence/links match; module remains in its currently intended visibility state.
- [ ] Public homepage/gamehouse/radio unaffected.
- [ ] Anonymous/pending/rejected/revoked/unverified reads denied by Firestore itself.
- [ ] Rollback can restore functional old site for a defined period without silently reopening old shared-password access.
- [ ] Only after explicit Owner approval: retire live old gate and legacy public encrypted bundle, audit public Git history exposure, monitor auth/access regression.

**Next dependency:** Cherish has posted v3 *summary*, but not the complete exact rules code or executable tests as of this audit. Cannot approve or claim passing tests based on summary alone.
