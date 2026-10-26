# TSCMS $30 Word Hunt — frontend/back-end handoff, 4 days

**Scope split:** Clara builds only the homepage indicator, riddle/entry page and checker FRONT END. Cherish owns daily words, clues, surprise drops, backend verification, persistence, first-hour bonus tally, admin filtering, live QA and drawing. Fudgie approves all shipping and hidden-word style.

## REQUIRED public status endpoint
`GET /api/word-hunt/status` JSON, `Cache-Control: no-store`.

- Before random drop: `{ "state":"not-yet" }`. Do not disclose a scheduled future drop, answer, or hidden-word location.
- During drop-to-midnight Central: `{ "state":"live", "contestDateCT":"YYYY-MM-DD", "riddle":"REAL location-or-topic clue that points to a public page" }`.
- After the 00:00 America/Chicago rollover: `{ "state":"closed" }` or next day `{ "state":"not-yet" }`.
- After day four: `{ "state":"complete" }`.
- Never put actual answer or private admin names in JSON, HTML, JS, headers, or source maps.

## REQUIRED private checker endpoint
`POST /api/word-hunt/check` JSON body:
`{ "word":"normalized guess", "name":"trimmed name", "email":"name@example.com", "contestDateCT":"YYYY-MM-DD", "clientSubmittedAtUTC":"ISO-8601 (diagnostic ONLY)" }`.

- Backend verifies day/window in **America/Chicago**. It is the authority for **random drop** and midnight closure across DST.
- Match guessed word privately after NFKC, lowercase, trim and collapse repeated whitespace; never reveal answer.
- On bad guess return `{ "result":"incorrect" }` and allow retries; no answer leaks through HTTP body/status/timing details.
- On accepted correct guess: persist name, email, contest day, entry id, server received/accepted exact UTC timestamp (with milliseconds) and source. Return `{ "result":"correct", "recorded":true, "acceptedAtUTC":"2026-10-26T15:08:42.314Z" }` **only after persistence succeeds**.
- On closed day: `{ "result":"closed" }`; if one correct entry/day/email is the final rule, enforce it server-side and return `{ "result":"duplicate" }` on re-entry.
- The client NEVER determines or awards first-hour bonuses. Cherish computes them from server timestamps and server drop time; 5 bonus entries are added in the verified tally. Document interpretation: one valid entry + five bonus entries (six total chances) unless Fudgie decides otherwise.
- Do not trust `clientSubmittedAtUTC`, `contestDateCT`, a browser clock, or a browser-reported word-hunt state for prize eligibility.
- Rate-limit guesses/anti-spam, validation, privacy, minimal retention, email protection, abuse monitoring and safe database permissions need production review. HTTPS required.

## Four-day release gate
- Fudgie supplies/approves exact four dates and word style; they are *not* baked into the client.
- Every daily word lives on a **public** site page. Hidden styling unresolved; do NOT hard-code highlighting. Riddle must point generally toward the public page/topic.
- Admin filtering handled by Cherish via private name list; not browser JS.
- Swiper mischief is a game storyline, **not a real breach**.
- Before Fudgie's production approval, demonstrate: lit/dark desktop + 390px phone; riddle changes at drop; wrong/retry/case/space normalization; backend UTC stamped success; no words/answers exposed; 23:59:59 Central accept vs 00:00:00 reject; daylight-saving handling; first-hour 5 bonus reconciliation; submit failures don't claim success; count of homepage songs and controls unchanged.
