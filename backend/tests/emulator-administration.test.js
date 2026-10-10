const projectId = require('./emulator-env').requireEmulators();
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const sdk = require('node:module').createRequire(path.resolve(__dirname, '../functions/package.json'));
const { initializeApp, deleteApp } = sdk('firebase-admin/app');
const { getAuth } = sdk('firebase-admin/auth');
const { Firestore, FieldValue } = sdk('firebase-admin/firestore');
const { createAdministration } = require('../functions/src/administration');
const { createFirestoreStore } = require('../functions/src/firestore-store');
let app, db, auth, api;
// Test files run serially and clear fixtures; all services use the same demo project.
const isolatedProject = projectId;
before(async () => {
  app = initializeApp({ projectId: isolatedProject, credential: { getAccessToken: async () => ({ access_token: 'emulator-only', expires_in: 3600 }) } }, 'transaction-tests');
  db = new Firestore({ projectId: isolatedProject, host: process.env.FIRESTORE_EMULATOR_HOST, ssl: false });
  auth = getAuth(app);
  api = createAdministration({ auth, store: createFirestoreStore(db, () => FieldValue.serverTimestamp()) });
});
beforeEach(async () => {
  for (const name of ['adminRoles', 'adminMetadata', 'adminAudit', 'users']) {
    const snapshot = await db.collection(name).get();
    const batch = db.batch();
    snapshot.docs.forEach(document => batch.delete(document.ref));
    if (!snapshot.empty) await batch.commit();
  }
  for (const uid of ['m', 'u']) {
    try { await auth.deleteUser(uid); } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
    await auth.createUser({ uid, email: `${uid}@example.test` });
  }
  await db.doc('users/u').set({ name: 'Profile', phone: 'private', address: 'private', dateOfBirth: 'private' });
});
after(async () => { if (db) await db.terminate(); if (app) await deleteApp(app); });
test('real Firestore bootstrap/promotion/audit transaction and minimal Auth listing', async () => {
  await api.bootstrapMaster('m');
  await api.setMemberRole('m', { uid: 'u', role: 'master' });
  assert.equal((await db.doc('adminMetadata/roles').get()).data().masterCount, 2);
  assert.equal((await db.doc('adminRoles/u').get()).data().role, 'master');
  const audit = await db.collection('adminAudit').where('targetUid', '==', 'u').get();
  assert.equal(audit.size, 1);
  assert.equal(audit.docs[0].data().before, 'member');
  assert.equal(audit.docs[0].data().after, 'master');
  assert.ok(audit.docs[0].data().at.toDate());
  const page = await api.listMembers('m', { pageSize: 50 });
  assert.deepEqual(page.members.find(member => member.uid === 'u'), { uid: 'u', name: 'Profile', email: 'u@example.test', role: 'master' });
  assert.equal(page.nextPageToken, null);
});
test('real Firestore serializes concurrent demotions and retains one master', async () => {
  await api.bootstrapMaster('m');
  await api.setMemberRole('m', { uid: 'u', role: 'master' });
  const results = await Promise.allSettled([api.setMemberRole('m', { uid: 'u', role: 'member' }), api.setMemberRole('u', { uid: 'm', role: 'member' })]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal((await db.doc('adminMetadata/roles').get()).data().masterCount, 1);
  assert.equal((await db.collection('adminRoles').where('role', '==', 'master').get()).size, 1);
  assert.equal((await db.collection('adminAudit').get()).size, 3);
});
test('real Firestore rejects last-master removal without audit or count changes', async () => {
  await api.bootstrapMaster('m');
  await assert.rejects(api.setMemberRole('m', { uid: 'm', role: 'admin' }), { code: 'failed-precondition' });
  assert.equal((await db.doc('adminMetadata/roles').get()).data().masterCount, 1);
  assert.equal((await db.collection('adminAudit').get()).size, 1);
});
test('local bootstrap process initializes registry without ADC and repeats idempotently', async () => {
  const { spawnSync } = require('node:child_process');
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = spawnSync(process.execPath, [path.resolve(__dirname, '../functions/scripts/bootstrap-master.js'), '--uid', 'm', '--project', isolatedProject], {
      env: { FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST, FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST },
      encoding: 'utf8', timeout: 60000
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
  }
  assert.equal((await db.doc('adminRoles/m').get()).data().role, 'master');
  assert.equal((await db.doc('adminMetadata/roles').get()).data().masterCount, 1);
  assert.equal((await db.collection('adminAudit').get()).size, 1);
});
