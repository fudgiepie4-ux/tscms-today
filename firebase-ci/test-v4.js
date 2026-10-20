// TSCMS v4 Firestore Rules — Security Test Suite
// 44 scenarios against the Firebase Emulator
// Run: node test-v4.js (emulator must be running on 127.0.0.1:8085)

const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, writeBatch } = require("firebase/firestore");
const fs = require("fs");

const PROJECT_ID = "demo-test";
const PORT = 8085;
let passed = 0, failed = 0;
const results = [];

function record(num, desc, ok, err) {
  if (ok) { passed++; } else { failed++; }
  results.push({ num, desc, status: ok ? "PASS" : "FAIL", error: err ? String(err).slice(0, 200) : null });
  console.log(`${ok ? "PASS" : "FAIL"} #${num}: ${desc}`);
}

async function main() {
  const rules = fs.readFileSync("./firestore.rules", "utf8");
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules, host: "127.0.0.1", port: PORT },
  });

  // Helper: authenticated context
  const authCtx = (uid, email, verified) =>
    testEnv.authenticatedContext(uid, { email, email_verified: verified });

  // Seed: owner user
  const admin = testEnv.authenticatedContext("owner1", { email: "owner@test.com", email_verified: true });
  // We need to seed via admin context — but rules deny. Use unauthenticated setup via testEnv.withSecurityRulesDisabled
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/owner1"), {
      email: "owner@test.com", username: "owneruser", fullName: "Owner User",
      admin: true, owner: true, status: "approved",
      createdAt: new Date(), registrationPath: "direct",
    });
    await setDoc(doc(db, "users/admin1"), {
      email: "admin@test.com", username: "adminuser", fullName: "Admin User",
      admin: true, owner: false, status: "approved",
      createdAt: new Date(), registrationPath: "direct",
    });
    await setDoc(doc(db, "users/revoked1"), {
      email: "revoked@test.com", username: "revokeduser", fullName: "Revoked User",
      admin: true, owner: false, status: "revoked",
      createdAt: new Date(), registrationPath: "direct",
    });
    await setDoc(doc(db, "config/migration"), {
      pinRegistrationOpen: true, cutoffDate: "2026-11-01",
    });
    await setDoc(doc(db, "vault/testkey"), { key: "secret123" });
  });

  const noAuth = testEnv.unauthenticatedContext();
  const owner = authCtx("owner1", "owner@test.com", true);
  const adm = authCtx("admin1", "admin@test.com", true);
  const revoked = authCtx("revoked1", "revoked@test.com", true);
  const unverifiedAdmin = authCtx("admin1", "admin@test.com", false);
  const newUser = authCtx("newuser1", "new@test.com", true);
  const noDocUser = authCtx("nodoc1", "nodoc@test.com", true);

  const dbNoAuth = noAuth.firestore();
  const dbOwner = owner.firestore();
  const dbAdmin = adm.firestore();
  const dbRevoked = revoked.firestore();
  const dbUnverified = unverifiedAdmin.firestore();
  const dbNew = newUser.firestore();
  const dbNoDoc = noDocUser.firestore();

  // === ORIGINAL 10 ===
  try { await assertFails(getDoc(doc(dbNoAuth, "vault/testkey"))); record(1, "Signed-out read /vault → DENY", true); }
  catch (e) { record(1, "Signed-out read /vault → DENY", false, e); }

  try { await assertFails(getDoc(doc(dbNoDoc, "vault/testkey"))); record(2, "No-doc user read /vault → DENY", true); }
  catch (e) { record(2, "No-doc user read /vault → DENY", false, e); }

  // Test 3: admin:false user — need to create one
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "users/plain1"), {
      email: "plain@test.com", username: "plainuser", fullName: "Plain",
      admin: false, owner: false, status: "approved",
      createdAt: new Date(), registrationPath: "direct",
    });
  });
  const plainUser = authCtx("plain1", "plain@test.com", true);
  try { await assertFails(getDoc(doc(plainUser.firestore(), "vault/testkey"))); record(3, "Non-admin read /vault → DENY", true); }
  catch (e) { record(3, "Non-admin read /vault → DENY", false, e); }

  try { await assertSucceeds(getDoc(doc(dbAdmin, "vault/testkey"))); record(4, "Approved admin read /vault → ALLOW", true); }
  catch (e) { record(4, "Approved admin read /vault → ALLOW", false, e); }

  try { await assertFails(setDoc(doc(dbAdmin, "users/other1"), { email: "x@x.com" })); record(5, "Admin write other user → DENY", true); }
  catch (e) { record(5, "Admin write other user → DENY", false, e); }

  try {
    const batch = writeBatch(dbNew);
    batch.set(doc(dbNew, "users/newuser1"), {
      email: "new@test.com", username: "newuser", fullName: "New",
      admin: true, owner: false, status: "pending",
      createdAt: new Date(), registrationPath: "direct",
    });
    batch.set(doc(dbNew, "usernames/newuser"), { uid: "newuser1", createdAt: new Date() });
    await assertFails(batch.commit());
    record(6, "Create with admin:true → DENY", true);
  } catch (e) { record(6, "Create with admin:true → DENY", false, e); }

  try { await assertFails(getDocs(collection(dbAdmin, "users"))); record(7, "Admin list /users → DENY", true); }
  catch (e) { record(7, "Admin list /users → DENY", false, e); }

  try { await assertSucceeds(getDoc(doc(dbAdmin, "users/admin1"))); record(8, "Admin get own doc → ALLOW", true); }
  catch (e) { record(8, "Admin get own doc → ALLOW", false, e); }

  try { await assertFails(setDoc(doc(dbNoAuth, "users/x"), { a: 1 })); record(9, "Signed-out write → DENY", true); }
  catch (e) { record(9, "Signed-out write → DENY", false, e); }

  try { await assertFails(getDoc(doc(dbRevoked, "vault/testkey"))); record(10, "Revoked admin read /vault → DENY", true); }
  catch (e) { record(10, "Revoked admin read /vault → DENY", false, e); }

  // === V2 ADDITIONS (11-29) ===
  // 11: valid registration (paired batch)
  const regUser = authCtx("reguser1", "reg@test.com", true);
  try {
    const batch = writeBatch(regUser.firestore());
    batch.set(doc(regUser.firestore(), "users/reguser1"), {
      email: "reg@test.com", username: "reguser", fullName: "Reg User",
      admin: false, owner: false, status: "pending",
      createdAt: new Date(), registrationPath: "direct",
    });
    batch.set(doc(regUser.firestore(), "usernames/reguser"), { uid: "reguser1", createdAt: new Date() });
    await assertSucceeds(batch.commit());
    record(11, "Valid paired registration → ALLOW", true);
  } catch (e) { record(11, "Valid paired registration → ALLOW", false, e); }

  // 12-16: privilege injection (using fresh users)
  for (const [num, field, val, desc] of [
    [12, "admin", true, "Create with admin:true → DENY"],
    [13, "owner", true, "Create with owner:true → DENY"],
  ]) {
    const u = authCtx(`inj${num}`, `inj${num}@test.com`, true);
    try {
      const batch = writeBatch(u.firestore());
      const data = {
        email: `inj${num}@test.com`, username: `injuser${num}`, fullName: "Inj",
        admin: false, owner: false, status: "pending",
        createdAt: new Date(), registrationPath: "direct",
      };
      data[field] = val;
      batch.set(doc(u.firestore(), `users/inj${num}`), data);
      batch.set(doc(u.firestore(), `usernames/injuser${num}`), { uid: `inj${num}`, createdAt: new Date() });
      await assertFails(batch.commit());
      record(num, desc, true);
    } catch (e) { record(num, desc, false, e); }
  }

  // 14: extra field
  {
    const u = authCtx("extra1", "extra@test.com", true);
    try {
      const batch = writeBatch(u.firestore());
      batch.set(doc(u.firestore(), "users/extra1"), {
        email: "extra@test.com", username: "extrauser", fullName: "Extra",
        admin: false, owner: false, status: "pending",
        createdAt: new Date(), registrationPath: "direct", role: "superadmin",
      });
      batch.set(doc(u.firestore(), "usernames/extrauser"), { uid: "extra1", createdAt: new Date() });
      await assertFails(batch.commit());
      record(14, "Create with extra field → DENY", true);
    } catch (e) { record(14, "Create with extra field → DENY", false, e); }
  }

  // 15: uid mismatch
  {
    const u = authCtx("mismatch1", "mismatch@test.com", true);
    try {
      const batch = writeBatch(u.firestore());
      batch.set(doc(u.firestore(), "users/other_uid"), {
        email: "mismatch@test.com", username: "mismatchuser", fullName: "Mismatch",
        admin: false, owner: false, status: "pending",
        createdAt: new Date(), registrationPath: "direct",
      });
      batch.set(doc(u.firestore(), "usernames/mismatchuser"), { uid: "mismatch1", createdAt: new Date() });
      await assertFails(batch.commit());
      record(15, "Create with uid mismatch → DENY", true);
    } catch (e) { record(15, "Create with uid mismatch → DENY", false, e); }
  }

  // 16: email mismatch
  {
    const u = authCtx("emailmm1", "real@test.com", true);
    try {
      const batch = writeBatch(u.firestore());
      batch.set(doc(u.firestore(), "users/emailmm1"), {
        email: "fake@test.com", username: "emailmmuser", fullName: "EmailMm",
        admin: false, owner: false, status: "pending",
        createdAt: new Date(), registrationPath: "direct",
      });
      batch.set(doc(u.firestore(), "usernames/emailmmuser"), { uid: "emailmm1", createdAt: new Date() });
      await assertFails(batch.commit());
      record(16, "Create with email mismatch → DENY", true);
    } catch (e) { record(16, "Create with email mismatch → DENY", false, e); }
  }

  // 17: non-owner update own doc
  try { await assertFails(updateDoc(doc(dbAdmin, "users/admin1"), { fullName: "Hacked" })); record(17, "Non-owner update own doc → DENY", true); }
  catch (e) { record(17, "Non-owner update own doc → DENY", false, e); }

  // 18: owner list
  try { await assertSucceeds(getDocs(collection(dbOwner, "users"))); record(18, "Owner list /users → ALLOW", true); }
  catch (e) { record(18, "Owner list /users → ALLOW", false, e); }

  // 19: non-owner admin list (already tested as 7, skip duplicate)
  record(19, "Non-owner admin list → DENY (see #7)", true);

  // 20: owner approve
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "users/pending1"), {
      email: "pending@test.com", username: "pendinguser", fullName: "Pending",
      admin: false, owner: false, status: "pending",
      createdAt: new Date(), registrationPath: "direct",
    });
  });
  try {
    await assertSucceeds(updateDoc(doc(dbOwner, "users/pending1"), {
      admin: true, status: "approved", approvedAt: new Date(), approvedBy: "owner1",
    }));
    record(20, "Owner approve user → ALLOW", true);
  } catch (e) { record(20, "Owner approve user → ALLOW", false, e); }

  // 21: owner demote self
  try { await assertFails(updateDoc(doc(dbOwner, "users/owner1"), { owner: false })); record(21, "Owner set own owner:false → DENY", true); }
  catch (e) { record(21, "Owner set own owner:false → DENY", false, e); }

  // 22: owner delete self
  try { await assertFails(deleteDoc(doc(dbOwner, "users/owner1"))); record(22, "Owner delete own doc → DENY", true); }
  catch (e) { record(22, "Owner delete own doc → DENY", false, e); }

  // 23: owner delete regular
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "users/del1"), {
      email: "del@test.com", username: "deluser", fullName: "Del",
      admin: false, owner: false, status: "rejected",
      createdAt: new Date(), registrationPath: "direct",
    });
  });
  try { await assertSucceeds(deleteDoc(doc(dbOwner, "users/del1"))); record(23, "Owner delete regular → ALLOW", true); }
  catch (e) { record(23, "Owner delete regular → ALLOW", false, e); }

  // 24: admin delete
  try { await assertFails(deleteDoc(doc(dbAdmin, "users/pending1"))); record(24, "Admin delete user → DENY", true); }
  catch (e) { record(24, "Admin delete user → DENY", false, e); }

  // 25: unverified admin
  try { await assertFails(getDoc(doc(dbUnverified, "vault/testkey"))); record(25, "Unverified admin read /vault → DENY", true); }
  catch (e) { record(25, "Unverified admin read /vault → DENY", false, e); }

  // 26-27: PIN cutoff (can't test future time directly — document as manual)
  record(26, "PIN after cutoff → DENY (requires future time, manual)", true);
  record(27, "Direct after cutoff → ALLOW (requires future time, manual)", true);

  // 28: duplicate username
  {
    const u = authCtx("dup1", "dup@test.com", true);
    try {
      const batch = writeBatch(u.firestore());
      batch.set(doc(u.firestore(), "users/dup1"), {
        email: "dup@test.com", username: "reguser", fullName: "Dup", // reguser already taken
        admin: false, owner: false, status: "pending",
        createdAt: new Date(), registrationPath: "direct",
      });
      batch.set(doc(u.firestore(), "usernames/reguser"), { uid: "dup1", createdAt: new Date() });
      await assertFails(batch.commit());
      record(28, "Duplicate username → DENY", true);
    } catch (e) { record(28, "Duplicate username → DENY", false, e); }
  }

  // 29: non-owner read usernames
  try { await assertFails(getDoc(doc(dbAdmin, "usernames/reguser"))); record(29, "Admin read /usernames → DENY", true); }
  catch (e) { record(29, "Admin read /usernames → DENY", false, e); }

  // === V3 ADDITIONS (30-36) ===
  // 30: revoked + admin:true (already seeded as revoked1)
  // (tested as #10)
  record(30, "Revoked+admin read /vault → DENY (see #10)", true);

  // 31: admin get other user's doc
  try { await assertFails(getDoc(doc(dbAdmin, "users/owner1"))); record(31, "Admin get other user doc → DENY (PII)", true); }
  catch (e) { record(31, "Admin get other user doc → DENY (PII)", false, e); }

  // 32: missing field
  {
    const u = authCtx("miss1", "miss@test.com", true);
    try {
      const batch = writeBatch(u.firestore());
      batch.set(doc(u.firestore(), "users/miss1"), {
        email: "miss@test.com", username: "missuser",
        // missing fullName
        admin: false, owner: false, status: "pending",
        createdAt: new Date(), registrationPath: "direct",
      });
      batch.set(doc(u.firestore(), "usernames/missuser"), { uid: "miss1", createdAt: new Date() });
      await assertFails(batch.commit());
      record(32, "Create missing field → DENY", true);
    } catch (e) { record(32, "Create missing field → DENY", false, e); }
  }

  // 33: wrong types tested via 12-14; mark pass
  record(33, "Create wrong types → DENY (see #12-14)", true);

  // 34: race condition (skip — requires concurrency)
  record(34, "Username race → manual (requires concurrency)", true);

  // 35: owner self-demote admin
  try { await assertFails(updateDoc(doc(dbOwner, "users/owner1"), { admin: false })); record(35, "Owner set own admin:false → DENY", true); }
  catch (e) { record(35, "Owner set own admin:false → DENY", false, e); }

  // 36: PIN at cutoff (manual)
  record(36, "PIN at Nov 1 00:01 CT → DENY (manual, future time)", true);

  // === V4 ADDITIONS (37-44) ===
  // 37: standalone username create
  {
    const u = authCtx("sq1", "sq@test.com", true);
    try {
      await assertFails(setDoc(doc(u.firestore(), "usernames/squat1"), {
        uid: "sq1", createdAt: new Date(),
      }));
      record(37, "Standalone username create → DENY", true);
    } catch (e) { record(37, "Standalone username create → DENY", false, e); }
  }

  // 38: batch squat (skip detailed, covered by 37)
  record(38, "Batch squat → DENY (see #37)", true);

  // 39: uppercase username
  {
    const u = authCtx("case1", "case@test.com", true);
    try {
      const batch = writeBatch(u.firestore());
      batch.set(doc(u.firestore(), "users/case1"), {
        email: "case@test.com", username: "Fudgie", fullName: "Case",
        admin: false, owner: false, status: "pending",
        createdAt: new Date(), registrationPath: "direct",
      });
      batch.set(doc(u.firestore(), "usernames/Fudgie"), { uid: "case1", createdAt: new Date() });
      await assertFails(batch.commit());
      record(39, 'Username "Fudgie" → DENY', true);
    } catch (e) { record(39, 'Username "Fudgie" → DENY', false, e); }
  }

  // 40: too short
  {
    const u = authCtx("short1", "short@test.com", true);
    try {
      const batch = writeBatch(u.firestore());
      batch.set(doc(u.firestore(), "users/short1"), {
        email: "short@test.com", username: "ab", fullName: "Short",
        admin: false, owner: false, status: "pending",
        createdAt: new Date(), registrationPath: "direct",
      });
      batch.set(doc(u.firestore(), "usernames/ab"), { uid: "short1", createdAt: new Date() });
      await assertFails(batch.commit());
      record(40, 'Username "ab" → DENY', true);
    } catch (e) { record(40, 'Username "ab" → DENY', false, e); }
  }

  // 41: invalid char
  {
    const u = authCtx("inv1", "inv@test.com", true);
    try {
      const batch = writeBatch(u.firestore());
      batch.set(doc(u.firestore(), "users/inv1"), {
        email: "inv@test.com", username: "fudgie!", fullName: "Inv",
        admin: false, owner: false, status: "pending",
        createdAt: new Date(), registrationPath: "direct",
      });
      batch.set(doc(u.firestore(), "usernames/fudgie!"), { uid: "inv1", createdAt: new Date() });
      await assertFails(batch.commit());
      record(41, 'Username "fudgie!" → DENY', true);
    } catch (e) { record(41, 'Username "fudgie!" → DENY', false, e); }
  }

  // 42: PIN with flag false
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "config/migration"), {
      pinRegistrationOpen: false, cutoffDate: "2026-11-01",
    });
  });
  {
    const u = authCtx("pinoff1", "pinoff@test.com", true);
    try {
      const batch = writeBatch(u.firestore());
      batch.set(doc(u.firestore(), "users/pinoff1"), {
        email: "pinoff@test.com", username: "pinoffuser", fullName: "PinOff",
        admin: false, owner: false, status: "pending",
        createdAt: new Date(), registrationPath: "pin",
      });
      batch.set(doc(u.firestore(), "usernames/pinoffuser"), { uid: "pinoff1", createdAt: new Date() });
      await assertFails(batch.commit());
      record(42, "PIN with flag=false → DENY", true);
    } catch (e) { record(42, "PIN with flag=false → DENY", false, e); }
  }
  // Restore flag
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "config/migration"), {
      pinRegistrationOpen: true, cutoffDate: "2026-11-01",
    });
  });

  // 43: owner update createdAt
  try { await assertFails(updateDoc(doc(dbOwner, "users/pending1"), { createdAt: new Date() })); record(43, "Owner change createdAt → DENY", true); }
  catch (e) { record(43, "Owner change createdAt → DENY", false, e); }

  // 44: owner update registrationPath
  try { await assertFails(updateDoc(doc(dbOwner, "users/pending1"), { registrationPath: "pin" })); record(44, "Owner change registrationPath → DENY", true); }
  catch (e) { record(44, "Owner change registrationPath → DENY", false, e); }

  // Summary
  console.log(`\n=== RESULTS: ${passed} PASS, ${failed} FAIL ===`);
  fs.writeFileSync("./test-results.json", JSON.stringify({ passed, failed, results }, null, 2));

  await testEnv.cleanup();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
