# Cherish: daily on-demand drop / paw marker — STAGING ONLY

## Behavior
- A day is DARK until Cherish manually activates it; no daily code deployment.
- Cherish visits `/cherish-drop.html` and enters the privately provisioned `WORD_HUNT_DROP_TOKEN`. The token is never bundled, logged, stored in the browser, or exposed to public HTML.
- `POST /api/word-hunt/flip` creates a single immutable private Blob record for the configured **current America/Chicago calendar day**, daytime 08:00–20:59 CT only; a second flip returns already-live and **cannot reset the bonus clock**.
- Glass, riddle, checker, and `GET /api/word-hunt/mark?path=...` all read this same authoritative record; entry timestamp and +5 bonus clock start at the server's recorded activation instant.
- The marker response exposes only the marker ID **on the configured page, when live**; no answer, future pages, or other-day markers. Page markup must already contain exactly one `<span data-word-hunt-marker="opaque-day-marker">normal visible word</span>` placed during an owner-approved launch build. No daily push is needed.
- Include `<link rel="stylesheet" href="/paw-auto.css">` and `<script src="/paw-auto.js" defer></script>` on each of the four approved pages during the launch build. Paw design is a transparent, faint SVG overlay on letters, no square/background or highlight. No live word is edited in this staging branch.
- Midnight CT makes the old day's record ineligible instantly on subsequent status/mark/check requests; the polling script clears the paw without a push (up to 5 seconds in a visible tab, immediately when refocused).
- Next day's flip only works on that day and must pass token verification. Fudgie approves code release ONCE; daily operational flips are Cherish's authorized action, not Git pushes.

## Security & launch gates
- The public GitHub repo has older commits with the 16 names. Private config is required; old history requires remediation separately.
- In Vercel, set `WORD_HUNT_DROP_TOKEN` to a **unique >=40 character random secret**, restricted to the intended environment, via Vercel project secrets; share it with Cherish through a secure channel, never in GitHub or an unprotected note.
- Set `WORD_HUNT_CONFIG_JSON` privately to all four dates Oct 27–30, each with word, riddle, authorized public path and unique marker ID, plus the full 16-person roster. `manualDrop:true`; NO `dropAtUTC` is needed.
- Real intake remains gated on `VERCEL_ENV=production`, `WORD_HUNT_ENABLE_REAL=true`, `testOnly:false` and validation. The isolated preview project uses the test word `lantern`, `/paw-demo.html` and a **new** manual-only dummy contest ID.
- A valid token is powerful: the operator page is not a full identity service. Require a strong token in a password manager, deploy behind an access policy where practical, and rate-limit at the edge before public prize launch.
- Private admin identities do not guarantee a person can't enter under an alias. Cherish must verify winner eligibility, abuse protection, drawing workflow and data retention. **No launch or flyer publication authorized.**

## Staging verification
- Visit `/paw-demo.html` before flip: two plain normal-text words and dark glass; no paw.
- Visit `/cherish-drop.html`, enter only the isolated **preview** token, click Flip Today (08:00–20:59 CT).
- Within five seconds: glass lit on final candidate homepage, clue visible on riddle page, only the tagged `lantern` has faint paw, first-hour entry gets six chances. Second flip returns already-live.
- Simulated midnight and DST checks use `npm test`; real-world midnight is not accelerated on the preview deployment.

## Staging visual replay
At `/paw-simulation.html` click **Simulate server flip** then **Simulate midnight Central**. This confirms the exact paw overlay and glass state without waiting overnight; it is labeled **visual simulation**, does not write Blob or override the server. Use `/paw-demo.html` and `/cherish-drop.html` for the actual private server-status pathway once the preview-only operator token is configured.
