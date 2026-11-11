# TSCMS “Coming Up” — deployment and permission gate

Draft feature branch, 2026-11-11. **Not live. Do not merge until security rules and the complete preservation gate are verified.**

## What is in this branch

- `tscms-promo-calendar.js` + CSS: a read-only Firestore listener on the homepage. Renders directly **after Song of the Week**, before Sponsor TV and Songs by Day. Uses image elements only. No audio/video controls or autoplay.
- `tscms-promo-admin.js`: upload form inside the existing admin body. It only appears after a **verified Firebase email login** and server-confirmed approved user profile. PIN unlock alone does not grant promo access.
- Images: Firebase Storage `promo-images/{uid}/{promoId}.{jpg|png|webp}`.
- Records: Firestore `promoEntries/{promoId}` with `title`, `postingBy`, `scheduledAtCT`, `imagePath`, `createdBy`, `createdAt`.
- Schedule is entered and displayed in **America/Chicago (CT)**. At the scheduled minute, a promo disappears from the upcoming list. A Firestore listener publishes new entries without rebuilding GitHub Pages.

## Mandatory provisioning BEFORE production

**Do not infer publishing rights from a name or a username.** Firebase Auth UIDs are the security identifiers.

1. Verify the real Firebase Auth accounts of Vickie Gibson and Lady Red / Rachel Kulesa with Fudgie. Never invent UIDs.
2. As an authenticated Firebase project administrator, create ONLY these two documents in Firestore: `promoEditors/{VICKIE_UID}` and `promoEditors/{RACHEL_UID}`, each exactly `{ enabled: true }`. The existing approved `users/{FUDGIE_UID}.owner: true` account is the third authorized publisher; no promoEditors grant needed for it.
3. Merge the following **scoped** additions into the real, currently deployed Firestore/Storage rules. **Do not replace existing rules**; the repository does not contain a known authoritative copy of them.
4. Run rule-emulator tests to verify public reads, only three allowed writers, denied former editors, denied PIN users, denied images outside path/MIME/size limits, and old favorite/admin access still intact.
5. Confirm this project's Firebase Storage bucket allows uploads, including any required billing/configuration. No payment or upgrade should be initiated without Fudgie's approval.
6. Only then run `node scripts/verify-public-preservation.mjs`, inspect full PR diff, verify protected-feature CI, test 360/390px and desktop, check sitewide radio remains uninterrupted, and consider publishing.

## Firestore rules — scoped block to merge under /databases/{database}/documents

```javascript
function promoSignedInAdmin() {
  return request.auth != null
    && request.auth.token.email_verified == true
    && exists(/databases/$(database)/documents/users/$(request.auth.uid))
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'approved'
    && (
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.admin == true ||
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.owner == true
    );
}
function promoCanPublish() {
  return promoSignedInAdmin()
    && (
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.owner == true ||
      (
        exists(/databases/$(database)/documents/promoEditors/$(request.auth.uid))
        && get(/databases/$(database)/documents/promoEditors/$(request.auth.uid)).data.enabled == true
      )
    );
}
match /promoEditors/{uid} {
  allow get: if request.auth != null && request.auth.uid == uid;
  allow list, create, update, delete: if false;
  // Provision Vickie and Rachel only via trusted Firebase administration.
}
match /promoEntries/{entryId} {
  allow read: if true;
  allow create: if promoCanPublish()
    && request.resource.data.keys().hasOnly([
      'title','postingBy','scheduledAtCT','imagePath','createdBy','createdAt'
    ])
    && request.resource.data.keys().hasAll([
      'title','postingBy','scheduledAtCT','imagePath','createdBy','createdAt'
    ])
    && request.resource.data.title is string
    && request.resource.data.title.size() > 0
    && request.resource.data.title.size() <= 120
    && request.resource.data.postingBy is string
    && request.resource.data.postingBy.size() > 0
    && request.resource.data.postingBy.size() <= 80
    && request.resource.data.scheduledAtCT is string
    && request.resource.data.scheduledAtCT.matches('[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}')
    && request.resource.data.imagePath is string
    && request.resource.data.imagePath.matches(
      'promo-images/' + request.auth.uid + '/' + entryId + '[.](jpg|png|webp)'
    )
    && request.resource.data.createdBy == request.auth.uid
    && request.resource.data.createdAt == request.time;
  allow update, delete: if false;
}
```

## Firebase Storage rules — scoped block to merge under /b/{bucket}/o

Requires Firebase Storage Rules v2 with the documented Firestore lookup support. Validate these in the emulator against the actual project configuration.

```javascript
function promoStoragePublisher() {
  return request.auth != null
    && request.auth.token.email_verified == true
    && firestore.exists(/databases/(default)/documents/users/$(request.auth.uid))
    && firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.status == 'approved'
    && (
      firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.owner == true ||
      (
        firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.admin == true
        && firestore.exists(/databases/(default)/documents/promoEditors/$(request.auth.uid))
        && firestore.get(/databases/(default)/documents/promoEditors/$(request.auth.uid)).data.enabled == true
      )
    );
}
match /promo-images/{uid}/{filename} {
  allow read: if true;
  allow create: if promoStoragePublisher()
    && request.auth.uid == uid
    && filename.matches('[A-Za-z0-9_-]{20}[.](jpg|png|webp)')
    && request.resource.size > 0
    && request.resource.size <= 4 * 1024 * 1024
    && request.resource.contentType.matches('image/(jpeg|png|webp)');
  allow update: if false;
  // Allows failed record creation to clean up its own previously uploaded image.
  allow delete: if promoStoragePublisher() && request.auth.uid == uid;
}
```

## Explicit go/no-go

A static JSON file alone is insufficient because GitHub Pages cannot accept client writes. The Firestore listener and Firebase Storage give real-time data and image publishing *once rules are deployed*. **Merely merging these JavaScript files does not enforce any permission or make uploads work**.

The generated `index.html` needs to retain the two promo module references through the daily build. If the next generator run removes them, fix the generator before release. This implementation does not rewrite or strip the existing song catalog.
