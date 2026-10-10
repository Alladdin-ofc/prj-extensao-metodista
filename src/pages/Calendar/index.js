import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaViewComponent } from '../../styles';
import { AuthContext } from '../../context/AuthContext';
import { useSessionScope } from '../../context/useSessionScope';
import { addChurchDays, CHURCH_TIME_ZONE, createEvent, EVENT_CATEGORIES, formatEventDate, getEventCategory, getEventDate, getEventDateKey, getEventTime, getWeekDays, getWeekStart, getWeeklyProgram, isSameDay, removeEvent, subscribeToEvents } from '../../services/eventService';
import { EventFormModal } from '../../components/EventFormModal';
import { EventDetailsModal } from '../../components/EventDetailsModal';
import styles from './styles';

const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const categoryNames = { cultos: 'Culto', escola: 'Escola Dominical', eventos: 'Evento' };

const formatWeekLabel = (days) => {
  const first = days[0];
  const last = days[6];
  const firstMonth = first.toLocaleDateString('pt-BR', { month: 'long', timeZone: CHURCH_TIME_ZONE });
  const lastMonth = last.toLocaleDateString('pt-BR', { month: 'long', timeZone: CHURCH_TIME_ZONE });
  const firstKey = getEventDateKey(first);
  const lastKey = getEventDateKey(last);
  const firstDay = Number(firstKey.slice(8));
  const lastDay = Number(lastKey.slice(8));
  if (firstKey.slice(0, 7) === lastKey.slice(0, 7)) return `${firstDay}–${lastDay} ${firstMonth}`;
  return `${firstDay} ${firstMonth} – ${lastDay} ${lastMonth}`;
};

export default function Calendar({ navigation }) {
  const { isAdmin, user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [category, setCategory] = useState('todos');
  const [refresh, setRefresh] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const scope = useSessionScope(user?.uid, isAdmin);
  useEffect(() => { setModalVisible(false); setSaving(false); }, [user?.uid, isAdmin]);

  useEffect(() => {
    setLoading(true);
    setError(false);
    const timeout = setTimeout(() => {
      setLoading(false);
      setError(true);
    }, 8000);
    const unsubscribe = subscribeToEvents((items) => {
      clearTimeout(timeout);
      setEvents(items);
      setLoading(false);
      setError(false);
    }, (listenerError) => {
      clearTimeout(timeout);
      console.warn('Calendar listener error:', listenerError.code || listenerError.message);
      setLoading(false);
      setError(true);
    });
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [user, refresh]);

  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const visibleEvents = useMemo(() => {
    const weekEnd = addChurchDays(weekStart, 7);
    const dynamic = events.map((event) => ({ ...event, eventDate: getEventDate(event), source: 'firestore' }))
      .filter((event) => event.eventDate && event.eventDate >= weekStart && event.eventDate < weekEnd);
    const recurring = getWeeklyProgram(weekStart);
    return [...recurring, ...dynamic]
      .filter((event) => category === 'todos' || getEventCategory(event) === category)
      .sort((left, right) => (left.eventDate || left.date) - (right.eventDate || right.date));
  }, [events, weekStart, category]);

  const selectedEvents = visibleEvents.filter((event) => isSameDay(event.eventDate || event.date, selectedDay));

  const changeWeek = (direction) => {
    setWeekStart(addChurchDays(weekStart, direction * 7));
    setSelectedDay(addChurchDays(selectedDay, direction * 7, '12:00'));
  };

  const handleCreate = async (payload) => {
    const token = scope.capture();
    if (!scope.isCurrent(token) || saving) return;
    setSaving(true);
    try {
      await createEvent(payload);
      if (!scope.isCurrent(token)) return;
      setModalVisible(false);
      Alert.alert('Publicado', 'O evento já aparece na agenda da comunidade.');
    } catch (createError) {
      if (!scope.isCurrent(token)) return;
      Alert.alert('Não foi possível publicar', createError.message === 'invalid-date'
        ? 'Confira a data e o horário informados.'
        : 'Verifique sua conexão e tente novamente.');
    } finally {
      if (scope.isCurrent(token)) setSaving(false);
    }
  };

  const handleDelete = (event) => {
    const token = scope.capture();
    if (!scope.isCurrent(token)) return;
    Alert.alert('Remover evento', `Deseja remover “${event.title}” da agenda?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Remover', style: 'destructive', onPress: async () => {
      if (!scope.isCurrent(token)) return;
      try {
        await removeEvent(event.id);
      } catch (deleteError) {
        if (!scope.isCurrent(token)) return;
        Alert.alert('Não foi possível remover', 'Tente novamente em instantes.');
      }
    } }
  ]);
  };

  return (
    <SafeAreaViewComponent>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.titleMark}><Ionicons name="calendar-outline" size={22} color="#167ec3" /></View>
            <View style={styles.titleCopy}>
              <Text style={styles.title}>Agenda</Text>
              <Text style={styles.subtitle}>Cultos, encontros e eventos.</Text>
            </View>
            {isAdmin && <Pressable accessibilityRole="button" accessibilityLabel="Adicionar evento" style={styles.addButton} onPress={() => setModalVisible(true)}><Ionicons name="add" size={23} color="#fff" /></Pressable>}
          </View>

          <View style={styles.weekHeading}>
            <Pressable accessibilityRole="button" accessibilityLabel="Semana anterior" onPress={() => changeWeek(-1)} style={styles.weekArrow}><Ionicons name="chevron-back" size={20} color="#25282c" /></Pressable>
            <Text style={styles.weekLabel}>{formatWeekLabel(days)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Próxima semana" onPress={() => changeWeek(1)} style={styles.weekArrow}><Ionicons name="chevron-forward" size={20} color="#25282c" /></Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {[{ id: 'todos', label: 'Tudo' }, ...EVENT_CATEGORIES].map((item) => (
            <Pressable key={item.id} onPress={() => setCategory(item.id)} style={[styles.filter, category === item.id && styles.filterActive]}>
              <Text style={[styles.filterText, category === item.id && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {error && <Text style={styles.syncWarning}>Alguns eventos da nuvem não puderam ser atualizados. <Text onPress={() => setRefresh((value) => value + 1)} style={styles.retryInline}>Tentar novamente</Text></Text>}
        {loading && <ActivityIndicator color="#1689d6" style={styles.loading} />}

        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.weekGrid}>
          {days.map((day, index) => {
            const dayEvents = visibleEvents.filter((event) => isSameDay(event.eventDate || event.date, day));
            const selected = isSameDay(day, selectedDay);
            return (
              <Pressable key={day.toISOString()} onPress={() => setSelectedDay(day)} style={[styles.dayColumn, selected && styles.dayColumnSelected]}>
                <Text style={[styles.dayName, selected && styles.dayTextSelected]}>{dayLabels[index]}</Text>
                <Text style={[styles.dayNumber, selected && styles.dayTextSelected]}>{Number(getEventDateKey(day).slice(8))}</Text>
                <View style={styles.dayEvents}>
                  {dayEvents.length === 0 ? <View style={styles.emptyDayMark} /> : dayEvents.slice(0, 4).map((event) => (
                    <View key={`${event.source || 'firestore'}-${event.id}`} style={[styles.dayEvent, getEventCategory(event) === 'escola' ? styles.schoolEvent : getEventCategory(event) === 'cultos' ? styles.worshipEvent : styles.specialEvent]}>
                      <Text style={styles.dayEventTitle} numberOfLines={3}>{event.title}</Text>
                      {event.provisional ? <Text style={styles.dayEventTime}>Provisório</Text> : null}
                      {!!event.time && <Text style={styles.dayEventTime}>{getEventTime(event)}</Text>}
                    </View>
                  ))}
                  {dayEvents.length > 4 && <Text style={styles.moreEvents}>+{dayEvents.length - 4}</Text>}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.detailHeader}>
          <View>
            <Text style={styles.detailTitle}>{selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: CHURCH_TIME_ZONE })}</Text>
            <Text style={styles.detailDate}>{formatEventDate(selectedDay)}</Text>
          </View>
          <Text style={styles.eventCount}>{selectedEvents.length} {selectedEvents.length === 1 ? 'encontro' : 'encontros'}</Text>
        </View>

        {selectedEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="sunny-outline" size={26} color="#6d747c" />
            <Text style={styles.emptyTitle}>Dia livre na agenda</Text>
            <Text style={styles.emptyText}>Ainda não há encontros programados para esta data.</Text>
          </View>
        ) : selectedEvents.map((event) => {
          const eventDate = event.eventDate || event.date;
          const categoryName = categoryNames[getEventCategory(event)] || 'Evento';
          return (
            <View key={`${event.source || 'firestore'}-${event.id}`} style={styles.detailRow}>
              <View style={[styles.timeRail, getEventCategory(event) === 'escola' && styles.schoolRail, getEventCategory(event) === 'eventos' && styles.specialRail]} />
              <View style={styles.detailCopy}>
                <View style={styles.detailMeta}>
                  <Text style={styles.categoryText}>{categoryName}</Text>
                  {!!event.time && <Text style={styles.timeText}>{getEventTime(event)}</Text>}
                </View>
                <Text style={styles.eventTitle}>{event.title}</Text>
                {!!event.description && <Text style={styles.eventDescription}>{event.description}</Text>}
                {!!event.time && <Text style={styles.fullDate}>{formatEventDate(eventDate)}</Text>}
                <Pressable testID="event-details" accessibilityRole="button" accessibilityLabel={`Ver detalhes de ${event.title}`} onPress={() => setSelectedEvent(event)} style={styles.detailsButton}>
                  <Ionicons name="information-circle-outline" size={20} color="#167ec3" />
                  <Text style={styles.retryInline}>Ver detalhes</Text>
                </Pressable>
              </View>
              {isAdmin && event.source === 'firestore' && <Pressable accessibilityRole="button" accessibilityLabel={`Excluir ${event.title}`} onPress={() => handleDelete(event)} hitSlop={10}><Ionicons name="trash-outline" size={19} color="#747a82" /></Pressable>}
            </View>
          );
        })}
      </ScrollView>

      <EventFormModal visible={modalVisible} onClose={() => setModalVisible(false)} onSubmit={handleCreate} saving={saving} />
      <EventDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onLogin={() => navigation.navigate('SignIn')} />
    </SafeAreaViewComponent>
  );
}
