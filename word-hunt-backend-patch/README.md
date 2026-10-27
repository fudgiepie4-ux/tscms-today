# Second-token backend patch — review only

This directory holds a patch for the separately deployed Word Hunt backend.
It is not a complete backend or a deployment root. The candidate browser branch
does not contain the backend's configuration, storage, or drop implementation.

Recovered baseline: Vercel deployment dpl_F5a5Lu5a3dBbGYm31grg2XFdk3DC.
Replace backend api/word-hunt/flip.js with this version and add lib/drop-auth.js
when the complete backend source is available. The other handler behavior is
unchanged. Do not deploy this directory.

Authorization accepts either WORD_HUNT_DROP_TOKEN or
WORD_HUNT_CHERISH_DROP_TOKEN independently. Configured values must be 40–256
characters using letters, digits, underscore or hyphen. Requests use the HTTPS
Authorization bearer header. Empty, missing, malformed and incorrect inputs
fail closed; comparison uses fixed-size SHA-256 digests and timingSafeEqual.
The existing primary token remains supported when the second variable is absent.

Run `npm test` and `npm run check` in this directory. Tests generate dummy
inputs in memory and never print or save them. They do not load environment
secrets, configuration, storage, or call the live flip endpoint.

No deployment, environment change, protection change, or live flip is authorized
by this patch. Public API access and the full private configuration schema remain
separate blocked work. Fudgie retains the final go-live decision.
