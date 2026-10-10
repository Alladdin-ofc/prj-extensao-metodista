const { parseArgs } = require('node:util');
const { validateUid, AdministrationError } = require('../src/core');

async function main() {
  let values;
  try {
    ({ values } = parseArgs({ options: { uid: { type: 'string' }, project: { type: 'string' }, 'allow-cloud': { type: 'boolean', default: false } }, strict: true, allowPositionals: false }));
  } catch { throw new Error('Usage: node scripts/bootstrap-master.js --uid UID --project PROJECT [--allow-cloud]'); }
  if (!values.uid || !values.project || !/^[a-z][a-z0-9-]{4,62}$/.test(values.project)) {
    throw new Error('Usage: node scripts/bootstrap-master.js --uid UID --project PROJECT [--allow-cloud]');
  }
  validateUid(values.uid);
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const emulator = Boolean(firestoreHost || authHost);
  if (emulator) {
    if (!firestoreHost || !authHost) throw new Error('Both Auth and Firestore emulators are required.');
    if (![firestoreHost, authHost].every(host => /^127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(host))) throw new Error('Only loopback emulator hosts are allowed.');
    if (!values.project.startsWith('demo-')) throw new Error('Use a demo- project for local bootstrap.');
    if (values['allow-cloud']) throw new Error('Do not mix emulator mode and --allow-cloud.');
  } else if (!values['allow-cloud']) {
    throw new Error('Cloud access disabled. Configure local emulators, or obtain explicit approval before --allow-cloud and ADC.');
  } else if (values.project.startsWith('demo-')) {
    throw new Error('Cloud bootstrap requires an explicitly approved real project.');
  }
  // SDK/ADC are reached only after the explicit environment boundary above.
  const { initializeApp, applicationDefault, deleteApp } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  const { getFirestore, Firestore, FieldValue } = require('firebase-admin/firestore');
  const { createFirestoreStore } = require('../src/firestore-store');
  const { createAdministration } = require('../src/administration');
  const app = initializeApp({ projectId: values.project, credential: emulator
    ? { getAccessToken: async () => ({ access_token: 'emulator-only', expires_in: 3600 }) }
    : applicationDefault() });
  const db = emulator ? new Firestore({ projectId: values.project, host: firestoreHost, ssl: false }) : getFirestore(app);
  try {
    await createAdministration({ auth: getAuth(app), store: createFirestoreStore(db, () => FieldValue.serverTimestamp()) }).bootstrapMaster(values.uid);
    console.log('Master registry initialized (or already initialized for this UID).');
  } finally { await db.terminate(); await deleteApp(app); }
}
main().catch(error => {
  // Never print credential, SDK response, profile or token payloads.
  console.error(error instanceof AdministrationError ? `Bootstrap failed: ${error.code}: ${error.message}`
    : error.code ? `Bootstrap failed: ${error.code}.` : error.message);
  process.exitCode = 1;
});
