const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
for (const [name, args, env, expected] of [
  ['requires UID/project', [], {}, /Usage/],
  ['cloud blocked before SDK import', ['--uid', 'u', '--project', 'real-project'], {}, /Cloud access disabled/],
  ['reject remote emulator', ['--uid', 'u', '--project', 'demo-test'], { FIRESTORE_EMULATOR_HOST: 'remote:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' }, /loopback/],
  ['reject partial emulator setup', ['--uid', 'u', '--project', 'demo-test'], { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }, /Both/],
  ['reject real project in emulator mode', ['--uid', 'u', '--project', 'production'], { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' }, /demo-/],
  ['reject UID path injection', ['--uid', '../u', '--project', 'demo-test'], {}, /Invalid UID/],
  ['reject unknown arguments', ['--uid', 'u', '--project', 'demo-test', '--email', 'admin@example.test'], {}, /Usage/]
]) {
  test(`bootstrap guard: ${name}`, () => {
    const result = spawnSync(process.execPath, [path.resolve(__dirname, '../functions/scripts/bootstrap-master.js'), ...args], { env, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, expected);
    assert.equal(result.stdout, '');
  });
}
