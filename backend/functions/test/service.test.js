const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAdministration } = require('../src/administration');

// External Auth/Firestore are replaced at the I/O boundary only; business logic is real.
function fixture() {
  let state = { roles: { m: { role: 'master' } }, profiles: { u: { name: 'User', phone: 'private' } }, metadata: { masterCount: 1 }, audits: [] };
  let chain = Promise.resolve();
  const store = {
    getRole: async uid => state.roles[uid],
    transaction: callback => {
      const run = chain.then(async () => {
        const draft = structuredClone(state);
        const result = await callback({
          getRole: async uid => draft.roles[uid],
          getProfile: async uid => draft.profiles[uid],
          getMetadata: async () => draft.metadata,
          hasAnyRole: async () => Object.keys(draft.roles).length > 0,
          writeChange: ({ uid, role, masterCount, actor, before, bootstrap }) => {
            if (store.failAudit) throw new Error('audit unavailable');
            if (role === 'member') delete draft.roles[uid];
            else draft.roles[uid] = { role };
            draft.metadata = { masterCount };
            draft.audits.push({ uid, role, actor, before, bootstrap });
          }
        });
        state = draft;
        return result;
      });
      chain = run.catch(() => {});
      return run;
    }
  };
  const auth = {
    getUser: async uid => {
      if (uid === 'missing') throw Object.assign(new Error(), { code: 'auth/user-not-found' });
      return { uid, disabled: uid === 'disabled' };
    },
    listUsers: async (size, token) => {
      if (auth.onList) auth.onList();
      assert.equal(size, 50);
      assert.equal(token, 'cursor');
      return { users: [{ uid: 'u', email: 'u@example.test', passwordHash: 'private' }], pageToken: 'next' };
    }
  };
  return { api: createAdministration({ store, auth }), store, auth, state: () => state };
}
test('unauthenticated request rejected before I/O', async () => {
  const f = fixture();
  await assert.rejects(f.api.listMembers(undefined, {}), { code: 'unauthenticated' });
  await assert.rejects(f.api.setMemberRole(undefined, { uid: 'u', role: 'master' }), { code: 'unauthenticated' });
});
test('member and admin denied regardless of email/claims', async () => {
  const f = fixture();
  f.state().roles.u = { role: 'admin' };
  await assert.rejects(f.api.setMemberRole('u', { uid: 'm', role: 'member' }), { code: 'permission-denied' });
  await assert.rejects(f.api.listMembers('outsider', { pageSize: 50, pageToken: 'cursor' }), { code: 'permission-denied' });
});
test('master lists Auth users with only minimal fields and cursor', async () => {
  const f = fixture();
  assert.deepEqual(await f.api.listMembers('m', { pageSize: 50, pageToken: 'cursor' }), { members: [{ uid: 'u', name: 'User', email: 'u@example.test', role: 'member' }], nextPageToken: 'next' });
});
test('revocation during Auth pagination prevents disclosure', async () => {
  const f = fixture();
  f.auth.onList = () => { f.state().roles.m = { role: 'admin' }; };
  await assert.rejects(f.api.listMembers('m', { pageSize: 50, pageToken: 'cursor' }), { code: 'permission-denied' });
});
test('role edit rereads requester after Auth lookup', async () => {
  const f = fixture();
  f.auth.getUser = async uid => { f.state().roles.m = { role: 'admin' }; return { uid }; };
  await assert.rejects(f.api.setMemberRole('m', { uid: 'u', role: 'master' }), { code: 'permission-denied' });
  assert.equal(f.state().audits.length, 0);
});
test('promote another user; role, count and audit committed together', async () => {
  const f = fixture();
  assert.deepEqual(await f.api.setMemberRole('m', { uid: 'u', role: 'master' }), { uid: 'u', role: 'master' });
  assert.equal(f.state().metadata.masterCount, 2);
  assert.equal(f.state().roles.u.role, 'master');
  assert.deepEqual(f.state().audits[0], { uid: 'u', role: 'master', actor: 'm', before: 'member', bootstrap: false });
});
test('demoting last master is rejected without mutation', async () => {
  const f = fixture();
  await assert.rejects(f.api.setMemberRole('m', { uid: 'm', role: 'member' }), { code: 'failed-precondition' });
  assert.equal(f.state().metadata.masterCount, 1);
  assert.equal(f.state().audits.length, 0);
});
test('concurrent cross demotions cannot remove both masters', async () => {
  const f = fixture();
  f.state().roles.u = { role: 'master' };
  f.state().metadata.masterCount = 2;
  const results = await Promise.allSettled([f.api.setMemberRole('m', { uid: 'u', role: 'member' }), f.api.setMemberRole('u', { uid: 'm', role: 'member' })]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(f.state().metadata.masterCount, 1);
});
test('audit failure rolls back role and counter', async () => {
  const f = fixture();
  f.store.failAudit = true;
  await assert.rejects(f.api.setMemberRole('m', { uid: 'u', role: 'master' }), /audit unavailable/);
  assert.equal(f.state().roles.u, undefined);
  assert.equal(f.state().metadata.masterCount, 1);
});
test('missing target rejected', async () => {
  const f = fixture();
  await assert.rejects(f.api.setMemberRole('m', { uid: 'missing', role: 'admin' }), { code: 'not-found' });
});
test('disabled user cannot gain privilege', async () => {
  const f = fixture();
  await assert.rejects(f.api.setMemberRole('m', { uid: 'disabled', role: 'master' }), { code: 'failed-precondition' });
});
test('missing singleton fails closed rather than inventing count', async () => {
  const f = fixture();
  f.state().metadata = undefined;
  await assert.rejects(f.api.setMemberRole('m', { uid: 'u', role: 'admin' }), { code: 'failed-precondition' });
});
test('bootstrap initializes pristine registry once and is idempotent', async () => {
  const f = fixture();
  f.state().roles = {};
  f.state().metadata = undefined;
  assert.deepEqual(await f.api.bootstrapMaster('u'), { uid: 'u', role: 'master' });
  await f.api.bootstrapMaster('u');
  assert.equal(f.state().metadata.masterCount, 1);
  assert.equal(f.state().audits.length, 1);
  await assert.rejects(f.api.bootstrapMaster('m'), { code: 'failed-precondition' });
});
test('bootstrap refuses an existing registry without metadata', async () => {
  const f = fixture();
  f.state().metadata = undefined;
  await assert.rejects(f.api.bootstrapMaster('u'), { code: 'failed-precondition' });
});
