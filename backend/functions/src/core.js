class AdministrationError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
function fail(code, message) { throw new AdministrationError(code, message); }
function objectWithKeys(data, keys) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(key => !keys.includes(key))) {
    fail('invalid-argument', 'Invalid request fields.');
  }
}
function validateUid(uid) {
  if (typeof uid !== 'string' || !uid.length || uid.length > 128 || /[/\x00-\x1f\x7f]/.test(uid) || ['.', '..'].includes(uid)) {
    fail('invalid-argument', 'Invalid UID.');
  }
  return uid;
}
function validateList(data) {
  objectWithKeys(data, ['pageSize', 'pageToken']);
  const pageSize = data.pageSize === undefined ? 25 : data.pageSize;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) fail('invalid-argument', 'pageSize must be 1 through 50.');
  const pageToken = data.pageToken;
  if (pageToken !== undefined && (typeof pageToken !== 'string' || !pageToken.length || pageToken.length > 2048)) {
    fail('invalid-argument', 'Invalid pageToken.');
  }
  return { pageSize, pageToken };
}
function validateChange(data) {
  objectWithKeys(data, ['uid', 'role']);
  validateUid(data.uid);
  if (!['member', 'admin', 'master'].includes(data.role)) fail('invalid-argument', 'Invalid target role.');
  return { uid: data.uid, role: data.role };
}
function roleOf(document) {
  if (document === undefined) return 'member';
  if (!['admin', 'master'].includes(document?.role)) fail('failed-precondition', 'Invalid role registry.');
  return document.role;
}
function requireMaster(role) {
  if (role !== 'master') fail('permission-denied', 'Master role required.');
}
function planChange(before, after, masterCount) {
  if (!Number.isSafeInteger(masterCount) || masterCount < 1) fail('failed-precondition', 'Role metadata requires privileged initialization or repair.');
  const next = masterCount + Number(after === 'master') - Number(before === 'master');
  if (next < 1) fail('failed-precondition', 'Cannot remove the last master.');
  if (!Number.isSafeInteger(next)) fail('failed-precondition', 'Invalid master count.');
  return next;
}
function minimalMember(user, profile, registry) {
  return {
    uid: user.uid,
    name: typeof profile?.name === 'string' ? profile.name : (typeof user.displayName === 'string' ? user.displayName : ''),
    email: typeof user.email === 'string' ? user.email : '',
    role: roleOf(registry)
  };
}
module.exports = { AdministrationError, fail, validateUid, validateList, validateChange, roleOf, requireMaster, planChange, minimalMember };
