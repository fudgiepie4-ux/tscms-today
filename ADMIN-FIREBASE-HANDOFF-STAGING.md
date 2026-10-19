# TSCMS Admin Firebase migration — staging handoff (2026-10-19)

## Status
- Preview page only. No live website files modified and no accounts created.
- Firebase web configuration is in `firebase-admin-config.js` (public client identifiers, not server secrets).
- Owner: Fudgie. Firebase project: `tscms-admin`. Existing domain: `tscmsradio.com`.
- Owner account is not yet reported created or tested.

## Nonnegotiable behavior
- Until **2026-11-01 (America/Chicago)**, two sign-in paths: existing PIN for migration initiation and new personal credentials.
- PIN does not confer an approved role. Full legal name, email, selected username and password are required on signup. Email confirmation and owner approval must both succeed.
- After 2026-10-31, old PIN credential must stop authorizing anything, including registration. Never remove only the visual PIN field while leaving backend permission active.
- Pending, rejected, unverified and revoked accounts must never read private Admin data. Owner controls approvals and removals; ordinary admins cannot change Owner permissions or assign their own roles.
- Regular Gamehouse users later choose public nicknames, never expose emails as player names; separate from admin privileges.

## Security blockers before real integration
1. Obtain and independently review Cherish's **deployed Firestore rules and collection schema**, with proof of tests denying unapproved, anonymous and self-promoted users. A simple logged-in check is not enough. Owner record must be provisioned through trusted privileged administration.
2. Firebase Auth natively signs in with **email/password**, not username/password. Username login requires a protected lookup service; do not publish a username→email mapping in publicly readable Firestore. Decide/test this before promising username login. Until then, email/password may be an interim option only if Fudgie approves.
3. The current `admin-data.enc.json` is encrypted using the OLD SHARED PASSWORD. A Firebase login doesn't decrypt it. Plan a secure Firestore/Storage migration with access rules, migrate verified data, remove/rekey the obsolete public encrypted bundle and disable legacy decrypt path. Prior downloads encrypted with old password cannot be remotely revoked.
4. Migration PIN validation, registration eligibility, owner approval transitions and time cutoff must be enforced through a trusted backend or verified Security Rules, not client-only JavaScript. Consider hosting/cost constraints before using paid Cloud Functions.
5. Verify full name/email handling is private, email verification works, usernames are unique, accounts can't self-approve, restore works, and Owner remains able to recover access.
6. Verify Firebase web API key is restricted to Firebase APIs, per official Google guidance. No service account, private key or password should be checked into this public repo.
7. Existing team reportedly ~10 staff; registration tally and duplicates are **review signals**, not proof of unauthorized access.

## Staging notes
- Preview page `admin-auth-preview.html` is **not wired to the live Admin route**; account buttons deliberately do nothing until the rules and migration are reviewed.
- `admin.html`, `mc.js`, `admin-data.enc.json` and `index.html` must remain untouched until owner approval and end-to-end testing.
- Owner acceptance order: owner sign-in → verification/approval → denial tests → legacy cutoff → data migration → UI go-live. Do not merge this branch as a functional login system.
