# Favorites generator preservation + owner count check 6
October 23, 2026. STAGING ONLY. Owner controls two later ship approvals.

## Actual stage and source provenance
Isolated branch clara/favorites-generator-check6-staging-20261023 began at Favorites PR #28 SHA acdde1d1b62b35a9bcaff29cb0926dfe5829627b. It does NOT update PR #28, PR #29 or main. The genuine current private make_public.py is NOT in GitHub. The Oct 21 Drive file personal-note-make_public.py was used ONLY to identify historic generator flow, not to overwrite Cherish's newer generator. Her current version has not been independently confirmed as matching.

The staged scratch adapter preserve_favorites_loaders.py preserves exactly one tscms-favorites.css and one module tscms-favorites.js on index.html and tscms-today.html, and exactly one owner-only tscms-favorites-owner.js module on secured admin.html. Refuses duplicate loaders, malformed boundaries, baked-in signed-out hearts / playlist doors, or any admin candidate lacking BOTH the authenticated modern Control Room and tscms-admin-dual.js. It never changes unrelated content or adds a per-person owner scan. Only writes with explicit --write into an isolated scratch directory named favorites-staging-*; refuses repo and CNAME directories.

Cherish TEST steps: copy CURRENT generated index.html, tscms-today.html, admin.html into disposable favorites-staging-20261023. Run:
python favorites-pilot/generator-staging/preserve_favorites_loaders.py --root /path/to/favorites-staging-20261023
Then repeat with --write only on that scratch copy; rerun dry-run and expect unchanged. Compare the 3 outputs against PR #28 approved tags, today/song counts, Admin login, signed-out ZERO hearts and doors. IMPORTANT: this proves the adapter works only. Cherish must compare/integrate the same preservation contract into her CURRENT private make_public.py, rerun 2 full isolated 6-hour pipeline builds, and show that build_member.py regeneration does not strip Today loaders. Avoid overwriting current Admin with Oct 21 legacy tabbed output. Search and Gamehouse loaders have separate preserve requirements; neither is built by this old generator. Do not publish yet.

## Owner count check 6 on free Spark (not proof yet)
Firebase Spark cannot DEPLOY Cloud Functions. The no-cost path is the TEST-only Local Emulator Suite for Firebase Auth + Firestore + callable Functions, using a disposable demo-tscms-favorites-check6 project ID (or VERIFIED isolated TEST project). NEVER point Firebase CLI, Admin SDK, rules, keys, or browser at production. NEVER link billing. Copy actual PR #28 callable source into disposable emulator functions directory, with local firebase-functions and firebase-admin dependencies; merge a TEST copy of full current v4 rules with the staged favorites fragment ONLY after verifying the installed v4 rules. Do not deploy fragment alone.

Start with firebase emulators:exec --project demo-tscms-favorites-check6 --only auth,firestore,functions, invoking a separate test runner; project ID, FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST must all match this local environment. Seed ONLY synthetic approved/role fixture records:
owner-test approved owner true 2 hearts;
admin-test approved admin true 3 hearts;
empty-admin-test approved admin true 0;
regular-test approved regular member 5 (EXCLUDED);
revoked-test revoked admin 4 (EXCLUDED);
pending-test pending admin 7 (EXCLUDED).
Expected owner aggregate is exactly totalHearts=5 and activeMembers=2. Hand-count fixture data separately. Verified owner callable response must have only totalHearts, activeMembers, countedAt (ISO timestamp), with no per-person information. Test signed-out, unverified, regular, revoked, pending and unknown UID DENIED. Change fixture saves/removals and verify fresh aggregate. Separately run full Firestore Rules emulator user A/B isolation, revoked and anonymous denied, invalid create fields/timestamps, and owner aggregate read / no client writes: Admin SDK in callable BYPASSES Firestore Rules. Tear down emulator and destroy fixtures; report CT date, source SHA, actual commands, outcomes.

The committed test_owner_count_mock.cjs tests the REAL backend SOURCE with synthetic server mocks; it is LOGIC-ONLY and is NOT a real emulator proof, Firebase Auth proof or live count. Actual check 6 remains UNVERIFIED until emulator evidence is shared. Even after emulator PASS, an actual callable cannot be deployed on Spark production without a separate owner-approved architecture/billing decision.

## Separation & freeze
PR #28 Favorites remains DRAFT and held until seven real acceptance checks, especially signed-out zero hearts, second device, Firebase rules, count #6 and real phone confirmation; PR #29 Gamehouse Larger Text remains DRAFT and Cherish must test 360/390/430 with OFF/ON MID-GAME. Cherish separately owns build_member missing songs_all.json, the Vickiejo duplicate identity, and Gamehouse visuals. No merge, ship, Firebase deployment, or finished Change Log without Fudgie's later explicit separate ship tap(s) and post-release independent acceptance.
