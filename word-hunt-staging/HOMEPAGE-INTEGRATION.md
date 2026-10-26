# Homepage integration — STAGE ONLY — DO NOT PUSH LIVE

**Important:** The full homepage is generated and currently has safeguards against losing songs. Do **not** replace `index.html` with any October 25 Google Drive partial handoff. The build is additive, only, on a fresh reconciled copy of whichever homepage Fudgie authorizes.

Add the following two tags once to the existing homepage (the `<head>` and the body closing script group). The JS locates the existing `.wrap header`, adds the small indicator *inside that existing header after all its current content*, and does not remove or replace any songs, search, Quick Jump, radio, links, or admin areas:

```html
<!-- in <head> -->
<link rel="stylesheet" href="./word-hunt.css">
<!-- after existing defer script includes, before </body> -->
<script src="./word-hunt-core.js" defer></script>
<script src="./word-hunt-home.js" defer></script>
```

New files to stage beside `index.html`:
- `word-hunt.html`, `word-hunt.css`, `word-hunt-core.js`, `word-hunt-home.js`, `word-hunt.js`
- `assets/glass-lit.webp` and `assets/glass-dark.webp`

The corresponding status and checker API must exist at `./api/word-hunt/status` and `./api/word-hunt/check`. The homepage remains dark and disabled when the API is missing; it NEVER displays a false live light.

Entry form is one fixed public address, `/word-hunt.html`. Do not add a competing entry form in Quick Jump, Search, Town Journal, or other pages. Riddles change through the backend, not by rebuilding pages each day.

The approved original reference is saved byte-for-byte in the shared TSCMS Drive staging folder. The two lens assets are masked crops from that image, not replacement AI art. Keep source hash checks before production integration.
