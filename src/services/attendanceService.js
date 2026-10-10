import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { getEventDate, getEventDateKey, getEventOccurrenceId, getEventTime } from './eventService';

const attendanceReference = (uid, event) => {
  const eventId = getEventOccurrenceId(event);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid || '') || auth.currentUser?.uid !== uid) throw new Error('attendance-owner-required');
  if (!eventId || eventId.length > 200) throw new Error('invalid-event');
  return { eventId, reference: doc(db, 'users', uid, 'attendance', eventId) };
};

export const setAttendance = async (uid, event, status) => {
  const { reference, eventId } = attendanceReference(uid, event);
  const title = typeof event.title === 'string' ? event.title.trim() : '';
  const date = getEventDateKey(getEventDate(event));
  if (!title || title.length > 200 || !['confirmed', 'cancelled'].includes(status) ||
    !/^(19|20|21)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date)) throw new Error('invalid-attendance');
  // Resolves only after Firestore acknowledges the write, never on local cache updates.
  await setDoc(reference, { eventId, title, date, time: getEventTime(event), status, confirmedAt: serverTimestamp() });
};

export const subscribeToAttendance = (uid, event, onChange, onError) => {
  const { reference } = attendanceReference(uid, event);
  return onSnapshot(reference, { includeMetadataChanges: true }, (snapshot) => {
    onChange({ attendance: snapshot.exists() ? snapshot.data() : null,
      synced: !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites });
  }, onError);
};
