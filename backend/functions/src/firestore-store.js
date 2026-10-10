function createFirestoreStore(db, serverTimestamp) {
  const roleRef = uid => db.collection('adminRoles').doc(uid);
  const metadataRef = db.doc('adminMetadata/roles');
  const value = snapshot => snapshot.exists ? snapshot.data() : undefined;
  return {
    getRole: async uid => value(await roleRef(uid).get()),
    transaction: callback => db.runTransaction(async transaction => callback({
      getRole: async uid => value(await transaction.get(roleRef(uid))),
      getProfile: async uid => value(await transaction.get(db.collection('users').doc(uid))),
      getMetadata: async () => value(await transaction.get(metadataRef)),
      hasAnyRole: async () => !(await transaction.get(db.collection('adminRoles').limit(1))).empty,
      writeChange: ({ actor, uid, before, role, masterCount, bootstrap }) => {
        const at = serverTimestamp();
        if (role === 'member') transaction.delete(roleRef(uid));
        else transaction.set(roleRef(uid), { role, updatedAt: at, updatedBy: actor });
        transaction.set(metadataRef, { masterCount, updatedAt: at, updatedBy: actor });
        transaction.create(db.collection('adminAudit').doc(), { actorUid: actor, targetUid: uid, before, after: role, at, bootstrap });
      }
    }))
  };
}
module.exports = { createFirestoreStore };
