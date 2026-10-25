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

## Header decoration follow-up — 2026-10-25
- Source references provided by Fudgie:
  - Screenshot: https://drive.google.com/file/d/1bFupzOQtuN-3W4Dug95rb6rNTSEs_LsC/view?usp=drivesdk
  - Exact-styling mockup: https://drive.google.com/file/d/15qYPGVT70FnJAMZb0ROWWyu-srpPXULS/view?usp=drivesdk
- Applied to actual proposed-site CSS (`tscms-quick-jump.css`) and mirrored byte-identical vector motifs in the stage-only preview (`quick-jump-stage/index.html`).
- MUSIC: hand-drawn musical notes, curling staff traces, cream twinkles.
- AROUND TOWN: three framed house silhouettes, roof/chimney detail and glowing amber windows.
- COMMUNITY: warm-leaf-outline vine with a small rust-and-cream heart.
- Same autumn-gold gradient under each motif. Palette: gold, amber, cream, rust; **no green**.
- Decoration remains on the right; separate placement and 360px adjustments avoid text and chevron collisions as designed. Actual phone-width screenshot validation remains pending.
- `tscms-quick-jump.js`, accordion logic, visitor links, homepage `index.html`, and the canonical Swiper art image were **not changed** in this follow-up.
- Readback checks: 3 CSS motifs, 3 stage-preview motifs, encoded SVG identity matches across CSS/preview, required selectors, gold gradient, 360px rule, unchanged accordion code, original hero path, draft/not-merged PR — **11/11 pass**.
- Browser QA at 320/360/390/430, contrast/zoom, and owner approval remain required; no production changes authorized.

## Painted replacement — 2026-10-25 (new owner direction; unapproved draft)
- Rejected flat vector motifs removed entirely from the real CSS and review page.
- Three painted assets, cropped from the earlier rendered header-art screenshot, are in `assets/` as distinct WebP files:
  - `tscms-qj-painted-music-20261025.webp` — 1,698 bytes; Git blob `6336c4b5dafe9f5da9ca06f3c2561258ca662dde`.
  - `tscms-qj-painted-town-20261025.webp` — 2,366 bytes; Git blob `12e292f1693c6de9c387e3542099c8d042c63a72`.
  - `tscms-qj-painted-community-20261025.webp` — 1,916 bytes; Git blob `ea2c4c9e96bd4e0fc0c0ea2af09daec01f93880e`.
- Real site `tscms-quick-jump.js` adds separate decorative `aria-hidden` art slots between labels and chevrons. MUSIC has **no chevron**; AROUND TOWN and COMMUNITY retain their existing mutually exclusive accordion behavior. MUSIC remains permanently open and the drawer still starts closed.
- `tscms-quick-jump.css` and `quick-jump-stage/index.html` use the same images, same common gold gradient, 82px-tall headers, and dedicated flex slots for labels, artwork, and chevrons. Fall palette only; no green.
- The canonical Swiper hero image `assets/tscms-quick-jump-hero.jpg` is unchanged and retains its exact existing URL and bytes. Stage points to `../assets/tscms-quick-jump-hero.jpg`.
- Homepage `index.html` changed **only** the two CSS/JS cache keys from `20261025-art-stage` to `20261025-painted-stage`. Song `data-suno` attribute count unchanged at **411**.
- **Actual rendered review picture created at 390px phone width:** `quick-jump-painted-phone-390.png` in the ChatGPT delivery. That local preview reproduces the staged art slots and uses a crop of the unchanged Swiper preview at its top; the branch preview itself references the original canonical hero file. This is a local rendered screenshot, **not a production or protected-test-origin capture**.
- Local browser check (Chromium/Playwright) with widths 320/360/390/430: all three headers 82px high. At 390px: AROUND TOWN expands, COMMUNITY expansion closes it, MUSIC never disappears, Escape closes the drawer. Browser visual QA of the deployed branch and phone touch testing still outstanding; no PR merge authorized.
- **Standing delivery rule:** any future visual/design handoff must include a rendered phone-width screenshot. GitHub branch/code link or text-only checks are not adequate as visual review.

## OWNER-APPROVED PAINTED HEADER SOURCE BUILD — 2026-10-25
**This section supersedes all earlier vector and preliminary painted-header notes.** Owner approved the complete reference image at
https://drive.google.com/file/d/1LCqvGP3cOf_O8nX75a70_mUPPBPz14Vp/view?usp=drivesdk
- Canonical source: `TSCMS-Quick-Jump-Painted-APPROVED-2026-10-25.png` (952×1653, 1,901,498 bytes), SHA-256 `4b18ac5484ffdfb924783ea8dda201c7ee6cf336556e9199ba1aeecb8280b828`; source left **unchanged** in Google Drive.
- Three **literal crops** of approved painting (no regenerated/vector art) committed to this draft branch, copied as binary blobs identical to verified local crop files:
  - MUSIC `assets/tscms-qj-approved-music-20261025.webp`; image crop rect (295,416,855,570); 560×154; 44,934 bytes; blob `ce60e7edfba38b317773d8da2cacbc908edbaa2b`.
  - AROUND TOWN `assets/tscms-qj-approved-town-20261025.webp`; crop rect (416,1154,799,1306); 383×152; 25,136 bytes; blob `db012a6c8e15e61912c1297f8f04b01d8adea4e1`.
  - COMMUNITY `assets/tscms-qj-approved-community-20261025.webp`; crop rect (392,1339,799,1489); 407×150; 30,518 bytes; blob `4d51fcf229dc8c80f6bff498887f2155ca21c3b6`.
- The three preliminary `assets/tscms-qj-painted-*-20261025.webp` assets were **removed**; the previously rejected data-URI vector motifs are absent from the current CSS and preview. The original Swiper hero `assets/tscms-quick-jump-hero.jpg` is reused unchanged, and is not reconstructed from the approved full-layout composite.
- Both production-bound `tscms-quick-jump.css` and `quick-jump-stage/index.html` now reference only approved crops. Header height 82px; same warm gold base, fall-only palette, label | painted art | chevron in distinct flex slots. MUSIC has **no chevron**.
- `tscms-quick-jump.js` remains unchanged from the verified grouped-drawer implementation: 6 MUSIC items always visible, AROUND TOWN 5, COMMUNITY 4; accordion one-of-two, closed drawer by default with social row; Radio in MUSIC; listener-only playlist not added; Admin Sign In last.
- The only change to generated homepage `index.html` is CSS and JS cache URLs `?v=20261025-approved-drive`; the 411 `data-suno` fields remain intact.
- Chromium-based visual/behavior tests at **320, 360, 390, 430px** using the staging layout/approved-image assets checked: drawer initial closed, MUSIC always visible, AROUND TOWN/COMMUNITY mutually exclusive, Escape closes, 82px header height, exact three art assets, no label/art/chevron box overlaps.
- **390px browser-rendered stage-mirror screenshots** (not production, and not a live protected-test-site capture):
  - MUSIC default: https://drive.google.com/file/d/1Jt1qMSCEU3yaWos1y3YG99hjJoIrfvMc/view?usp=drivesdk
  - AROUND TOWN open: https://drive.google.com/file/d/1RsZLi8I9rLUXoqEGzvxLbtBX1Su4-Ys4/view?usp=drivesdk
  - COMMUNITY open: https://drive.google.com/file/d/1JF2Xro62baP7TbQXXZUiR0MPzCPb1arZ/view?usp=drivesdk
  - All three: https://drive.google.com/file/d/1dJo-hj5qwpoby3U6T26FHPbUnl0BM5Up/view?usp=drivesdk
- Archived derivative crops: https://drive.google.com/drive/folders/1ZUtp_6EgA2nqbJGouCpfMAfFzpaiMfU5
- PR #39 **must stay DRAFT**, no merge, no production publish, until Fudgie's separate approval. Pending phone owner review and live-origin browser smoke test.
