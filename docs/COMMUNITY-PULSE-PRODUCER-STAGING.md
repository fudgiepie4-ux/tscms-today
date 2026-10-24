# Community Pulse — staged producer (Oct 24, 2026)

**NOT RELEASED.** Control Room mc.js reads community-pulse-current.json (never pulse-current.json). Contract: generated (fresh <=48 hours), window.start and window.end covering exactly seven completed America/Chicago days, and exactly seven days with date, posts and comments integers.

## Input and proof requirements
The producer reads a trusted 14-day JSON object containing a posts array and generated, collected_at or fetched_at timestamp, or a bare array if coverage has source_generated. Each relevant post requires a stable id/post_id (fallback: post_url), offset-aware creation_time/created_time/created_at/timestamp/published_at. A numeric id plus a separate post_url is VALID (do not compare an ID against a permalink), and nonnegative integer comments_count/comment_count/comments (also accepts comments.summary.total_count or comments.count). Count every group post, not just Suno, songs or no-comment posts.

The collector MUST certify each of the seven completed CT dates. It must write the manifest at COLLECTION TIME, from real pagination and verification evidence. NEVER hand-author a pass manifest after the fact just to match the recomputed 490/1678 totals. A timestamp newly invented on an older data file is not a valid source timestamp.

Required manifest (real values provided by collector, example below is a SHAPE ONLY; do NOT use the example as an attestation):
```json
{
  "schema_version": 1,
  "collector": {"name": "YOUR_ACTUAL_COLLECTOR_NAME", "version": "ACTUAL_COLLECTOR_VERSION"},
  "collection_id": "ACTUAL_UNIQUE_COLLECTOR_RUN_ID",
  "source_generated": "2026-10-24T17:00:00Z",
  "source_sha256": "EXACT_LOWERCASE_SHA256_OF_UNMODIFIED_posts_14d.json_BYTES",
  "verified_at": "2026-10-24T17:05:00Z",
  "pagination": {"posts_exhausted": true, "pages_fetched": 1},
  "days": [
    {"date": "2026-10-17", "posts_complete": true, "comments_complete": true, "post_count": 0, "comment_total": 0, "scanned_through": "2026-10-18T05:00:00Z"}
  ]
}
```
Populate all seven *actual* completed Central-time dates (never copy the illustrative zero-count day). 'posts_exhausted' means the complete upstream pagination required to cover these dates was actually exhausted; pages_fetched is the real successful page count. posts_complete/comments_complete require independently verified API or collector coverage, NOT inference from the JSON itself. Record the upstream pagination cursors, errors and comment-count provenance in collector workpapers, and retain those logs next to the manifest for audit.

The exact original file's SHA-256 is checked by the staging CLI; reserialization after the manifest is written blocks the run. If the posts source has no embedded generated/collected_at/fetched_at, manifest source_generated MUST be the **actual original collector run timestamp**. Both must be <48h old when run; simply stamping old data now does not qualify.

The collector MUST certify each of the seven completed CT dates. Supply an inline coverage object or --coverage /path/coverage.json containing a verified_at or generated timestamp and days records with: date, posts_complete:true, comments_complete:true, post_count integer, comment_total integer, scanned_through offset-aware time at or after the next Central midnight. These flags MUST be grounded in genuine complete upstream pagination; they may NOT be guessed from an incomplete JSON file. An explicit verified day with zero posts and zero comments is genuinely zero. Missing dates, missing comment counts, or unverified scan days BLOCK generation.

Example source schema ONLY — synthetic:
    {"generated":"2026-10-24T17:00:00Z","posts":[{"id":"123","created_time":"2026-10-23T19:30:00Z","comments_count":2}]}

Example coverage schema for ONE day ONLY — synthetic, all seven dates required:
    {"verified_at":"2026-10-24T17:00:00Z","days":[{"date":"2026-10-23","posts_complete":true,"comments_complete":true,"post_count":1,"comment_total":2,"scanned_through":"2026-10-24T05:00:00Z"}]}

The actual source collection timestamp (embedded or honestly attested by manifest), manifest verification timestamp and exact source file SHA-256 are validated and must be at most 48h old and not >5m in the future. The generator recomputes all daily counts, matches them to the separate proof and refuses to write on stale or partial input, duplicate IDs, mismatches, bad timestamps or unsafe numbers. Output is staged atomically and never sent to a live destination by this code.

## Six-hour refresh integration point — pending access to authoritative external pipeline
The real refresh_tscms_site.py, make_public.py, posts_14d.json and production scheduler are NOT present in the accessible GitHub repository. This PR does not alter them.

In the isolated staging copy of the existing refresh sequence, insert this command AFTER successful 14-day post collection plus collector proof creation, and BEFORE any publish/upload steps:

    python3 scripts/build_community_pulse.py --posts /trusted-pipeline/posts_14d.json --coverage /trusted-pipeline/posts_14d_coverage.json --stage-dir /isolated-pipeline/stage-pulse

Caller must enforce set -e (shell) or subprocess.run(..., check=True) (Python). On failure, BLOCK publication; do not publish a stale or partial replacement. No live feed is present in this draft PR. No auto-production step is included. Once the real source and completeness proof are available, run against it and validate the emitted window, seven daily totals and timestamp against mc.js, then seek owner approval to publish the exact file community-pulse-current.json.

## Staged unit QA
    python3 scripts/test_community_pulse.py
    python3 -m py_compile scripts/build_community_pulse.py scripts/test_community_pulse.py

Tests use synthetic fixtures ONLY, not claims about community engagement. Required remaining gates are real schema inspection, verified collector scan proofs, actual source run, and real refresh-runner wiring. NEVER merge or publish until Fudgie explicitly directs it.
