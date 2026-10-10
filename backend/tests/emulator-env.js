function requireEmulators() {
  for (const key of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) {
    if (!/^127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(process.env[key] || '')) {
      throw new Error(`Emulator tests blocked: ${key} must be a running loopback emulator. Run npm.cmd run emulators:test. No cloud fallback permitted.`);
    }
  }
  return 'demo-metodista-backend';
}
module.exports = { requireEmulators };
