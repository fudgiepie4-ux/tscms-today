# TSCMS Admin — OWNER-LOCKED Phase 1 + Phase 2 (2026-10-20)
Status: Owner-approved design. Documentation only; no production deployment authorized.

## Nonnegotiable timing
- Through October 31, 2026, the existing shared PIN continues unlocking the current Admin Control Room exactly as before, even if a new personal account is pending.
- After PIN unlock, prompt administrators to register their personal account. Approved individual email/password login coexists with the PIN during transition.
- November 1, 2026 at 00:00 Central: shared PIN stops granting live Admin access. Personal approved accounts only.
- Website PIN retirement is a separate switch from Firestore v4 PIN-registration deadline. Both must be tested.
- Preserve the old PIN and encryption bundle until properly tested re-key migration. Preserve all Danger Zone, stats, and moderation functionality; do not introduce paid Firebase requirements without approval.

## Phase 1 FIRST — PIN registration and owner approval
- Successful shared PIN entry continues to allow existing Admin access, with a popup offering personal account registration.
- Gather real full name, private email, chosen display username, personal password. Firebase creates a separate internal UID.
- New account starts PENDING, without personal Admin access. Firebase email verification is required.
- Fudgie reviews the request, personally verifies who the registrant is, and explicitly approves; target within 24 hours when feasible.
- When approved and email-verified, personal Admin login activates. Pending people can still use the shared PIN through October 31.
- Owner-only checklist tracks needs setup / pending / approved. Activation updates the checklist automatically.
- Implement using already-deployed v4 rules and test first; Phase 2 must not block Phase 1.

## Phase 2 AFTER Phase 1 — secure preapproved email invitations (Route A)
- Fudgie personally verifies staff identity and obtains their email BEFORE issuing a personalized invitation.
- Issuing a specific invitation is Fudgie's approval; recipient creates account via invitation, verifies control of that invited email, and gains active Admin login WITHOUT requiring a second Owner approval tap.
- Invitation must be unguessable, single-use, time-limited, bound to intended email, checked server-side, with atomic redemption and approval. Wrong email / expired / replayed invitation must fail.
- Firebase internal UID differs from invitation token and display username. Display usernames can be public in the future; private email stays private.
- Phase 2 needs proposed v5 rules and full testing, including Phase 1 regression tests. Owner approval required before deployment; do not silently fall back to Route B as the permanent solution.
- Invitations must work after the November 1 PIN cutoff.

## Notices and checklist
- Owner-only staff roster includes names such as Casey, Jane, Rachel and statuses Needs Setup / Invitation Sent / Pending / Approved or Ready. A confirmed activated account leaves Needs Setup.
- Firebase verification mail is built-in; new-account alerts and approval notifications/acceptance emails require separately verified implementation. Until then the Owner dashboard is the notification queue, and no claim of automatic notification is permitted.

## Change control
- Owner vision is authoritative. Clara and Cherish hold each other to this plan.
- No quiet redesign, no moved dates, no merging phases or substituting workflow, no live code/Firebase changes, and no extra work assigned without owner permission.
- If a genuine technical obstacle arises, explain precisely, propose smallest necessary correction, wait for Fudgie's explicit approval.
- Cherish to incorporate this decision in shared migration arrangement; Clara handles staged website build. This file is record only.