# Search Suno backfill — verified stage, 2026-10-24

**STAGING ONLY. OWNER APPROVAL REQUIRED TO MERGE/PUBLISH.**

## Backfill evidence
- Original `search-index.json`: 288 records, schema 1, exact baseline GitHub blob SHA `1aa73bcfa2aadbfdae91a061143f5601d14564f7`.
- Exact source-recovered records: 216 across 213 distinct streams.
- Cherish's authenticated track-cache JSON: 110 distinct stream keys, with title/artist provenance; her Markdown reference agrees with all 110 JSON entries.
- 38 records overlap; every overlapping Suno URL is identical.
- 178 source-only + 38 both + 72 cache-only = **288/288** mapped.
- Conflicts **0**, missing links **0**, unsafe/non-Suno URL patterns **0**.
- Final index: 288 records, 285 unique Suno URL values. Every previous field, song order, and top-level coverage metadata remains unchanged.
- One harmless whitespace-only label variation in cache: `IM HOME--MASTER` vs source-index title `IM  HOME--MASTER`. The source-index title was NOT modified.
- Seven negative/positive isolated validation tests passed (including missing cache, disagreement, altered title, unsafe URL, Markdown mismatch, repeated streams).
- External HTTP/real page resolution remains **unconfirmed**: Suno is inaccessible to automated checker; no 200 response is claimed.

## Staged artifact identifiers
- GitHub **draft PR #38**, head branch `clara/search-suno-links-staging-20261024`, includes only staging changes until approved.
- Source-verified new index SHA-256: `a82e128340341edbf9502809613f994297feb83044496d3765749b43e9016405`.
- GitHub blob SHA of the proposed index: `67737820f98f60a79351c7dacbc6efb07b96f974`.
- Drive exact staged index: https://drive.google.com/file/d/1W4nct8sHn2GKwW-OQVK8je8YFuIF84s8/view
- Drive complete staged reproducibility package: https://drive.google.com/file/d/1s48rBaMeybOSSuAhmoAa_SVp35tgxBHk/view
- Drive audit results: https://drive.google.com/file/d/1BK62g_tXwjMDm4z8cN-0ZW36tfW16lh4/view
- Drive readback matched locally produced files **byte-for-byte** and SHA-256.

## Release gates
1. Review stage Search UI and all provenance/coverage counts.
2. Obtain Cherish's matching restricted persisted `search-archive.json` backfill to keep future weekly merges intact.
3. Run protected/search CI green and an actual browser/phone click-through of Suno links.
4. **Fudgie must separately approve a PR merge and replacement of the LIVE Search index.**

No production upload or main branch merge was performed by this staged repair.
