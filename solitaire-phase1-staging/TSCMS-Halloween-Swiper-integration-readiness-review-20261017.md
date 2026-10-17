# TSCMS Gamehouse — Single Halloween + Swiper integration-readiness handoff
**Date:** 2026-10-17
**Status:** REVIEW/HANDOFF ONLY. **Do not implement, merge into the playable Solitaire stage, or deploy publicly based on this note.** Owner approved *visual V5* and subsequently approved the **hamburger menu design in V6 except for Halloween Ambience, which is explicitly NOT approved**. This is not a full V6 functional signoff; sound is not working on the owner's device. This document is a mapping of existing source contracts and known validation needs.

## 1. Sources and authoritative approvals

- **Approved saloon master:** `assets/TSCMS_APPROVED_MASTER_DOWNLOAD.png`. Keep pixel-identical; card-free portrait board with actual approved controls, colored TSCMS Radio jukebox and slots.
- **Halloween visual reference (owner-approved V5 appearance only):** `solitaire-halloween-weather-VISUAL-PREVIEW.html` at the V5 review point. This page has undergone updates in place, so obtain the exact visual approval snapshot/commit before moving assets rather than assuming the current tip is identical to the approved moment.
- **V6 hamburger-menu layout approved, except Halloween Ambience NOT approved:** `solitaire-halloween-V6-FUNCTIONAL-MENU-PREVIEW.html`. Do not infer working feature approval or deploy it without independent review.
- **Live gameplay staging (not authorized for public release):** `solitaire-phase1-LOCKED-visual-STAGING.html`.
- User affirmed Halloween and Swiper are **equal first-launch priorities**; neither is deferred.
- **Sign-off scope:** Owner approved Halloween atmosphere (rain, dramatic blue/purple lightning, subtle realistic cobwebs), original saloon preservation, and fitting the whole gameplay surface with controls on mobile/tablet. Owner approved the **V6 hamburger-menu arrangement**, but **explicitly withheld approval for its Halloween Ambience feature**. Owner has **not** approved functioning audio, final Swiper integration, testing, or public launch. The rejected ambience option is not cleared for integration.
- Do not add clip-art, emojis, new branding/title, substitute jukebox, or another card design. Interior card faces/timer/controls must remain legible. Do not replace the approved menu location.
- V6 source is an **interactive mockup**. Its card-handling, Swiper, and saved-game functions are not real and must not be described as operational.

## 2. Live engine and UI mappings (verified by source inspection)

| Concern | Existing staged source | Current contract | V6 preview difference |
| --- | --- | --- | --- |
| Actual saloon screen | `solitaire-phase1-LOCKED-visual-STAGING.html` | `#stage`, approved `.stage-art`, existing card/timer/exit/buttons | Preview uses separate same-source art with additional weather SVG layers |
| Hamburger menu | stage HTML / `renderer-binding.js` | `#btn-menu` opens existing `#menu` and `#closeMenu` closes it | V6 uses separate `#menuHit`, `#menuLayer` and new controls |
| Draw 1 / Draw 3 | `renderer-binding.js`, `saloon-engine.js` | `#draw1` / `#draw3` update live `SaloonEngine._getState().drawMode`; persist through `SessionManager.savePrefs()`, and attempt `SaveSystem.save()` | V6 stores its own `tscms_v6_draw` key and only changes UI |
| Preferences & first-visit logic | `session-manager.js` | `tscms_solitaire_prefs_v1`, `getPrefs()`, `savePrefs()`; `theme`, `ghostMode`, `drawMode`, `timerMode`; separate session-active key | V6 writes separate `tscms_v6_theme`, `tscms_v6_swiper`, `tscms_v6_reduce_motion`, `tscms_v6_intro_dismissed` |
| Card engine | `saloon-engine.js` | `newGame(timerMode,drawMode)`, `drawFromStock()`, authoritative state snapshots, state-change subscription | V6 has no gameplay engine |
| Save / Resume | `save-system.js` | SAVE_KEY/version and `serialize/save/validate/load/restore/clear/hasSave` | V6 “Continue Saved Game” disabled—no live save handling |
| Live rendering | `renderer-binding.js` plus approved layout overlay | Engine-owned card positions, render timer/cards, `card:view`, `game:hint` | V6 intentionally has no engine-owned moving cards |

**Do NOT merge preview preference keys as a second source of truth.** Adapt approved menu controls to existing `SessionManager`, `SaloonEngine`, `SaveSystem` contracts and test the side effects on startup state and saved games. Avoid registering duplicate click handlers on `#btn-menu` or `#draw1/#draw3`.

## 3. Approved Halloween visual layer — constraints

- Rain appears **outside** the saloon openings only. No rain covering cards.
- Realistic cobweb strands near upper corners / menu; restrained, no sticker-like decorations.
- Branching **blue-white / occasional purple** lightning and localized storm illumination. No blinding full-screen flash.
- Retain the same full-board height-fit layout so all bottom gameplay controls are visible with no page scrolling on phones and tablets. Inspect common mobile + tablet portrait/landscape, safe areas, browser toolbar, pinch/zoom behavior; don't assume because CSS exists that every device passes.
- Keep `Lightning Flashes` an independent saved accessible On/Off toggle. Reduced-motion should suppress rapid animations by default; carefully define whether a deliberate opt-in can override it, and test. No redundant Rain control or explanation in the menu.
- Theme switching must preserve ongoing game state, visible card art, timer, and shared TSCMS Radio player state (where the site permits continuity).

## 4. Sound architecture — prototype not working on owner's device

Audio sample prototype V5/V6 uses WebAudio-generated noise. **Owner reported sound did not work on their device**. This remains a defect/open requirement, not approved, regardless of other preview settings.
- Desired game SFX: dealing, card selection, placement, Undo, victory; Swiper entry/theft/flee/scare.
- Halloween ambience: outside rain, thunder timed *after* lightning, wind/wood creaks if approved. Keep naturalistic, not comedic.
- `Lightning Flashes` and the hamburger-menu design are approved in concept. `Game Sound Effects` remain functionally unverified. **`Halloween Ambience` was expressly NOT approved by owner in V6 review**; do not count its menu toggle or current implementation as approved. Preserve the earlier requested possibility of optional rain/thunder audio only as an *open requirement* for owner reconsideration, not a permission to integrate this rejected version. Music/radio remains separately controlled; effects must not interrupt/restart the shared jukebox.
- Browser policies: start/resume audio on a direct user interaction and report `AudioContext.state` honestly; pause/visibility/Exit must stop/fade loops; one loop only. Respect muted device/browser/OS and failures without blocking game. Use appropriately licensed or newly produced assets for real production.
- **Do not call this functionality complete until physical Android/tablet tests play sound reliably.**

## 5. Swiper authority and visual contract — pending independent verification

- Swiper/theft engine and integration are separate from live public-facing Solitaire page; do not assume V6 toggles control it.
- User-approved Swiper targets **legal exposed tableau top card only**, relocates real card beneath a *different* tableau pile, never removes stock/foundation or steals stacks; successful theft creates irreversible Undo barrier. Exposed eligible Joker scares Swiper, with **no theft, relocation, or Undo barrier**.
- Authentic correct card art from actual engine state must be used for moving overlay; approved Swiper ghost sprite appearance must not be replaced with emoji or sample face baked into a sprite.
- Engine validates safe destinations/post-theft reachability and preserves win possibility. Test no-safe-destination, circular burial, Joker/Draw3/Undo, pause/input lock, save/restore, rapid route changes.
- 25% normal vs 35% Halloween+Swiper encounter rate, caps and timing are engine controlled (not visual timers). Halloween intro warning “A Deal With the Spirits” informs player; modal/pref behavior must remain independent.
- Run Cherish and Clara independent review before integration signoff and keep separate test evidence for device-only checks.

## 6. Next build order and acceptance gates

1. **Updated owner decision:** V5 Halloween visuals APPROVED; V6 hamburger-menu design APPROVED *except Halloween Ambience NOT APPROVED*. Do not infer any further signoff from “next”; carry forward audio and true engine behavior as unapproved.
2. Cherish independently reviews this mapping against her latest engine files and corrects stale details **without modifying production**.
3. With hamburger-menu design approved but its Halloween Ambience item excluded, extend the **existing** staging menu only after an explicit separate implementation go-ahead and session prefs—do not create a second parallel startup/menu stack. Integrate theme renderer as visual-only subscriber to genuine game DOM; no state mutation from weather/sprites.
4. Integrate approved Swiper into Solitaire staging with engine authority and dynamic card overlay; test safely with Halloween enabled and disabled.
5. Wire licensed/proper SFX and ambient audio to gameplay events, taking precedence rules for music/radio and device activation into account; test after user interaction.
6. Regression: 55 original approved card PNGs, correct foundation mapping, Save/Exit, Draw1/Draw3, time/HUD, pause/resume, no-scroll mobile/tablet, readability, visual toggle, 25/35% modes, Swiper Undo barrier and Joker scare, audio toggles on actual mobile.
7. Maintain separate owner gates: **visual V5 APPROVED; V6 hamburger-menu design APPROVED EXCEPT Halloween Ambience NOT APPROVED; functional menu implementation UNVERIFIED; audio NOT WORKING/PENDING; Swiper PENDING; integrated game PENDING; public deployment NO-GO**. Final launch requires explicit owner approval.

**Reviewer response requested:** identify contract mismatches with the *current* Cherish engine, highlight blocker/priority, and report test evidence before proposing a consolidated implementation plan. This note does not grant permission to implement or deploy.