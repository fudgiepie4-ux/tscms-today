# Word Hunt backend — STAGING ONLY

This app extends Clara's exact owner-review HTML (2026-10-26), not the live homepage. Deploy only this directory into the isolated `tscms-word-hunt-owner-review-20261026` Vercel project. Do not merge it into a static public site or deploy the repository root. Vercel's `public` directory is the only static output; `lib` stays server-side.

## Implemented
- GET `/api/word-hunt/status`: server-authoritative `not-yet`, `live`, or `complete`; live responses contain only the day and clue. No future drop time, answer, admin list, contact details, or entry list is returned.
- POST `/api/word-hunt/check`: normalized case/whitespace; server-received timestamp; America/Chicago date and offset including milliseconds; 1 base + 5 bonus strictly before drop + 1 hour; closes exactly at the next Central midnight.
- One correct entry/day/normalized email (existing frontend contract). Wrong guesses are retryable and create no entry. Email or name matches against the private admin roster are rejected before writing.
- A private Blob record per entry with deterministic day/email-hash path; no overwrite. Confirmation requires an uncached independent readback. Names, email and correct word remain private.
- Homepage defaults to API polling every five seconds. Review-only switch is visual and does not change the server's status or eligibility. Existing root `word-hunt-home.js` already has no switch.
- Fixed the reviewed riddle page's invalid Intl dateStyle/timeZoneName combination, which would otherwise prevent displaying a saved timestamp.

## Staging fixture
The isolated preview environment seeds a four-day DUMMY schedule once in private storage. Its first drop occurs 30 seconds after initial status access. The remaining dummy days drop at noon Central. The test answer is `lantern`; use names of dummy entrants and addresses ending in `@example.invalid`. `Test Admin` and `admin@example.invalid` are excluded. This is not a real prize draw. The fixture requires both the exact isolated project ID and a preview environment. Reloading/redeploying does not reset its saved schedule.

## Before any launch (not performed)
Supply `WORD_HUNT_CONFIG_JSON` privately in the contest service environment. Do not put it in public JavaScript, HTML, source maps, or Git. Shape:

```json
{"id":"unique-contest-id","testOnly":false,"rosterConfirmed":true,"adminNames":["complete approved list"],"adminEmails":["complete approved list"],"days":[{"dateCT":"YYYY-MM-DD","dropAtUTC":"ISO timestamp","answer":"private word","riddle":"approved clue"}]}
```

`days` must contain exactly four distinct, chronologically ordered Central dates. The four real dates, unannounced daytime drop times, have NOT been supplied or guessed. All 16 excluded names MUST be provided exclusively through private server environment configuration at launch; source contains no real roster. Preview uses synthetic exclusions independent of login status. Cherish retains words, riddles, page sentences, announcements, verification and the drawing. Clara owns this storage/status service. The user's 2026-10-26 scope supersedes the earlier Cherish-backend assignment in CHERISH-INTEGRATION-CONTRACT.md.

Production needs an approved identity/eligibility check: a name/email exclusion list cannot detect an admin using a different identity. Cherish's final verification remains necessary. Staging does not send email or establish verified email ownership. Add durable abuse controls and review retention before a public contest. Do not open real intake until these gates and Fudgie's approval are complete.

No public entry listing/export or administrative mutation endpoint is exposed. Records can be reviewed via the connected private Vercel storage; a protected drawing export can be added when its intended authentication is specified. No drawing was implemented.

## Test
`npm ci --ignore-scripts && npm test`

28 tests cover schedule validation, automatic state, normalization, saved/read-back server times, incorrect retries, first-hour cutoff, midnight, admin exclusions, concurrent duplicate submissions, persistence failures, dummy-only intake and both DST transitions.

## Mandatory exclusion loading
All 16 owner-supplied names must be passed in the private environment configuration for real entries. Validation refuses eight-only rosters. Matching ignores case, extra whitespace, accent marks, and punctuation differences. Ineligible submissions receive zero chances and do not reach storage. No personal-login lookup is used. Drawing filters must receive the same private config. The previous public Git commit has historical names; removing them from HEAD does not erase history.

## Final candidate (staged)
Review root `/` retains its visual switch. Automatic-only candidate `/final-candidate/` has NO toggle and opens `/final-candidate/word-hunt.html`. Real configuration remains disabled until private launch flag and confirmed production environment. See `docs/FINAL-CANDIDATE-HANDOFF.md`.
