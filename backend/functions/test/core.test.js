const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateList, validateChange, roleOf, requireMaster, planChange, minimalMember } = require('../src/core');

test('list defaults to 25 and preserves opaque Auth cursor', () => {
  assert.deepEqual(validateList({}), { pageSize: 25, pageToken: undefined });
  assert.deepEqual(validateList({ pageSize: 50, pageToken: 'opaque' }), { pageSize: 50, pageToken: 'opaque' });
});
for (const input of [null, [], { pageSize: 0 }, { pageSize: 51 }, { pageSize: 1.5 }, { pageSize: '10' }, { pageToken: '' }, { pageToken: 2 }, { pageToken: 'a'.repeat(2049) }, { email: 'admin@admin.com' }]) {
  test(`reject list input ${JSON.stringify(input).slice(0, 85)}`, () => {
    assert.throws(() => validateList(input), { code: 'invalid-argument' });
  });
}
for (const input of [{}, null, [], { uid: '../x', role: 'master' }, { uid: '', role: 'admin' }, { uid: 'x'.repeat(129), role: 'admin' }, { uid: 'x', role: 'owner' }, { uid: 'x', role: 'admin', email: 'admin@admin.com' }]) {
  test(`reject role input ${JSON.stringify(input)}`, () => {
    assert.throws(() => validateChange(input), { code: 'invalid-argument' });
  });
}
for (const role of ['member', 'admin', 'master']) {
  test(`accept canonical target role ${role}`, () => assert.deepEqual(validateChange({ uid: 'other', role }), { uid: 'other', role }));
}
test('missing registry means member; corrupt registry fails closed', () => {
  assert.equal(roleOf(undefined), 'member');
  assert.throws(() => roleOf({ role: 'member' }), { code: 'failed-precondition' });
  assert.throws(() => roleOf({ role: 'owner' }), { code: 'failed-precondition' });
});
for (const role of ['member', 'admin']) {
  test(`${role} cannot administer roles`, () => assert.throws(() => requireMaster(role), { code: 'permission-denied' }));
}
test('master can administer roles', () => assert.doesNotThrow(() => requireMaster('master')));
test('protect last master', () => assert.throws(() => planChange('master', 'member', 1), { code: 'failed-precondition' }));
test('promotion increments master count', () => assert.equal(planChange('member', 'master', 1), 2));
test('demotion decrements master count', () => assert.equal(planChange('master', 'admin', 2), 1));
test('idempotent master edit does not double count', () => assert.equal(planChange('master', 'master', 1), 1));
for (const count of [undefined, -1, 0, 1.5, '2', Number.MAX_SAFE_INTEGER + 1]) {
  test(`invalid masterCount fails closed: ${count}`, () => assert.throws(() => planChange('admin', 'member', count), { code: 'failed-precondition' }));
}
test('minimal listing uses profile name and Auth email, never sensitive fields or claims', () => {
  assert.deepEqual(minimalMember({ uid: 'u', email: 'auth@example.test', displayName: 'Auth', customClaims: { role: 'master' }, passwordHash: 'secret' }, { name: 'Profile', address: 'secret', phone: 'secret', dateOfBirth: 'secret', email: 'spoof@example.test', role: 'master' }, undefined), { uid: 'u', name: 'Profile', email: 'auth@example.test', role: 'member' });
  assert.deepEqual(minimalMember({ uid: 'u' }, undefined, { role: 'admin' }), { uid: 'u', name: '', email: '', role: 'admin' });
});
