// TSCMS v4 Firestore Rules — Security Test Suite v2
// CORRECTED per Clara's review: port 8080, serverTimestamp, honest NOT_TESTED labels
// Run: node test-v4.js (emulator must be running on 127.0.0.1:8080)

const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, writeBatch, serverTimestamp } = require("firebase/firestore");
const fs = require("fs");

const PROJECT_ID = "demo-tscms-security";
const PORT = 8080; // MUST match firebase.json
let passed = 0, failed = 0, notTested = 0;
const results = [];

function record(num, desc, status, err) {
  if (status === "PASS") passed++;
  else if (status === "FAIL") failed++;
  else notTested++;
  results.push({ num, desc, status, error: err ? String(err).slice(0, 300) : null });
  console.log(`${status} #${num}: ${desc}`);
}
const not_tested = (num, desc, reason) => record(num, desc, "NOT_TESTED", new Error(reason));

async function main() {
  const rules = fs.readFileSync("./firestore.rules", "utf8");
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules, host: "127.0.0.1", port: PORT },
  });

  const authCtx = (uid, email, verified) =>
    testEnv.authenticatedContext(uid, { email, email_verified: verified });

  // Seed data (rules disabled for setup)
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const seed = (uid, data) => setDoc(doc(db, `users/${uid}`), {
      ...data, createdAt: serverTimestamp(), registrationPath: "direct",
    });
    await seed("owner1", { email: "owner@test.com", username: "owneruser", fullName: "Owner User", admin: true, owner: true, status: "approved" });
    await seed("admin1", { email: "admin@test.com", username: "adminuser", fullName: "Admin User", admin: true, owner: false, status: "approved" });
    await seed("revoked1", { email: "revoked@test.com", username: "revokeduser", fullName: "Revoked User", admin: true, owner: false, status: "revoked" });
    await seed("plain1", { email: "plain@test.com", username: "plainuser", fullName: "Plain User", admin: false, owner: false, status: "approved" });
    await seed("pending1", { email: "pending@test.com", username: "pendinguser", fullName: "Pending User", admin: false, owner: false, status: "pending" });
    await setDoc(doc(db, "config/migration"), { pinRegistrationOpen: true, cutoffDate: "2026-11-01" });
    await setDoc(doc(db, "vault/testkey"), { key: "secret123" });
  });

  const noAuth = testEnv.unauthenticatedContext();
  const owner = authCtx("owner1", "owner@test.com", true);
  const adm = authCtx("admin1", "admin@test.com", true);
  const revoked = authCtx("revoked1", "revoked@test.com", true);
  const unverified = authCtx("admin1", "admin@test.com", false);
  const plain = authCtx("plain1", "plain@test.com", true);
  const noDoc = authCtx("nodoc1", "nodoc@test.com", true);

  const D = {
    noAuth: noAuth.firestore(), owner: owner.firestore(), admin: adm.firestore(),
    revoked: revoked.firestore(), unverified: unverified.firestore(),
    plain: plain.firestore(), noDoc: noDoc.firestore(),
  };

  // Helper for paired registration
  const pairedReg = (ctx, uid, email, username) => {
    const db = ctx.firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, `users/${uid}`), {
      email, username, fullName: "Test User",
      admin: false, owner: false, status: "pending",
      createdAt: serverTimestamp(), registrationPath: "direct",
    });
    batch.set(doc(db, `usernames/${username}`), { uid, createdAt: serverTimestamp() });
    return batch.commit();
  };

  // === ORIGINAL 10 ===
  try { await assertFails(getDoc(doc(D.noAuth, "vault/testkey"))); record(1, "Signed-out read /vault → DENY", "PASS"); }
  catch (e) { record(1, "Signed-out read /vault → DENY", "FAIL", e); }

  try { await assertFails(getDoc(doc(D.noDoc, "vault/testkey"))); record(2, "No-doc user read /vault → DENY", "PASS"); }
  catch (e) { record(2, "No-doc user read /vault → DENY", "FAIL", e); }

  try { await assertFails(getDoc(doc(D.plain, "vault/testkey"))); record(3, "Non-admin read /vault → DENY", "PASS"); }
  catch (e) { record(3, "Non-admin read /vault → DENY", "FAIL", e); }

  try { await assertSucceeds(getDoc(doc(D.admin, "vault/testkey"))); record(4, "Approved admin read /vault → ALLOW", "PASS"); }
  catch (e) { record(4, "Approved admin read /vault → ALLOW", "FAIL", e); }

  try { await assertFails(setDoc(doc(D.admin, "users/hacker1"), { email: "x@x.com" })); record(5, "Admin write other user → DENY", "PASS"); }
  catch (e) { record(5, "Admin write other user → DENY", "FAIL", e); }

  { // 6: privilege injection
    const u = authCtx("inj6", "inj6@test.com", true);
    try {
      const db = u.firestore(); const batch = writeBatch(db);
      batch.set(doc(db, "users/inj6"), { email: "inj6@test.com", username: "injuser6", fullName: "Inj", admin: true, owner: false, status: "pending", createdAt: serverTimestamp(), registrationPath: "direct" });
      batch.set(doc(db, "usernames/injuser6"), { uid: "inj6", createdAt: serverTimestamp() });
      await assertFails(batch.commit()); record(6, "Create with admin:true → DENY", "PASS");
    } catch (e) { record(6, "Create with admin:true → DENY", "FAIL", e); }
  }

  try { await assertFails(getDocs(collection(D.admin, "users"))); record(7, "Admin list /users → DENY", "PASS"); }
  catch (e) { record(7, "Admin list /users → DENY", "FAIL", e); }

  try { await assertSucceeds(getDoc(doc(D.admin, "users/admin1"))); record(8, "Get own doc → ALLOW", "PASS"); }
  catch (e) { record(8, "Get own doc → ALLOW", "FAIL", e); }

  try { await assertFails(setDoc(doc(D.noAuth, "users/x"), { a: 1 })); record(9, "Signed-out write → DENY", "PASS"); }
  catch (e) { record(9, "Signed-out write → DENY", "FAIL", e); }

  try { await assertFails(getDoc(doc(D.revoked, "vault/testkey"))); record(10, "Revoked admin read /vault → DENY", "PASS"); }
  catch (e) { record(10, "Revoked admin read /vault → DENY", "FAIL", e); }

  // === V2 (11-29) ===
  { // 11: valid paired registration
    const u = authCtx("reg11", "reg11@test.com", true);
    try { await assertSucceeds(pairedReg(u, "reg11", "reg11@test.com", "reguser11")); record(11, "Valid paired registration → ALLOW", "PASS"); }
    catch (e) { record(11, "Valid paired registration → ALLOW", "FAIL", e); }
  }

  { // 12: owner:true injection
    const u = authCtx("inj12", "inj12@test.com", true);
    try {
      const db = u.firestore(); const batch = writeBatch(db);
      batch.set(doc(db, "users/inj12"), { email: "inj12@test.com", username: "injuser12", fullName: "Inj", admin: false, owner: true, status: "pending", createdAt: serverTimestamp(), registrationPath: "direct" });
      batch.set(doc(db, "usernames/injuser12"), { uid: "inj12", createdAt: serverTimestamp() });
      await assertFails(batch.commit()); record(12, "Create with owner:true → DENY", "PASS");
    } catch (e) { record(12, "Create with owner:true → DENY", "FAIL", e); }
  }

  { // 13: extra field
    const u = authCtx("ext13", "ext13@test.com", true);
    try {
      const db = u.firestore(); const batch = writeBatch(db);
      batch.set(doc(db, "users/ext13"), { email: "ext13@test.com", username: "extuser13", fullName: "Ext", admin: false, owner: false, status: "pending", createdAt: serverTimestamp(), registrationPath: "direct", role: "superadmin" });
      batch.set(doc(db, "usernames/extuser13"), { uid: "ext13", createdAt: serverTimestamp() });
      await assertFails(batch.commit()); record(13, "Create with extra field → DENY", "PASS");
    } catch (e) { record(13, "Create with extra field → DENY", "FAIL", e); }
  }

  { // 14: uid mismatch
    const u = authCtx("mm14", "mm14@test.com", true);
    try {
      const db = u.firestore(); const batch = writeBatch(db);
      batch.set(doc(db, "users/OTHER_UID"), { email: "mm14@test.com", username: "mmuser14", fullName: "Mm", admin: false, owner: false, status: "pending", createdAt: serverTimestamp(), registrationPath: "direct" });
      batch.set(doc(db, "usernames/mmuser14"), { uid: "mm14", createdAt: serverTimestamp() });
      await assertFails(batch.commit()); record(14, "Create uid mismatch → DENY", "PASS");
    } catch (e) { record(14, "Create uid mismatch → DENY", "FAIL", e); }
  }

  { // 15: email mismatch
    const u = authCtx("em15", "real15@test.com", true);
    try {
      const db = u.firestore(); const batch = writeBatch(db);
      batch.set(doc(db, "users/em15"), { email: "fake@test.com", username: "emuser15", fullName: "Em", admin: false, owner: false, status: "pending", createdAt: serverTimestamp(), registrationPath: "direct" });
      batch.set(doc(db, "usernames/emuser15"), { uid: "em15", createdAt: serverTimestamp() });
      await assertFails(batch.commit()); record(15, "Create email mismatch → DENY", "PASS");
    } catch (e) { record(15, "Create email mismatch → DENY", "FAIL", e); }
  }

  try { await assertFails(updateDoc(doc(D.admin, "users/admin1"), { fullName: "Hacked" })); record(16, "Non-owner update own doc → DENY", "PASS"); }
  catch (e) { record(16, "Non-owner update own doc → DENY", "FAIL", e); }

  try { await assertSucceeds(getDocs(collection(D.owner, "users"))); record(17, "Owner list /users → ALLOW", "PASS"); }
  catch (e) { record(17, "Owner list /users → ALLOW", "FAIL", e); }

  try { await assertFails(getDocs(collection(D.plain, "users"))); record(18, "Non-owner list /users → DENY", "PASS"); }
  catch (e) { record(18, "Non-owner list /users → DENY", "FAIL", e); }

  try {
    await assertSucceeds(updateDoc(doc(D.owner, "users/pending1"), { admin: true, status: "approved", approvedAt: serverTimestamp(), approvedBy: "owner1" }));
    record(19, "Owner approve user → ALLOW", "PASS");
  } catch (e) { record(19, "Owner approve user → ALLOW", "FAIL", e); }

  try { await assertFails(updateDoc(doc(D.owner, "users/owner1"), { owner: false })); record(20, "Owner remove own owner flag → DENY", "PASS"); }
  catch (e) { record(20, "Owner remove own owner flag → DENY", "FAIL", e); }

  try { await assertFails(deleteDoc(doc(D.owner, "users/owner1"))); record(21, "Owner delete own doc → DENY", "PASS"); }
  catch (e) { record(21, "Owner delete own doc → DENY", "FAIL", e); }

  { // 22: owner delete regular user
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/del22"), { email: "del@test.com", username: "deluser22", fullName: "Del", admin: false, owner: false, status: "rejected", createdAt: serverTimestamp(), registrationPath: "direct" });
    });
    try { await assertSucceeds(deleteDoc(doc(D.owner, "users/del22"))); record(22, "Owner delete regular → ALLOW", "PASS"); }
    catch (e) { record(22, "Owner delete regular → ALLOW", "FAIL", e); }
  }

  try { await assertFails(deleteDoc(doc(D.admin, "users/pending1"))); record(23, "Admin delete user → DENY", "PASS"); }
  catch (e) { record(23, "Admin delete user → DENY", "FAIL", e); }

  try { await assertFails(getDoc(doc(D.unverified, "vault/testkey"))); record(24, "Unverified admin read /vault → DENY", "PASS"); }
  catch (e) { record(24, "Unverified admin read /vault → DENY", "FAIL", e); }

  // 25-26: PIN cutoff requires future time — NOT_TESTED honestly
  not_tested(25, "PIN registration after Nov 1 cutoff → DENY", "Requires request.time > Nov 1 2026; emulator clock is Oct 2026");
  not_tested(26, "Direct registration after cutoff → ALLOW (pending)", "Requires request.time > Nov 1 2026; emulator clock is Oct 2026");

  { // 27: duplicate username
    const u = authCtx("dup27", "dup27@test.com", true);
    try {
      const db = u.firestore(); const batch = writeBatch(db);
      batch.set(doc(db, "users/dup27"), { email: "dup27@test.com", username: "reguser11", fullName: "Dup", admin: false, owner: false, status: "pending", createdAt: serverTimestamp(), registrationPath: "direct" });
      batch.set(doc(db, "usernames/reguser11"), { uid: "dup27", createdAt: serverTimestamp() });
      await assertFails(batch.commit()); record(27, "Duplicate username → DENY", "PASS");
    } catch (e) { record(27, "Duplicate username → DENY", "FAIL", e); }
  }

  try { await assertFails(getDoc(doc(D.admin, "usernames/reguser11"))); record(28, "Admin read /usernames → DENY", "PASS"); }
  catch (e) { record(28, "Admin read /usernames → DENY", "FAIL", e); }

  // #29 was duplicate of #18 in old numbering; renumbered below

  // === V3 (29-36) ===
  try { await assertFails(getDoc(doc(D.admin, "users/owner1"))); record(29, "Admin get other user doc → DENY (PII)", "PASS"); }
  catch (e) { record(29, "Admin get other user doc → DENY (PII)", "FAIL", e); }

  { // 30: missing required field
    const u = authCtx("miss30", "miss30@test.com", true);
    try {
      const db = u.firestore(); const batch = writeBatch(db);
      batch.set(doc(db, "users/miss30"), { email: "miss30@test.com", username: "missuser30", admin: false, owner: false, status: "pending", createdAt: serverTimestamp(), registrationPath: "direct" }); // no fullName
      batch.set(doc(db, "usernames/missuser30"), { uid: "miss30", createdAt: serverTimestamp() });
      await assertFails(batch.commit()); record(30, "Create missing fullName → DENY", "PASS");
    } catch (e) { record(30, "Create missing fullName → DENY", "FAIL", e); }
  }

  { // 31: wrong type (admin as string)
    const u = authCtx("type31", "type31@test.com", true);
    try {
      const db = u.firestore(); const batch = writeBatch(db);
      batch.set(doc(db, "users/type31"), { email: "type31@test.com", username: "typeuser31", fullName: "Type", admin: "true", owner: false, status: "pending", createdAt: serverTimestamp(), registrationPath: "direct" });
      batch.set(doc(db, "usernames/typeuser31"), { uid: "type31", createdAt: serverTimestamp() });
      await assertFails(batch.commit()); record(31, "Create admin as string → DENY", "PASS");
    } catch (e) { record(31, "Create admin as string → DENY", "FAIL", e); }
  }

  not_tested(32, "Username race (concurrent) → one ALLOW one DENY", "Requires concurrent batch writes; not implemented in sequential test");

  try { await assertFails(updateDoc(doc(D.owner, "users/owner1"), { admin: false })); record(33, "Owner self-demote admin → DENY", "PASS"); }
  catch (e) { record(33, "Owner self-demote admin → DENY", "FAIL", e); }

  try { await assertFails(updateDoc(doc(D.owner, "users/owner1"), { status: "revoked" })); record(34, "Owner self-revoke status → DENY", "PASS"); }
  catch (e) { record(34, "Owner self-revoke status → DENY", "FAIL", e); }

  not_tested(35, "PIN at Nov 1 00:01 CT → DENY (boundary)", "Requires request.time = Nov 1 00:01 CT; emulator clock is Oct 2026");
  not_tested(36, "PIN at Oct 31 23:59 CT → ALLOW (boundary)", "Requires request.time = Oct 31 23:59 CT; emulator clock close but not exact");

  // === V4 (37-44) ===
  { // 37: standalone username squat
    const u = authCtx("sq37", "sq37@test.com", true);
    try {
      await assertFails(setDoc(doc(u.firestore(), "usernames/squat37"), { uid: "sq37", createdAt: serverTimestamp() }));
      record(37, "Standalone username create → DENY", "PASS");
    } catch (e) { record(37, "Standalone username create → DENY", "FAIL", e); }
  }

  { // 38: batch squat — 5 standalone username creates in one batch
    const u = authCtx("sq38", "sq38@test.com", true);
    try {
      const db = u.firestore(); const batch = writeBatch(db);
      for (let i = 0; i < 5; i++) batch.set(doc(db, `usernames/squat38_${i}`), { uid: "sq38", createdAt: serverTimestamp() });
      await assertFails(batch.commit()); record(38, "Batch of 5 standalone squats → DENY", "PASS");
    } catch (e) { record(38, "Batch of 5 standalone squats → DENY", "FAIL", e); }
  }

  { // 39: uppercase username
    const u = authCtx("case39", "case39@test.com", true);
    try {
      const db = u.firestore(); const batch = writeBatch(db);
      batch.set(doc(db, "users/case39"), { email: "case39@test.com", username: "Fudgie", fullName: "Case", admin: false, owner: false, status: "pending", createdAt: serverTimestamp(), registrationPath: "direct" });
      batch.set(doc(db, "usernames/Fudgie"), { uid: "case39", createdAt: serverTimestamp() });
      await assertFails(batch.commit()); record(39, 'Username "Fudgie" → DENY', "PASS");
    } catch (e) { record(39, 'Username "Fudgie" → DENY', "FAIL", e); }
  }

  { // 40: too short
    const u = authCtx("sh40", "sh40@test.com", true);
    try {
      const db = u.firestore(); const batch = writeBatch(db);
      batch.set(doc(db, "users/sh40"), { email: "sh40@test.com", username: "ab", fullName: "Short", admin: false, owner: false, status: "pending", createdAt: serverTimestamp(), registrationPath: "direct" });
      batch.set(doc(db, "usernames/ab"), { uid: "sh40", createdAt: serverTimestamp() });
      await assertFails(batch.commit()); record(40, 'Username "ab" → DENY', "PASS");
    } catch (e) { record(40, 'Username "ab" → DENY', "FAIL", e); }
  }

  { // 41: invalid char
    const u = authCtx("inv41", "inv41@test.com", true);
    try {
      const db = u.firestore(); const batch = writeBatch(db);
      batch.set(doc(db, "users/inv41"), { email: "inv41@test.com", username: "fudgie!", fullName: "Inv", admin: false, owner: false, status: "pending", createdAt: serverTimestamp(), registrationPath: "direct" });
      batch.set(doc(db, "usernames/fudgie!"), { uid: "inv41", createdAt: serverTimestamp() });
      await assertFails(batch.commit()); record(41, 'Username "fudgie!" → DENY', "PASS");
    } catch (e) { record(41, 'Username "fudgie!" → DENY', "FAIL", e); }
  }

  { // 42: PIN with flag=false
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "config/migration"), { pinRegistrationOpen: false, cutoffDate: "2026-11-01" });
    });
    const u = authCtx("pinoff42", "pinoff42@test.com", true);
    try {
      const db = u.firestore(); const batch = writeBatch(db);
      batch.set(doc(db, "users/pinoff42"), { email: "pinoff42@test.com", username: "pinoffuser42", fullName: "PinOff", admin: false, owner: false, status: "pending", createdAt: serverTimestamp(), registrationPath: "pin" });
      batch.set(doc(db, "usernames/pinoffuser42"), { uid: "pinoff42", createdAt: serverTimestamp() });
      await assertFails(batch.commit()); record(42, "PIN with flag=false → DENY", "PASS");
    } catch (e) { record(42, "PIN with flag=false → DENY", "FAIL", e); }
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "config/migration"), { pinRegistrationOpen: true, cutoffDate: "2026-11-01" });
    });
  }

  try { await assertFails(updateDoc(doc(D.owner, "users/pending1"), { createdAt: serverTimestamp() })); record(43, "Owner change createdAt → DENY", "PASS"); }
  catch (e) { record(43, "Owner change createdAt → DENY", "FAIL", e); }

  try { await assertFails(updateDoc(doc(D.owner, "users/pending1"), { registrationPath: "pin" })); record(44, "Owner change registrationPath → DENY", "PASS"); }
  catch (e) { record(44, "Owner change registrationPath → DENY", "FAIL", e); }

  console.log(`\n=== RESULTS: ${passed} PASS, ${failed} FAIL, ${notTested} NOT_TESTED ===`);
  fs.writeFileSync("./test-results.json", JSON.stringify({ passed, failed, notTested, results }, null, 2));
  await testEnv.cleanup();

  // Exit non-zero if any test FAILED — GitHub Actions must show red, not green
  if (failed > 0) {
    console.error(`\n${failed} test(s) FAILED — exiting with code 1`);
    process.exit(1);
  }
  console.log("\nAll executed tests passed.");
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
