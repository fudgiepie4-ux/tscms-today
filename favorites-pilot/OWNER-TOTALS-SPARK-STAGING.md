# Favorites owner totals — Spark-only review gate (2026-10-28)

**Status: review branch only. Do not merge/deploy until Fudgie explicitly authorizes SHIP.** This does not enable Blaze, create a Cloud Function, alter Firestore rules, touch member favorites, or insert an aggregate document yet.

## Proposed behavior
- Every hour at minute 17 UTC, a GitHub Actions workflow on **main only** runs Node 22 + Firebase Admin SDK for project `tscms-admin`. GitHub scheduled tasks can run late.
- Read approved `users` profiles, count `users/{uid}/favorites` only when `admin === true` or `owner === true`. Firestore aggregation `count()` avoids downloading song documents.
- Write **exactly** `pilotAggregates/favorites` with three fields: numeric `totalHearts`, numeric `activeMembers` (members with >0 favorites), and ISO-UTC `countedAt`. Each run updates the one document; no per-person output, logs or collection.
- Owner-only `admin.html` widget checks approved owner status, then reads `pilotAggregates/favorites` directly using the existing read-only rules. A missing, invalid or denied document yields **no banner**, not an error.
- Old `getTeamFavoritesAggregate` callable source stays in history/staging but is never invoked, installed or deployed by this change.

## Owner-controlled secret (do NOT add until authorized rollout)
Add a repository **Actions secret** called `TSCMS_FAVORITES_SERVICE_ACCOUNT_JSON` containing the complete service-account JSON for Firebase project **tscms-admin**, never a plaintext file or git commit. Choose a **dedicated** service account with the least Firestore IAM role that permits user reads, index count queries and the one aggregate write (typically `roles/datastore.user`). **Important:** Google Cloud IAM does not provide a document-path-level restriction for an Admin SDK service account via Firestore Security Rules. The code writes only one path, but a leaked key with `roles/datastore.user` could access more of Firestore. Protect the secret; never grant Owner/Editor, avoid using an existing broad service-account key, and rotate if exposed.

The workflow does not use `pull_request_target`, does not run with the secret during PR tests, and has a `main` branch/repository guard. The public GitHub Pages site continues using main until explicit merge/release authorization.

## Verification for Cherish (NO real writes during review)
1. Review PR diff: only aggregate writer, owner-only reader, tests, workflow and docs. Confirm **no** Firebase Rules change, billing change, Cloud Function, exposed key or other site modifications.
2. Confirm membership predicate is strictly `status === 'approved' && (admin === true || owner === true)`, no duplicate counting of a dual-role member, zero favorites excluded from `activeMembers`.
3. Run `node scripts/test-favorites-staging.cjs` and `node scripts/test-favorites-aggregate.cjs` and syntax checks; verify no real Firestore credentials or network required.
4. Inspect missing/denied/invalid owner aggregate behavior: no Favorites totals banner whatsoever; signed-out and non-owner users cannot see it.
5. After **separate Fudgie SHIP authorization only**, add the GitHub secret, merge the PR, allow one scheduled/manual production run, and verify the owner banner against a controlled hand count; then check GitHub Actions run status and Spark quotas.

## Free-plan quota caution
The hourly query uses Firestore read/index-count operations plus **one document write per successful run** (about 24 writes/day). Reads depend on the number of approved users and favorites index entries. Firestore's Spark daily free limits still apply; monitor usage, especially if the team grows. Neither the tool nor the code can guarantee quota headroom before a real run.

## Test status
Offline mocked aggregate and validation tests pass locally. GitHub PR CI and live Firestore execution still require independent verification; there are intentionally **no live writes yet**.
