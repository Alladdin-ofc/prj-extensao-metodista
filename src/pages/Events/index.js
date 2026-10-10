import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaViewComponent } from '../../styles';
import { AuthContext } from '../../context/AuthContext';
import { useSessionScope } from '../../context/useSessionScope';
import { createEvent, EVENT_CATEGORIES, formatEventDate, getEventCategory, getEventDate, getEventTime, getUpcomingProgramEvents, removeEvent, subscribeToEvents } from '../../services/eventService';
import { EventFormModal } from '../../components/EventFormModal';
import { EventDetailsModal } from '../../components/EventDetailsModal';
import communityImage from '../../../assets/NosImagem.jpg';
import styles from './styles';

export default function Events({ navigation }) {
  const { isAdmin, user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [category, setCategory] = useState('todos');
  const [refresh, setRefresh] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const scope = useSessionScope(user?.uid, isAdmin);

  useEffect(() => { setModalVisible(false); setSaving(false); }, [user?.uid, isAdmin]);

  useEffect(() => {
    let active = true;
    setEvents([]);
    setLoading(true);
    setError(false);
    const timeout = setTimeout(() => {
      setLoading(false);
      setError(true);
    }, 8000);
    const unsubscribe = subscribeToEvents((items) => {
      if (!active) return;
      clearTimeout(timeout);
      setEvents(items);
      setLoading(false);
      setError(false);
    }, (listenerError) => {
      if (!active) return;
      clearTimeout(timeout);
      console.warn('Events listener error:', listenerError.code || listenerError.message);
      setLoading(false);
      setError(true);
    });
    return () => {
      active = false;
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [refresh, user?.uid]);

  const eventList = useMemo(() => {
    const recurring = getUpcomingProgramEvents();
    return [...recurring, ...events]
      .map((event) => ({ ...event, eventDate: getEventDate(event) }))
      .filter((event) => event.eventDate && event.eventDate >= new Date())
      .sort((left, right) => left.eventDate - right.eventDate);
  }, [events]);

  const visibleEvents = eventList.filter((event) => {
    const matchesCategory = category === 'todos' || getEventCategory(event) === category;
    const text = `${event.title || ''} ${event.description || ''}`.toLocaleLowerCase('pt-BR');
    return matchesCategory && text.includes(queryText.trim().toLocaleLowerCase('pt-BR'));
  });

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
      <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Eventos</Text>
            <Text style={styles.subtitle}>Encontros para viver a comunidade.</Text>
          </View>
          {isAdmin && (
            <Pressable accessibilityRole="button" accessibilityLabel="Adicionar evento" style={styles.addButton} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={24} color="#fff" />
            </Pressable>
          )}
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#6f7780" />
          <TextInput value={queryText} onChangeText={setQueryText} style={styles.searchInput} placeholder="Buscar eventos" placeholderTextColor="#707780" returnKeyType="search" />
          {queryText.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" onPress={() => setQueryText('')}>
              <Ionicons name="close-circle" size={20} color="#6f7780" />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {[{ id: 'todos', label: 'Todos' }, ...EVENT_CATEGORIES].map((item) => (
            <Pressable key={item.id} onPress={() => setCategory(item.id)} style={[styles.filter, category === item.id && styles.filterActive]}>
              <Text style={[styles.filterText, category === item.id && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Próximos encontros</Text>
          <Pressable style={styles.calendarLink} onPress={() => navigation.navigate('Calendar')}>
            <Text style={styles.calendarLinkText}>Ver calendário</Text>
            <Ionicons name="arrow-forward" size={16} color="#167ec3" />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color="#1689d6" size="large" style={styles.loading} />
        ) : null}
        {error ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={32} color="#6c737b" />
            <Text style={styles.emptyTitle}>Os eventos da nuvem não carregaram</Text>
            <Text style={styles.emptyText}>Verifique a conexão e tente novamente.</Text>
            <Pressable accessibilityRole="button" onPress={() => setRefresh((value) => value + 1)}><Text style={styles.retryText}>Tentar novamente</Text></Pressable>
          </View>
        ) : null}
        {visibleEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-clear-outline" size={32} color="#6c737b" />
            <Text style={styles.emptyTitle}>Nenhum encontro encontrado</Text>
            <Text style={styles.emptyText}>Altere a busca ou escolha outra categoria.</Text>
          </View>
        ) : visibleEvents.map((event) => (
          <View key={`${event.source}-${event.id}`} style={styles.eventCard}>
            <View style={styles.imageFrame}>
              <Image source={event.imageUrl ? { uri: event.imageUrl } : communityImage} style={styles.eventImage} resizeMode="cover" />
              <View style={styles.imageShade} />
              <View style={styles.imageTopRow}>
                <Text style={styles.imageBadge}>{event.provisional ? 'Provisório' : event.source === 'weekly-program' ? 'Comunidade' : (EVENT_CATEGORIES.find((item) => item.id === getEventCategory(event))?.label || 'Evento')}</Text>
                {isAdmin && event.source === 'firestore' && (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Excluir ${event.title}`} onPress={() => handleDelete(event)} style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                  </Pressable>
                )}
              </View>
              <Text style={styles.imageTitle}>{event.title}</Text>
              <Text style={styles.imageDate}>{formatEventDate(event.eventDate)}{event.time ? `, ${getEventTime(event)}` : ''}</Text>
            </View>
            {!!event.description && <Text style={styles.description}>{event.description}</Text>}
            <Pressable testID="event-details" accessibilityRole="button" accessibilityLabel={`Ver detalhes de ${event.title}`} style={styles.calendarLink} onPress={() => setSelectedEvent(event)}>
              <Ionicons name="information-circle-outline" size={20} color="#167ec3" />
              <Text style={styles.calendarLinkText}>Ver detalhes</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <EventFormModal visible={modalVisible} onClose={() => setModalVisible(false)} onSubmit={handleCreate} saving={saving} />
      <EventDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onLogin={() => navigation.navigate('SignIn')} />
    </SafeAreaViewComponent>
  );
}
