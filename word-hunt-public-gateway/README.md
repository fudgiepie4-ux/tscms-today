# TSCMS Word Hunt — public gateway (REVIEW ONLY)

**Do not deploy or promote without Fudgie's explicit approval.** This is an independent Vercel project root, not the main TSCMS site and not the existing protected backend.

- Public: `GET /api/word-hunt/status`, `GET /api/word-hunt/mark?path=/some-page.html`, `POST /api/word-hunt/check` and their `OPTIONS` preflights.
- No flip route exists. Every route maps to a fixed upstream path, not a user-controlled proxy URL.
- Existing backend stays Vercel-Authentication protected. The gateway alone uses a server-side `WORD_HUNT_UPSTREAM_BYPASS_SECRET` to reach the protected backend, never exposed in browser JavaScript.
- In the **new independent gateway project only**, securely provision a Vercel protection bypass token. It must be provisioned by an owner directly in Vercel; it is **not** the flip token and must not appear in this repository or chat. No environment values were changed while preparing this branch.
- CORS allows exactly `https://tscmsradio.com`; disallowed browser origins fail with 403. Origin is not an authentication mechanism: check remains a public contest entry endpoint, with upstream storage and validation enforcement.
- Disable Vercel Authentication **only on the new gateway project** during a separate approved launch, not on the upstream backend.
- Do not point live clients at a non-existent gateway hostname. Stage browser code reads an injected `window.TSCMS_WORD_HUNT_GATEWAY_ORIGIN` set only to the owner's verified gateway URL after provisioning.
- Test with dummy data against a dummy upstream; never call real `flip` or submit real contest entries.

### Launch gates (not performed)
1. Owner approves hostname, project, and server-side bypass provisioning.
2. Dedicated gateway deployed/tested with Vercel Authentication OFF on the gateway only.
3. Exact allowed `Origin`, preflights, unavailable-path failure, rate limits, end-to-end backend path and no `flip` route verified.
4. Owner approves browser configuration and separate GitHub Pages/main release.

**Status:** staged source only; no project or publicly reachable gateway URL has been created.
