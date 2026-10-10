import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const CHURCH_TIME_ZONE = 'America/Sao_Paulo';

const churchCivilDate = (year, month, day, time = '00:00') => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const civil = new Date(Date.UTC(year, month - 1, day));
  if (civil.getUTCFullYear() !== year || civil.getUTCMonth() !== month - 1 || civil.getUTCDate() !== day) return null;
  const key = civil.toISOString().slice(0, 10);
  const instant = fromZonedTime(`${key}T${time}:00`, CHURCH_TIME_ZONE);
  return Number.isNaN(instant.getTime()) || formatInTimeZone(instant, CHURCH_TIME_ZONE, 'yyyy-MM-dd HH:mm') !== `${key} ${time}` ? null : instant;
};

export const EVENT_CATEGORIES = [
  { id: 'eventos', label: 'Eventos' },
  { id: 'cultos', label: 'Cultos' },
  { id: 'escola', label: 'Escola Dom.' }
];

export const getEventDate = (event) => {
  const value = event?.date;
  if (value?.toDate) return value.toDate();
  if (value instanceof Date) return value;
  if (!value) return null;

  if (typeof value === 'string' && /^(\d{2}\/\d{2}\/\d{4})( \d{2}:\d{2})?$/.test(value)) {
    const [datePart, timePart = event?.time || '00:00'] = value.split(' ');
    const [day, month, year] = datePart.split('/').map(Number);
    return churchCivilDate(year, month, day, timePart);
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return churchCivilDate(year, month, day, event.time || '00:00');
  }

  // Timestamp/offset-bearing ISO dates are authoritative instants, not device-local wall times.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getEventCategory = (event) => {
  const category = String(event?.category || '').toLowerCase();
  if (['culto', 'cultos', 'service', 'worship'].includes(category)) return 'cultos';
  if (['escola', 'school', 'escola-dominical'].includes(category)) return 'escola';
  if (['eventos', 'evento', 'events', 'event'].includes(category)) return 'eventos';

  const title = String(event?.title || '').toLowerCase();
  if (title.includes('escola dominical')) return 'escola';
  if (title.includes('culto')) return 'cultos';
  return 'eventos';
};

export const subscribeToEvents = (onEvents, onError) => {
  const eventsQuery = query(collection(db, 'events'), orderBy('date', 'asc'));
  return onSnapshot(eventsQuery, (snapshot) => {
    onEvents(snapshot.docs.map((eventDoc) => ({
      ...eventDoc.data(),
      id: eventDoc.id,
      source: 'firestore'
    })));
  }, onError);
};

export const createEvent = async ({ title, description, date, time, category }) => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error('invalid-date');
  }
  const [day, month, year] = date.split('/').map(Number);
  const eventDate = churchCivilDate(year, month, day, time);
  if (!eventDate) {
    throw new Error('invalid-date');
  }

  await addDoc(collection(db, 'events'), {
    title: title.trim(),
    description: description.trim(),
    date: eventDate.toISOString(),
    time,
    category,
    type: category === 'eventos' ? 'special' : 'fixed',
    createdAt: new Date().toISOString()
  });
};

export const removeEvent = (eventId) => deleteDoc(doc(db, 'events', eventId));

export const getWeekStart = (date = new Date()) => {
  const civil = new Date(`${getEventDateKey(date)}T00:00:00Z`);
  const offset = (civil.getUTCDay() + 6) % 7;
  civil.setUTCDate(civil.getUTCDate() - offset);
  return fromZonedTime(`${civil.toISOString().slice(0, 10)}T00:00:00`, CHURCH_TIME_ZONE);
};

export const addChurchDays = (date, amount, time = '00:00') => {
  // UTC arithmetic here advances civil calendar dates only; the library resolves the zoned instant.
  const civil = new Date(`${getEventDateKey(date)}T00:00:00Z`);
  civil.setUTCDate(civil.getUTCDate() + amount);
  return fromZonedTime(`${civil.toISOString().slice(0, 10)}T${time}:00`, CHURCH_TIME_ZONE);
};

export const getWeekDays = (weekStart) => Array.from({ length: 7 }, (_, index) => addChurchDays(weekStart, index, '12:00'));

export const isSameDay = (left, right) => (
  left && right && getEventDateKey(left) === getEventDateKey(right)
);

export const formatEventDate = (eventDate) => {
  if (!eventDate) return 'Data a confirmar';
  return eventDate.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: CHURCH_TIME_ZONE
  });
};

export const getEventDateKey = (date) => formatInTimeZone(date, CHURCH_TIME_ZONE, 'yyyy-MM-dd');

export const getEventTime = (event) => {
  if (!event?.time) return '';
  const date = getEventDate(event);
  return date && !Number.isNaN(date.getTime()) ? formatInTimeZone(date, CHURCH_TIME_ZONE, 'HH:mm') : '';
};

export const getEventOccurrenceId = (event) => {
  const date = getEventDate(event);
  if (!date || Number.isNaN(date.getTime()) || !/^[A-Za-z0-9_-]{1,100}$/.test(event?.id || '')) return null;
  if (event.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time)) return null;
  const time = getEventTime(event);
  const prefix = event.source === 'weekly-program' ? 'program' : 'remote';
  const id = prefix === 'program' ? event.id : `${event.id}-${getEventDateKey(date)}`;
  return `${prefix}-${id}-${time ? time.replace(':', '') : 'tbc'}`;
};

export const getWeeklyProgram = (weekStart) => {
  const schedule = [
    { id: 'prayer', title: 'Culto de Oração', weekday: 1, category: 'cultos', time: '' },
    { id: 'home-worship', title: 'Culto no Lar', weekday: 3, category: 'cultos', time: '19:30' },
    { id: 'sunday-school', title: 'Escola Dominical', weekday: 6, category: 'escola', time: '10:00' },
    { id: 'family-worship', title: 'Culto da Família', weekday: 6, category: 'cultos', time: '19:00' }
  ];

  const days = getWeekDays(weekStart);
  const sunday = getEventDateKey(days[6]);
  if (Number(sunday.slice(8)) <= 7) {
    schedule.push({ id: 'holy-communion', title: 'Santa Ceia', weekday: 6, category: 'cultos', time: '19:00',
      description: 'Celebração da Santa Ceia no primeiro domingo de cada mês. Programação de referência: 19h; confirme com a igreja.',
      provisional: true });
  }

  return schedule.map((item) => {
    const civilDay = getEventDateKey(days[item.weekday]);
    const date = item.time ? getEventDate({ date: civilDay, time: item.time }) : days[item.weekday];
    return {
      ...item,
      id: `${item.id}-${civilDay}`,
      date,
      description: item.description || `${item.title}: encontro da comunidade.`,
      source: 'weekly-program'
    };
  });
};

export const getUpcomingProgramEvents = (weeks = 8) => {
  const firstWeek = getWeekStart(new Date());
  const items = [];

  for (let week = 0; week < weeks; week += 1) {
    const weekStart = addChurchDays(firstWeek, week * 7);
    items.push(...getWeeklyProgram(weekStart));
  }

  return items.filter((event) => event.date >= new Date()).sort((left, right) => left.date - right.date);
};
