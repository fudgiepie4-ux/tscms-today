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

## Review of Cherish's October 19 #junk-drawer handoff — BLOCKERS CONFIRMED
Source: https://fudgiepieaigang.slack.com/archives/C0C924D7589/p1792452587502709

**Status: NOT ready for any production Admin login deployment.** These points follow directly from the exact rules reported by Cherish; deployed-rule state has not been independently read from Firebase Console.

1. **Pending registrations cannot be stored.** Current `match /users/{uid} {allow write: if false;}` rejects every client-side create and update. Firebase Auth account creation may succeed, but the user's registration profile will not be saved. Design tightly scoped authenticated `create` that enforces `uid == request.auth.uid`, only permitted fields, pending status, `admin == false`, `owner == false` (or role fields absent), authenticated email match, and immutable privilege fields; alternatively use a trusted server-side registration endpoint. No general client-side writes to role documents.
2. **Owner approval dashboard cannot list requests.** `allow list: if false` blocks all queries for `/users`. Design Owner-only list/approve/reject with exact authorization, or a dedicated requests collection with strict immutable/privilege-free signup writes and owner-only approval. Console-only approval is a valid temporary manual fallback but **not** the promised in-website owner dashboard.
3. **Owner is not provisioned.** Need authenticated Owner identity with email verified, plus a trusted out-of-band initial `/users/{uid}` record granting `owner:true, admin:true, status:approved`. Confirm login and deny owner privilege changes by other users. Client-only controls are insufficient.
4. **Email verification is not enforced.** Build verification email flow and server-rule protection requiring verified email for Admin reads (e.g. checking `request.auth.token.email_verified == true` where appropriate), then test both unverified/verified token states. UI checks alone are insufficient.
5. **Legacy encrypted bundle cannot be protected by merely changing the gate.** Public GitHub Pages continues to serve `admin-data.enc.json`. Anyone possessing the old password can download and decrypt it without Firebase role authorization, now or after November 1, even if the new website UI refuses them. Plan to migrate sensitive records to Firestore with enforced rules or an authenticated storage backend, then remove/rotate legacy public bundle and retire old decrypt route. Files already downloaded cannot be revoked. All current content must be accounted for before removal.
6. **Nov 1 PIN cutoff must be implemented without trusting the browser date or only hiding a button.** Owner-approved Firebase identities, not the PIN, should be the sole route to protected data. If there is any privileged registration path predicated on the PIN, its eligibility and cutoff must be enforced server-side; old PIN cannot be relied upon once shared. A PIN-only screen may be used as an informational transition funnel but must not grant a permission.
7. **Username login is unimplemented.** Native Firebase email/password supports email identity, not username-to-email lookup. Do not expose private email in publicly readable username mappings. A trusted backend (or an owner-approved email sign-in compromise with username as private profile/public nickname) is required. Agree on cost and UX before implementing this functionality.
8. **Cost caution:** Firebase Cloud Functions requires Blaze/pay-as-you-go (source https://firebase.google.com/docs/functions/quotas); project reportedly Spark/free. Do not enable billing without owner approval. Firestore rule-only owner authorization can support a carefully designed free-tier workflow if verified.
9. **No tests have been run.** Execute Cherish's 10 rule tests PLUS: signup create only pending (allowed), privilege injection rejected, email mismatch rejected, self-update to approved/owner denied, owner list/approve allowed, non-owner list/approve denied, unverified approved user denied, old PIN after cutoff yields no protected data, and Firefox/Brave phone end-to-end sign-in and logout. The Emulator Suite can run automated tests (https://firebase.google.com/docs/rules/unit-tests), but production deployment requires careful scoped verification too.

Priority: (A) bootstrap Owner privately and test safe read/deny, (B) design safe signup writes and Owner-only approval, (C) migrate protected Admin data out of publicly fetchable bundle, (D) complete email verification and username-login strategy, (E) regression/security testing and explicit owner approval, (F) switch over before Nov 1. No production merges based solely on a visual preview.

## OWNER CONFIRMED DECISION — 2026-10-19
Fudgie clarified that **email + password has always been acceptable for login.** Their request for a personal username concerns **display names / future public-facing member and multiplayer Gamehouse names**, not username/password sign-in. Therefore:
- **Admin login: email address + password (native Firebase Auth).** No username→email lookup, Cloud Functions, or Blaze billing needed for username authentication.
- **Signup:** full legal name, verified private email, display username, password and confirmation; Owner approval required for Admin privileges.
- **Privacy:** show the chosen display username where appropriate, not the email address. Do not publish admin real names or emails on game profiles. For multiplayer, support a separate public game nickname if desired.
- Update UI labels accordingly. All existing migration, data-security, PIN cutoff, and testing blockers remain in force. **This clarification is not permission to deploy.**
