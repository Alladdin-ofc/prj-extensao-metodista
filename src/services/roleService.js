import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';

export const getVerifiedRole = (snapshot) => {
  if (!snapshot.exists() || snapshot.metadata?.fromCache !== false || snapshot.metadata?.hasPendingWrites) return 'member';
  const role = snapshot.data().role;
  return role === 'admin' || role === 'master' ? role : 'member';
};

export const subscribeToRole = (uid, onRole, onError) => onSnapshot(
  doc(db, 'adminRoles', uid),
  { includeMetadataChanges: true },
  (snapshot) => onRole(getVerifiedRole(snapshot)),
  onError
);
