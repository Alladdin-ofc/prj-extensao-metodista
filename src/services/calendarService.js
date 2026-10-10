import { Platform } from 'react-native';
import { CHURCH_TIME_ZONE, getEventDate, getEventOccurrenceId } from './eventService';

const downloadCalendar = (value, filename) => {
  const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  try { anchor.click(); } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

export const addToPersonalCalendar = async (event, { download = downloadCalendar } = {}) => {
  const occurrenceId = getEventOccurrenceId(event);
  const startDate = getEventDate(event);
  if (!occurrenceId || !startDate || !event.title?.trim()) throw new Error('invalid-event');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time || '')) throw new Error('event-time-required');
  // An individual occurrence, not a device-side recurring series. No calendar reads.
  const start = new Date(startDate);
  // No official duration is provided: use a zero-length entry editable in the native sheet.
  if (Platform.OS !== 'web') {
    const Calendar = require('expo-calendar');
    // SDK54's native implementation requires legacy authorization only before iOS17.
    if (Platform.OS === 'ios' && Number.parseInt(String(Platform.Version), 10) < 17) {
      const permission = await Calendar.requestCalendarPermissionsAsync();
      if (!permission.granted) throw new Error('calendar-permission-denied');
    }
    const result = await Calendar.createEventInCalendarAsync({
      title: event.title.trim(), notes: event.description || '', startDate: start, endDate: new Date(start), timeZone: CHURCH_TIME_ZONE
    }, { startNewActivityTask: false });
    return { status: result.action === 'saved' ? 'saved' : result.action === 'canceled' ? 'cancelled' : 'unknown' };
  }
  const { createEvent } = require('ics');
  const { error, value } = createEvent({
    uid: `${occurrenceId}@metodista.local`, title: event.title.trim(), description: event.description || '',
    start: [start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate(), start.getUTCHours(), start.getUTCMinutes()],
    // RFC 5545: a DATE-TIME event without DTEND/DURATION ends at its start time.
    startInputType: 'utc', startOutputType: 'utc'
  });
  if (error || !value) throw new Error('calendar-export-failed');
  download(value, `${occurrenceId}.ics`);
  return { status: 'exported' };
};
