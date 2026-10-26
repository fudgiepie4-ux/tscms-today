# Word Hunt — final-build candidate — STAGING ONLY

Owner tester: `/` retains the review ON/OFF switch and is **untouched**.
Automatic-only candidate: `/final-candidate/` uses exactly the same full approved homepage visual, minus the switch. A lit glass links to `/final-candidate/word-hunt.html`. Dark/complete glass is not a link. API outage fails dark.
Candidate entry/riddle page: `/final-candidate/word-hunt.html` keeps the approved parchment, title "$30 Giveaway Word Hunt", no shop or cart. Paw prints remain design decoration only; no live hidden words were touched.
One server endpoint `/api/word-hunt/status` rotates one riddle a day by `America/Chicago` date and server drop time; changing each day requires no frontend rebuild.
The launch dates are Oct 27–30, 2026 Central. Four real words, UTC drop timestamps, approved riddles and all **16** excluded names must be supplied by Cherish in a private `WORD_HUNT_CONFIG_JSON` secret. Never commit its real values, use a client env variable, or place them in public assets.
Preview on the isolated review project accepts dummy identities/data only. Real config is gated on `VERCEL_ENV=production`, `WORD_HUNT_ENABLE_REAL=true`, and a validated live `WORD_HUNT_CONFIG_JSON`; otherwise the backend fails closed outside the isolated dummy preview.
Do not activate the real flag until Fudgie explicitly approves and Cherish confirms the full word order, riddle copy, timestamps, admin roster, storage, entry abuse limits, retention, and drawing/identity verification.
**Important:** the original public repo commit included real excluded names in source and tests. The current tree now omits them, but history remains visible; rewriting history or migrating must be handled separately before claiming historical privacy.
No live deployment, no flyer posting, no production branch changes.
