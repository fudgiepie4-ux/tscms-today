# Word Hunt — Dynamic Paw V2 (Staged)

**No changes to tscmsradio.com, production main, or the pre-existing static fallback.**

This folder is the isolated server candidate. It fails closed if VERCEL_ENV is not production or WORD_HUNT_ENABLE_REAL is not exactly true. The live launch flag is OFF and the private WORD_HUNT_CONFIG_JSON has not been supplied.

The four public pages on the approval branch contain unchanged visible text with CSS/JS links, but no static markers. At runtime, GET /api/word-hunt/mark returns active:false when disabled, outside today's window, or for the wrong page. On the currently activated target page only it may return active:true, marker, word and contestDateCT, read from private config; the client wraps the unique visible word. No static clues, answers, riddles, or real excluded names appear in this folder.

The new client uses an observer to survive journal re-rendering, fails closed on zero or multiple visible paragraph matches, and removes the wrapper after inactivity or Central midnight. Correct guesses, server timestamps, bonus chance logic, and admin exclusions are unchanged.

Run npm ci --ignore-scripts && npm test; test/paw-v2.test.js includes API, timing, protected flip, fake DOM and re-render checks. All values in unit tests are synthetic.

Production release remains blocked until Fudgie's explicit final go-live tap and verification of real private configuration. The static fallback is the untouched branch clara/word-hunt-production-approval-20261026 and requires explicit acceptance of its source-inspection risk.
