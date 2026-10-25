# Quick Jump autumn drawer — staged design handoff (2026-10-25)

**Gate:** DESIGN / STAGING ONLY. Do not merge to main or deploy production without Fudgie's explicit approval.

## Ground truth
- Source structure: owner-provided Drive `quick-jump-redesign-draft-20261025.html`.
- Preview: `quick-jump-stage/index.html`.
- Production-bound source changes: `tscms-quick-jump.js`, `tscms-quick-jump.css`, and *only two asset-version query strings* in `index.html`.
- Existing, immutable Swiper hero: `assets/tscms-quick-jump-hero.jpg`. No new image file or modified hero bytes were produced.
- The old large autumn hotspot artwork is suppressed by the new redesigned navigation, to avoid duplicate/conflicting Quick Jump displays; the owner-approved Pathway strip, song list, Halloween jump and Search door bootloaders remain.
- The music-listener-only playlist entry is **not** shown.

## Visible behavior
- Closed by default; slim timber-and-brass Quick Jump bar + Facebook Group / YouTube / Facebook Page row.
- Opened drawer: Swiper hero, fixed MUSIC section (all 6 links visible), and AROUND TOWN / COMMUNITY collapsible headers.
- Accordion has exclusive open behavior; tapping the open header closes it; MUSIC stays visible.
- MUSIC: Today's Songs · Radio · Most Loved · Search Songs · Seasonal Playlists · Monthly Spotlight.
- AROUND TOWN: Gamehouse · Drive-In Videos · Red Dirt & Redemption · Dicey Discovery · Town Journal.
- COMMUNITY: Facebook Group · YouTube · Facebook Page · Admin Sign In (last).
- All external social URLs are browser links with `rel=noopener noreferrer`.
- Escape, backdrop click, explicit Close, scroll lock, and focus restore retained; hidden accordion rows removed from focus trap.

## Known production dependencies (do not silently present as passed)
1. **Radio:** Current main homepage does not load the staged sitewide radio widget. The Quick Jump Radio command opens that widget when present; otherwise shows a status notice and scrolls to Today's Songs. Do not claim dedicated Radio launch is finished until the sitewide radio release is confirmed.
2. **Dicey:** If Dicey remains hidden by its separate HTTPS/launch gate, the menu item remains visible but reports that it is not open yet; no fake access.
3. **Dynamic sections:** Verify Most Loved and Monthly Spotlight are rendered by public runtime before the phone walkthrough. Link resolution uses current sections when drawer opens.
4. **Site generator:** The build pipeline regenerates `index.html`; ensure its preserved script and stylesheet versions do not regress during a subsequent catalog refresh.

## Completed source checks
- Expected item count 6 / 5 / 4: PASS.
- MUSIC not toggle-able: PASS.
- AROUND TOWN and COMMUNITY open mutually exclusively: PASS (source inspection).
- Existing Swiper hero path reused: PASS.
- Existing Halloween shortcut, Search door, and Pathway loader retained: PASS.
- Main `index.html` song markup unchanged: PASS; only two version strings updated.
- No merge or production publish: PASS.
- Mobile visual device check 360 / 390 / 430px: **REQUIRED BEFORE MERGE**, not claimed complete.
- Tapping every destination and confirming sitewide player behavior: **REQUIRED BEFORE MERGE**.
- Automated browser E2E, CI, and in-device screenshot QA: **NOT YET VERIFIED**.

## Owner gate
Do not mark draft PR ready for review or merge until Fudgie approves the art and Cherish verifies the staging build on a mobile browser.