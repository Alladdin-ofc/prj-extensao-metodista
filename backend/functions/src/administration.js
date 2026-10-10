const { fail, validateUid, validateList, validateChange, roleOf, requireMaster, planChange, minimalMember } = require('./core');

function createAdministration({ store, auth }) {
  async function authorize(actor) {
    if (!actor) fail('unauthenticated', 'Sign in required.');
    validateUid(actor);
    requireMaster(roleOf(await store.getRole(actor)));
  }
  async function registered(uid) {
    try { return await auth.getUser(uid); }
    catch (error) {
      if (error.code === 'auth/user-not-found') fail('not-found', 'Registered user not found.');
      throw error;
    }
  }
  async function listMembers(actor, data) {
    await authorize(actor);
    const { pageSize, pageToken } = validateList(data);
    let page;
    try { page = await auth.listUsers(pageSize, pageToken); }
    catch (error) {
      if (error.code === 'auth/invalid-page-token') fail('invalid-argument', 'Invalid pageToken.');
      throw error;
    }
    return store.transaction(async tx => {
      // Recheck after external pagination; never disclose a page to a revoked master.
      requireMaster(roleOf(await tx.getRole(actor)));
      const members = [];
      for (const user of page.users) {
        validateUid(user.uid);
        members.push(minimalMember(user, await tx.getProfile(user.uid), await tx.getRole(user.uid)));
      }
      return { members, nextPageToken: page.pageToken || null };
    });
  }
  async function setMemberRole(actor, data) {
    await authorize(actor);
    const { uid, role } = validateChange(data);
    const user = await registered(uid);
    if (user.disabled && role !== 'member') fail('failed-precondition', 'Disabled users cannot gain privileges.');
    return store.transaction(async tx => {
      requireMaster(roleOf(await tx.getRole(actor)));
      const before = roleOf(await tx.getRole(uid));
      const metadata = await tx.getMetadata();
      const masterCount = planChange(before, role, metadata?.masterCount);
      // Even no-op edits touch the singleton and produce an atomic audit entry.
      tx.writeChange({ actor, uid, before, role, masterCount, bootstrap: false });
      return { uid, role };
    });
  }
  async function bootstrapMaster(uid) {
    validateUid(uid);
    const user = await registered(uid);
    if (user.disabled) fail('failed-precondition', 'Cannot bootstrap a disabled user.');
    return store.transaction(async tx => {
      const metadata = await tx.getMetadata();
      const before = roleOf(await tx.getRole(uid));
      if (metadata !== undefined) {
        planChange(before, before, metadata.masterCount);
        if (before !== 'master') fail('failed-precondition', 'Already initialized; use the callable to promote further masters.');
        return { uid, role: 'master' };
      }
      if (await tx.hasAnyRole()) fail('failed-precondition', 'Existing registry requires a separately reviewed counter migration.');
      tx.writeChange({ actor: 'privileged-bootstrap', uid, before, role: 'master', masterCount: 1, bootstrap: true });
      return { uid, role: 'master' };
    });
  }
  return { listMembers, setMemberRole, bootstrapMaster };
}
module.exports = { createAdministration };
