# Staging evidence — October 26, 2026

Preview: https://tscms-word-hunt-owner-review-20261026-ivmgaf4a2.vercel.app/
Deployment: dpl_CUWarhxy8HzzP3vsBDSkW5b7mT7J, READY, staging target.
Source: original supplied review-site HTML and staging-branch API contract. No root frontend rewrite.

## End-to-end browser test
- Homepage observed `AUTO: OFF` with a dark, non-clickable glass.
- Without clicking the switch, the same page changed to `AUTO: ON` with a clickable glass, after the server's scheduled test drop.
- Clicking that glass opened the staged riddle/entry page.
- Submitted `  LaNtErN  `, dummy name `Clara Staging Test`, dummy email `clara-stage-1@example.invalid`.
- Displayed: `Correct! Your entry was recorded at Oct 26, 2026, 6:32:57 AM CDT. 6 chances recorded (1 base + 5 bonus). STAGING TEST ONLY.`
- Screenshot captured and supplied with the test report in chat.

## Independent API test
Submitted a second dummy entry, including a deliberately false client timestamp of 1900-01-01. Response:

```json
{"result":"correct","recorded":true,"entryId":"362b2a53-11f7-4caa-9a2f-54398aa73f1a","acceptedAtUTC":"2026-10-26T11:33:09.000Z","acceptedAtCT":"2026-10-26T06:33:09.000-05:00","baseEntries":1,"bonusEntries":5,"totalEntries":6,"testOnly":true}
```

The handler returned this only after writing and independently reading the private record back with cache bypassed. Repeating the entry returned `duplicate`.

Other deployed results: wrong guess -> `incorrect`; admin email -> `ineligible`; normalized admin name -> `ineligible`; stale contest day -> `closed`; ordinary real-domain email -> `test-only`.

`/lib/config.js`, `/lib/storage.js`, `/package.json`, `/test/core.test.js` all returned 404 on the deployed site.

## Automated tests
11/11 passed. Coverage: four-day/roster validation, status boundary, normalization/server clock, wrong retry, bonus at 59:59.999 vs 60:00, midnight, admin email/name exclusions, 20 concurrent duplicate attempts in the storage-contract test, storage failure/readback failure, test-only contact restriction, DST spring/fall midnight.

## Limits
The actual contest schedule remains unconfigured. The full 16-name mandatory exclusion roster was supplied and implemented in the follow-up update below. The dummy fixture is not a live contest. Name/email matching does not establish identity or detect an admin using unlisted aliases; final eligibility verification is still Cherish's responsibility. Public-launch abuse controls, verified identity policy and data-retention policy remain launch gates. No drawing or production changes were performed. This preview is a new immutable deployment URL; the original supplied review URL retains its earlier build.

## Source handoff
The Claire54968 GitHub connector could read the exact staging branch but returned HTTP 403 Resource not accessible by integration on create-blob. No branch changes were made. This ZIP contains the staged backend app for placement under word-hunt-staging/backend/.

## Full 16-name exclusion update
New preview: https://tscms-word-hunt-owner-review-20261026-gjf7qy6pf.vercel.app/
Deployment: dpl_EpF4TrcgGGu9iNa21oeXVRwbVh4W (staging).

Mandatory roster: 16 owner-specified names were verified in the original ZIP; real roster must now be supplied privately at launch (historic names remain in prior Git commits).

All 28 local tests pass. Each listed name is tested with signup true and false, mixed case/whitespace, and accent/hyphen variations, even when the configuration roster is empty. Each rejection returns recorded:false and zero base, bonus, and total chances. Entry storage is never called. Mandatory exclusions cannot be overridden by an eight-only configuration roster.

The reusable drawing filter also excludes all 16 from pre-existing records. No drawing is performed here; Cherish retains the drawing and must use this filter/roster. The new preview supersedes the earlier immutable test URL. Real intake remains disabled; production remains untouched.

Deployed API verification: all 16 returned ineligible, recorded:false, baseEntries:0, bonusEntries:0, totalEntries:0. The server-only exclusion source returned HTTP 404.
