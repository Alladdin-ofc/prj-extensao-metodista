// Fail closed before loading SDKs: only pre-existing local demo emulators, never cloud.
const projectId = require('./emulator-env').requireEmulators();
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { collection, collectionGroup, doc, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp, Timestamp, setLogLevel } = require('firebase/firestore');
let env;
const eventId = 'program-holy-communion-2026-11-01-1900';
const data = () => ({ eventId, title: 'Santa Ceia', date: '2026-11-01', time: '19:00', status: 'confirmed', confirmedAt: serverTimestamp() });
const store = uid => uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore();
const reference = (uid = 'alice', owner = 'alice', id = eventId) => doc(store(uid), 'users', owner, 'attendance', id);
setLogLevel('silent');
before(async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  if (projectId !== 'demo-metodista-backend' || Number(port) > 65535) throw new Error('Local demo emulator required');
  env = await initializeTestEnvironment({ projectId, firestore: {
    host, port: Number(port), rules: readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8')
  } });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    for (const role of ['admin', 'master']) await setDoc(doc(context.firestore(), 'adminRoles', role), { role });
  });
});
after(async () => { if (env) await env.cleanup(); });

test('owner confirms, reads/lists own occurrences, cancels and can delete', async () => {
  await assertSucceeds(setDoc(reference(), data()));
  await assertSucceeds(getDoc(reference()));
  await assertSucceeds(getDocs(collection(store('alice'), 'users/alice/attendance')));
  await assertSucceeds(setDoc(reference(), { ...data(), status: 'cancelled' }));
  await assertSucceeds(deleteDoc(reference()));
});
test('individual remote and program dates do not overwrite each other', async () => {
  const ids = [eventId, 'program-holy-communion-2026-12-06-1900', 'remote-abc-2026-11-01-1900'];
  for (const id of ids) await assertSucceeds(setDoc(reference('alice', 'alice', id), {
    ...data(), eventId: id, date: id.includes('2026-12') ? '2026-12-06' : '2026-11-01'
  }));
  const documents = await getDocs(collection(store('alice'), 'users/alice/attendance'));
  require('node:assert/strict').equal(documents.size, 3);
});
for (const uid of [null, 'bob', 'admin', 'master']) test(`${uid || 'guest'} cannot read/list/write/delete another person's attendance or a global roster`, async () => {
  await assertSucceeds(setDoc(reference(), data()));
  await assertFails(getDoc(reference(uid)));
  await assertFails(getDocs(collection(store(uid), 'users/alice/attendance')));
  await assertFails(getDocs(collectionGroup(store(uid), 'attendance')));
  await assertFails(setDoc(reference(uid), data()));
  await assertFails(deleteDoc(reference(uid)));
});
test('schema rejects PII, extra/missing fields, bad types, invalid dates/times/status/timestamps and unsafe IDs', async () => {
  const bad = [
    { email: 'private@example.test' }, { uid: 'alice' }, { description: 'extra' }, { title: '' }, { title: 42 },
    { title: 'x'.repeat(201) }, { eventId: 'different' }, { status: 'pending' }, { status: true },
    { date: Timestamp.now() }, { date: '01/11/2026' }, { date: '2026-13-01' }, { date: '2026-02-30' },
    { date: '2027-02-29' }, { date: '2026-04-31' }, { date: '2200-01-01' }, { time: '24:00' }, { time: 19 },
    { time: '19:60' }, { confirmedAt: '2026-11-01T22:00:00.000Z' }, { confirmedAt: Timestamp.fromMillis(0) }
  ];
  for (const patch of bad) await assertFails(setDoc(reference(), { ...data(), ...patch }));
  for (const field of Object.keys(data())) {
    const incomplete = data(); delete incomplete[field]; await assertFails(setDoc(reference(), incomplete));
  }
  for (const id of ['bad.id', 'program-bad.id', 'remote-bad id', 'remote-' + 'x'.repeat(201)]) {
    await assertFails(setDoc(reference('alice', 'alice', id), { ...data(), eventId: id }));
  }
  // Reserved Firestore resource IDs are rejected before security rules are evaluated.
  await assert.rejects(setDoc(reference('alice', 'alice', '__unsafe__'), { ...data(), eventId: '__unsafe__' }),
    error => error.code === 'invalid-argument');
  await assertSucceeds(setDoc(reference(), { ...data(), date: '2028-02-29', time: '' }));
});
test('attendance does not grant global-event writes, profile escalation, adminRoles writes or nested public visibility', async () => {
  const db = store('alice');
  await assertFails(setDoc(doc(db, 'events', 'abc'), data()));
  await assertFails(setDoc(doc(db, 'events', 'abc', 'attendance', 'alice'), data()));
  await assertFails(setDoc(doc(db, 'users', 'alice'), { ...data(), role: 'master' }));
  await assertFails(setDoc(doc(db, 'adminRoles', 'alice'), { role: 'master' }));
  await assertFails(getDocs(collection(db, 'users')));
});
