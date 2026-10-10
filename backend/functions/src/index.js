const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { createAdministration } = require('./administration');
const { createFirestoreStore } = require('./firestore-store');
const { AdministrationError } = require('./core');

initializeApp();
const api = createAdministration({ auth: getAuth(), store: createFirestoreStore(getFirestore(), () => FieldValue.serverTimestamp()) });
const options = { region: 'southamerica-east1', maxInstances: 5, timeoutSeconds: 60, memory: '256MiB' };
function callable(handler) {
  return onCall(options, async request => {
    try { return await handler(request.auth?.uid, request.data); }
    catch (error) {
      if (error instanceof AdministrationError) throw new HttpsError(error.code, error.message);
      // Do not log UserRecord, profile data, tokens, or SDK error payloads.
      throw new HttpsError('internal', 'Administration unavailable.');
    }
  });
}
exports.listMembersForAdministration = callable(api.listMembers);
exports.setMemberRole = callable(api.setMemberRole);
