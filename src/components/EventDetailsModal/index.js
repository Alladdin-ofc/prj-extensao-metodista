import React, { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useSessionScope } from '../../context/useSessionScope';
import { formatEventDate, getEventDate, getEventOccurrenceId, getEventTime } from '../../services/eventService';
import { setAttendance, subscribeToAttendance } from '../../services/attendanceService';
import { addToPersonalCalendar } from '../../services/calendarService';

const calendarMessages = {
  saved: 'Evento salvo na sua agenda pessoal.',
  cancelled: 'Inclusão na agenda cancelada.',
  unknown: 'Não é possível confirmar se o evento foi salvo na agenda pessoal.',
  exported: 'Arquivo de agenda exportado. A importação na sua agenda ainda não foi confirmada.'
};

export function EventDetailsModal({ event, onClose, onLogin }) {
  const { user } = useContext(AuthContext);
  const occurrenceId = getEventOccurrenceId(event);
  const key = JSON.stringify([user?.uid || 'guest', occurrenceId, event?.title, event?.description, !!event]);
  const scope = useSessionScope(key, !!event);
  // Capture during render: a handler retained from an old account/event must not acquire a new token.
  const token = scope.capture();
  const [state, setState] = useState({ key });
  const [retry, setRetry] = useState(0);
  const locks = useRef({});
  const readAttempt = useRef(null);
  const current = state.key === key ? state : {};
  const update = (patch) => {
    if (scope.isCurrent(token)) setState(previous => ({ ...(previous.key === key ? previous : {}), key, ...patch }));
  };

  useEffect(() => {
    setState({ key, reading: !!user && !!occurrenceId });
    if (!user || !occurrenceId || !event) return undefined;
    let active = true;
    const attempt = { key, settled: false, verifiedStatus: null, timer: null };
    readAttempt.current = attempt;
    attempt.timer = setTimeout(() => {
      if (!active || attempt.settled) return;
      attempt.settled = true;
      update({ reading: false, readError: true, status: null });
    }, 10000);
    let unsubscribe;
    try {
      unsubscribe = subscribeToAttendance(user.uid, event, ({ attendance, synced }) => {
        if (!active || !scope.isCurrent(token)) return;
        // Cache/pending metadata is not new server evidence and cannot restart a finished read.
        if (!synced) return;
        attempt.settled = true;
        attempt.verifiedStatus = attendance?.status || null;
        clearTimeout(attempt.timer);
        update({ reading: false, readError: false, status: attempt.verifiedStatus });
      }, () => {
        if (!active) return;
        attempt.settled = true;
        clearTimeout(attempt.timer);
        update({ reading: false, readError: !attempt.verifiedStatus, status: attempt.verifiedStatus });
      });
    } catch (error) {
      attempt.settled = true;
      clearTimeout(attempt.timer);
      update({ reading: false, readError: true, status: null });
    }
    return () => { active = false; clearTimeout(attempt.timer); unsubscribe?.(); };
  }, [key, retry]);

  const close = () => {
    if (!scope.isCurrent(token)) return;
    scope.invalidate();
    onClose();
  };

  const changeAttendance = async (status) => {
    if (!scope.isCurrent(token) || !occurrenceId || scope.isCurrent(locks.current.attendance)) return;
    if (!user) { update({ loginRequired: true }); return; }
    locks.current.attendance = token;
    update({ pending: true, writeError: false, waiting: false });
    const timeout = setTimeout(() => update({ waiting: true }), 10000);
    try {
      await setAttendance(user.uid, event, status);
      if (scope.isCurrent(token) && readAttempt.current?.key === key) {
        readAttempt.current.settled = true;
        readAttempt.current.verifiedStatus = status;
        clearTimeout(readAttempt.current.timer);
      }
      update({ status, pending: false, reading: false, readError: false });
    } catch (error) {
      update({ pending: false, writeError: true });
    } finally {
      clearTimeout(timeout);
      if (locks.current.attendance === token) locks.current.attendance = null;
    }
  };

  const addCalendar = async () => {
    if (!scope.isCurrent(token) || scope.isCurrent(locks.current.calendar)) return;
    locks.current.calendar = token;
    update({ calendarPending: true, calendarMessage: '', calendarError: false });
    try {
      const result = await addToPersonalCalendar(event);
      update({ calendarMessage: calendarMessages[result.status] || calendarMessages.unknown });
    } catch (error) {
      update({ calendarError: error.message === 'calendar-permission-denied' ? 'permission' : 'failed' });
    } finally {
      update({ calendarPending: false });
      if (locks.current.calendar === token) locks.current.calendar = null;
    }
  };

  if (!event) return null;
  const hasTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(event.time || '');
  const confirmed = current.status === 'confirmed';
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={close} accessibilityRole="button" accessibilityLabel="Fechar detalhes" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.heading}>
            <Text style={styles.title} accessibilityRole="header">{event.title}</Text>
            <Pressable style={styles.close} accessibilityRole="button" accessibilityLabel="Fechar detalhes do evento" onPress={close}>
              <Ionicons name="close" size={24} color="#25282c" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.meta}><Ionicons name="calendar-outline" size={20} color="#167ec3" /><Text style={styles.metaText}>{formatEventDate(getEventDate(event))}</Text></View>
            <View style={styles.meta}><Ionicons name="time-outline" size={20} color="#167ec3" /><Text style={styles.metaText}>{getEventTime(event) ? `${getEventTime(event)} (Brasília)` : 'Horário a confirmar'}</Text></View>
            <Text style={styles.description}>{event.description || 'Descrição ainda não informada.'}</Text>
            {event.provisional ? <Text style={styles.note}>Programação provisória da referência, não confirmada oficialmente pela igreja.</Text> : null}
            <View style={styles.actions}>
              {current.reading ? <Text style={styles.note}>Consultando sua presença no servidor...</Text> : null}
              {current.readError ? <View><Text style={styles.error} accessibilityLiveRegion="polite">Não foi possível consultar sua presença.</Text><Pressable accessibilityRole="button" onPress={() => { if (scope.isCurrent(token)) setRetry(value => value + 1); }}><Text style={styles.link}>Tentar consultar novamente</Text></Pressable></View> : null}
              {current.pending ? <View style={styles.meta}><ActivityIndicator color="#167ec3" /><Text style={styles.metaText}>{current.waiting ? 'Aguardando resposta do servidor. A alteração ainda não foi confirmada.' : 'Salvando sua presença...'}</Text></View> : null}
              {!current.pending && confirmed ? <Text style={styles.success} accessibilityLiveRegion="polite">Presença confirmada.</Text> : null}
              {!current.pending && current.status === 'cancelled' ? <Text style={styles.note}>Presença cancelada.</Text> : null}
              {current.writeError ? <Text style={styles.error} accessibilityLiveRegion="polite">Não foi possível salvar sua presença. Verifique a conexão e tente novamente.</Text> : null}
              <Pressable testID={confirmed ? 'cancel-attendance' : 'confirm-attendance'} accessibilityRole="button"
                disabled={!!current.pending || !occurrenceId} accessibilityState={{ disabled: !!current.pending || !occurrenceId }}
                style={[styles.action, styles.primary, (current.pending || !occurrenceId) && styles.disabled]}
                onPress={() => changeAttendance(confirmed ? 'cancelled' : 'confirmed')}>
                <Ionicons name={confirmed ? 'close-circle-outline' : 'checkmark-circle-outline'} size={21} color="#fff" />
                <Text style={styles.primaryText}>{confirmed ? 'Cancelar minha presença' : 'Confirmar minha presença'}</Text>
              </Pressable>
              {current.loginRequired ? <View><Text style={styles.note}>Entre na sua conta para confirmar presença.</Text><Pressable testID="attendance-login" style={styles.action} accessibilityRole="button" onPress={() => { if (!scope.isCurrent(token)) return; close(); onLogin?.(); }}><Ionicons name="log-in-outline" size={21} color="#167ec3" /><Text style={styles.link}>Entrar</Text></Pressable></View> : null}
              <Pressable testID="personal-calendar" accessibilityRole="button" disabled={!!current.calendarPending || !hasTime || !occurrenceId}
                accessibilityState={{ disabled: !!current.calendarPending || !hasTime || !occurrenceId }}
                style={[styles.action, styles.secondary, (current.calendarPending || !hasTime || !occurrenceId) && styles.disabled]} onPress={addCalendar}>
                <Ionicons name="calendar-outline" size={21} color="#167ec3" />
                <Text style={styles.link}>{current.calendarPending ? 'Abrindo agenda pessoal...' : 'Adicionar à agenda pessoal'}</Text>
              </Pressable>
              {!hasTime ? <Text style={styles.note}>A agenda pessoal estará disponível quando o horário for informado.</Text> : null}
              {!occurrenceId ? <Text style={styles.error}>Data ou identificador indisponível para esta ocorrência.</Text> : null}
              {current.calendarMessage ? <Text style={styles.note} accessibilityLiveRegion="polite">{current.calendarMessage}</Text> : null}
              {current.calendarError ? <Text style={styles.error} accessibilityLiveRegion="polite">{current.calendarError === 'permission'
                ? 'Permissão de acesso à agenda negada. Autorize o acesso nas configurações do iPhone para abrir a agenda pessoal.'
                : 'Não foi possível abrir ou exportar a agenda pessoal. Tente novamente.'}</Text> : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 480, maxHeight: '85%', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' },
  heading: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e8eb' },
  title: { flex: 1, fontSize: 22, fontWeight: '700', color: '#25282c' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  content: { padding: 20, gap: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaText: { flex: 1, color: '#454b52', fontSize: 15, lineHeight: 22 },
  description: { fontSize: 16, lineHeight: 24, color: '#25282c' },
  note: { fontSize: 14, lineHeight: 21, color: '#59616a' },
  error: { fontSize: 14, lineHeight: 21, color: '#ae2430' },
  success: { fontSize: 15, color: '#217342' },
  actions: { borderTopWidth: 1, borderTopColor: '#e5e8eb', paddingTop: 16, gap: 12 },
  action: { minHeight: 48, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 6 },
  primary: { backgroundColor: '#167ec3' },
  secondary: { borderWidth: 1, borderColor: '#cbdde9' },
  primaryText: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: '#fff' },
  link: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: '#167ec3' },
  disabled: { opacity: 0.5 }
});
