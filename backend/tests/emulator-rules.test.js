const projectId = require('./emulator-env').requireEmulators();
const { test, before, beforeEach, after } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, setLogLevel } = require('firebase/firestore');
const { ref, uploadBytes, getBytes, deleteObject, listAll } = require('firebase/storage');
let env;
// Expected permission-denied assertions remain visible through test results, not SDK noise.
setLogLevel('silent');
const now = '2026-10-09T17:00:00.000Z';
const profile = { name: 'Member', email: 'member@example.test', dateOfBirth: '01/01/2000', phone: '(11) 99999-9999', phoneType: 'celular', address: 'Private street', city: 'City', state: 'SP', postalCode: '00000-000', avatarUrl: '', createdAt: now };
const event = { title: 'Event', description: 'Description', date: now, time: '19:00', category: 'eventos', type: 'special', createdAt: now };
const news = { message: 'Notice', publishDate: now, priority: 'normal' };
const info = { history: 'History', about: 'About', mission: 'Mission', pastorText: 'Pastor' };
const pix = { key: 'donation@example.test', label: 'Donation' };
const db = uid => uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore();
before(async () => {
  const host = key => { const [host, port] = process.env[key].split(':'); return { host, port: Number(port) }; };
  env = await initializeTestEnvironment({ projectId,
    firestore: { ...host('FIRESTORE_EMULATOR_HOST'), rules: readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8') },
    storage: { ...host('FIREBASE_STORAGE_EMULATOR_HOST'), rules: readFileSync(path.resolve(__dirname, '../storage.rules'), 'utf8') }
  });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async context => {
    const store = context.firestore();
    for (const [name, value] of Object.entries({ 'users/member': profile, 'adminRoles/admin': { role: 'admin' }, 'adminRoles/master': { role: 'master' }, 'adminMetadata/roles': { masterCount: 1 }, 'adminAudit/test': { actorUid: 'master' }, 'events/event': event, 'news/news': news, 'config/info': info, 'config/pix': pix })) {
      await setDoc(doc(store, name), value);
    }
  });
});
after(async () => { if (env) await env.cleanup(); });
test('guests read events, news and only public config documents', async () => {
  for (const name of ['events/event', 'news/news', 'config/info', 'config/pix']) await assertSucceeds(getDoc(doc(db(), name)));
  await assertFails(getDoc(doc(db(), 'config/private')));
  await assertFails(getDocs(collection(db(), 'config')));
});
test('owner can read/create/update/delete profile matching actual frontend schema', async () => {
  const ownerDb = db('new');
  const document = doc(ownerDb, 'users/new');
  await assertSucceeds(setDoc(document, profile));
  await assertSucceeds(getDoc(document));
  await assertSucceeds(updateDoc(document, { name: 'Changed', email: 'new@example.test', avatarUrl: 'https://example.test/avatar' }));
  await assertSucceeds(deleteDoc(document));
});
for (const uid of [undefined, 'other', 'admin', 'master']) {
  test(`profile privacy excludes ${uid || 'guest'} including elevated roles`, async () => {
    await assertFails(getDoc(doc(db(uid), 'users/member')));
    await assertFails(updateDoc(doc(db(uid), 'users/member'), { name: 'Attack' }));
    await assertFails(getDocs(collection(db(uid), 'users')));
  });
}
test('owner cannot inject role/admin/password fields or change creation timestamp', async () => {
  for (const value of [{ role: 'master' }, { isAdmin: true }, { password: 'weak' }, { createdAt: '2026-10-10T00:00:00.000Z' }, { name: 42 }, { avatarUrl: 'javascript:alert(1)' }, { extra: 'field' }]) {
    await assertFails(updateDoc(doc(db('member'), 'users/member'), value));
  }
});
test('registry own get only, server writes only for every client role', async () => {
  await assertSucceeds(getDoc(doc(db('master'), 'adminRoles/master')));
  await assertSucceeds(getDoc(doc(db('member'), 'adminRoles/member')));
  for (const uid of ['member', 'admin', 'master']) {
    await assertFails(setDoc(doc(db(uid), `adminRoles/${uid}`), { role: 'master' }));
    await assertFails(deleteDoc(doc(db(uid), `adminRoles/${uid}`)));
    await assertFails(getDocs(collection(db(uid), 'adminRoles')));
    await assertFails(getDoc(doc(db(uid), 'adminRoles/other')));
  }
});
test('metadata and audits completely private, immutable from clients', async () => {
  for (const name of ['adminMetadata/roles', 'adminAudit/test']) {
    await assertFails(getDoc(doc(db('master'), name)));
    await assertFails(setDoc(doc(db('master'), name), { masterCount: 99 }));
    await assertFails(deleteDoc(doc(db('master'), name)));
  }
});
for (const uid of ['admin', 'master']) {
  test(`${uid} writes all public content using canonical role`, async () => {
    for (const [name, value] of [['events/new', event], ['news/new', news], ['config/info', info], ['config/pix', pix]]) {
      await assertSucceeds(setDoc(doc(db(uid), name), value));
      await assertSucceeds(deleteDoc(doc(db(uid), name)));
    }
  });
}
test('guest/member public writes denied, including claimed master and special email', async () => {
  const forged = env.authenticatedContext('forged', { email: 'admin@admin.com', role: 'master', admin: true }).firestore();
  for (const store of [db(), db('member'), forged]) {
    for (const [name, value] of [['events/new', event], ['news/new', news], ['config/info', info], ['config/pix', pix]]) await assertFails(setDoc(doc(store, name), value));
  }
});
test('canonical revocation immediately denies content writes despite existing session', async () => {
  const existingSession = db('admin');
  await env.withSecurityRulesDisabled(context => deleteDoc(doc(context.firestore(), 'adminRoles/admin')));
  await assertFails(setDoc(doc(existingSession, 'news/new'), news));
});
test('malformed public fields rejected even for master', async () => {
  for (const [name, value] of [['events/new', { ...event, time: '25:00' }], ['events/new', { ...event, category: 'other' }], ['news/new', { ...news, message: 42 }], ['config/pix', { ...pix, secret: 'x' }], ['config/info', { ...info, mission: false }]]) await assertFails(setDoc(doc(db('master'), name), value));
});
test('info first creation supports any nonempty subset of known fields', async () => {
  await env.withSecurityRulesDisabled(context => deleteDoc(doc(context.firestore(), 'config/info')));
  await assertFails(setDoc(doc(db('admin'), 'config/info'), {}));
  await assertFails(setDoc(doc(db('admin'), 'config/info'), { unknown: 'new' }));
  await assertSucceeds(setDoc(doc(db('admin'), 'config/info'), { history: 'First history' }, { merge: true }));
  await assertSucceeds(setDoc(doc(db('admin'), 'config/info'), { mission: 'New mission' }, { merge: true }));
  await assertFails(setDoc(doc(db('admin'), 'config/info'), { about: 42 }, { merge: true }));
});
test('info merges preserve legacy unknown fields but cannot add/change/remove them', async () => {
  await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'config/info'), { history: 'Old', future: 'Preserved' }));
  await assertSucceeds(setDoc(doc(db('master'), 'config/info'), { history: 'Updated' }, { merge: true }));
  await assertFails(setDoc(doc(db('master'), 'config/info'), { future: 'Changed' }, { merge: true }));
  await assertFails(setDoc(doc(db('master'), 'config/info'), { another: 'New' }, { merge: true }));
  await assertFails(setDoc(doc(db('master'), 'config/info'), { history: 'Replacement' }));
});
test('profile merge can recover a missing profile with new createdAt', async () => {
  await assertSucceeds(setDoc(doc(db('new'), 'users/new'), profile, { merge: true }));
  await assertSucceeds(setDoc(doc(db('new'), 'users/new'), { name: 'Changed', createdAt: now }, { merge: true }));
});
test('avatarPath accepts only the exact authenticated owner path, never URLs/other owners/empty', async () => {
  const owner = doc(db('member'), 'users/member');
  await assertSucceeds(setDoc(owner, { avatarPath: 'avatars/member.jpg' }, { merge: true }));
  for (const avatarPath of ['', 'avatars/other.jpg', 'avatars/member.png', 'avatars/member.jpg/extra', 'https://example.test/avatar', 42]) {
    await assertFails(setDoc(owner, { avatarPath }, { merge: true }));
  }
  await assertSucceeds(setDoc(doc(db('new'), 'users/new'), { ...profile, avatarPath: 'avatars/new.jpg' }, { merge: true }));
});
test('unknown paths and nested collections default deny', async () => {
  for (const name of ['unknown/doc', 'users/member/private/doc', 'events/event/private/doc']) {
    await assertFails(getDoc(doc(db('master'), name)));
    await assertFails(setDoc(doc(db('master'), name), { value: 'x' }));
  }
});
test('avatar owner uploads, reads and deletes; private to others', async () => {
  const ownerStorage = env.authenticatedContext('member').storage();
  const avatar = ref(ownerStorage, 'avatars/member.jpg');
  await assertSucceeds(uploadBytes(avatar, new Uint8Array([1, 2, 3]), { contentType: 'image/jpeg' }));
  await assertSucceeds(getBytes(avatar));
  for (const context of [env.unauthenticatedContext(), env.authenticatedContext('other'), env.authenticatedContext('master')]) {
    await assertFails(getBytes(ref(context.storage(), 'avatars/member.jpg')));
    await assertFails(uploadBytes(ref(context.storage(), 'avatars/member.jpg'), new Uint8Array([1]), { contentType: 'image/jpeg' }));
    await assertFails(deleteObject(ref(context.storage(), 'avatars/member.jpg')));
  }
  await assertFails(listAll(ref(ownerStorage, 'avatars')));
  await assertSucceeds(deleteObject(avatar));
});
test('avatar refuses oversized, empty, non-image, SVG, wrong extension and unknown paths', async () => {
  const storage = env.authenticatedContext('member').storage();
  for (const [name, bytes, contentType] of [
    ['avatars/member.jpg', new Uint8Array(5 * 1024 * 1024 + 1), 'image/jpeg'],
    ['avatars/member.jpg', new Uint8Array(), 'image/jpeg'],
    ['avatars/member.jpg', new Uint8Array([1]), 'text/plain'],
    ['avatars/member.jpg', new Uint8Array([1]), 'image/svg+xml'],
    ['avatars/member.png', new Uint8Array([1]), 'image/png'],
    ['unknown/member.jpg', new Uint8Array([1]), 'image/jpeg']
  ]) await assertFails(uploadBytes(ref(storage, name), bytes, { contentType }));
});
