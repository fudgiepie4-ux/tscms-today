# Word Hunt Dynamic Paw V2 — REVIEW ONLY, NEVER MAIN

This folder is staged for the isolated backend deployment. No server launch is authorized.

- Public site pages must start as their actual unchanged live paragraph text, with only the common CSS and JS includes; **no initial data-word-hunt-marker, runtime spans, or word identifiers**.
- Private Vercel `WORD_HUNT_CONFIG_JSON` must contain all four approved Oct 27–30 Central days, approved riddles, correct answers, complete 16-person exclusion roster, and the four `target` objects. Each `target` requires `path`, opaque `marker`, and **`word`**, where the word is the exact visible, case-sensitive, single text-node word. Never commit real values.
- GET /api/word-hunt/mark returns exactly `{"active":false}` when off, outside the current drop, or querying any other page. Only during a verified flip for that day's target path may it return `{"active":true,"marker":"...","word":"...","contestDateCT":"YYYY-MM-DD"}`.
- Frontend scans visible paragraph text (not script contents or image captions), with Unicode-aware whole-word boundaries. One unique match is mandatory. Repeated polls cannot double wrap; delayed journal render is handled by MutationObserver. Wrong-day response rejected by client's Central day check.
- Central-midnight timer and an inactive status clear unwrap the generated span into a normal text node. API/network errors also fail closed and unwrap.
- The entry checker, bonus time, account exclusions, glass indicator and GoatCounter remain unchanged from approved candidate.
- Runtime wrapper style is a faint, transparent overlay that leaves text readable and adds no background square.
- V1 fallback branch: `clara/word-hunt-production-approval-20261026` (commit `99c8b5793584e8f3cda63adfa31486028e4514c3`). Do not merge either branch. The fallback requires Fudgie's explicit acceptance of its source-inspection risk.
- Production launch flag stays OFF. Do not put a real contest token or actual words in public source or logs.
- Review note: anyone can read an active-day response for its path after authorized activation; before activation no word is exposed.
