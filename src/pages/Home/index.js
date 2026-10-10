import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, addDoc } from 'firebase/firestore';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { EventDetailsModal } from '../../components/EventDetailsModal';
import { SafeAreaViewComponent } from '../../styles';
import { AuthContext } from '../../context/AuthContext';
import { useSessionScope } from '../../context/useSessionScope';
import { db } from '../../services/firebaseConfig';
import { formatEventDate, getEventDate, getEventTime, getUpcomingProgramEvents, subscribeToEvents } from '../../services/eventService';
import communityImage from '../../../assets/NosImagem.jpg';
import metodistaLogo from '../../../assets/MetodistaLogo.png';
import styles from './styles';

const recommendations = [
  { id: 'home-worship', title: 'Culto no Lar', detail: 'Quinta-feira, 19h30', action: 'Ver agenda', target: 'Events', image: communityImage },
  { id: 'giving', title: 'Dízimos e ofertas', detail: 'Faça parte dessa missão.', action: 'Contribuir', target: 'Rocket' }
];

const getNewsDate = (value) => {
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR');
};

export default function Home({ navigation }) {
  const { userData, user, isAdmin } = useContext(AuthContext);
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [newsError, setNewsError] = useState(false);
  const [eventsError, setEventsError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const [saving, setSaving] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const scope = useSessionScope(user?.uid, isAdmin);
  useEffect(() => {
    setModalVisible(false);
    setNewMessage('');
    setNewPriority('normal');
    setSaving(false);
  }, [user?.uid, isAdmin]);

  useEffect(() => {
    setNewsLoading(true);
    setNewsError(false);
    const timeout = setTimeout(() => {
      setNewsLoading(false);
      setNewsError(true);
    }, 8000);
    const newsQuery = query(collection(db, 'news'), orderBy('publishDate', 'desc'));
    const unsubscribe = onSnapshot(newsQuery, (snapshot) => {
      clearTimeout(timeout);
      setNews(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      setNewsLoading(false);
      setNewsError(false);
    }, (error) => {
      clearTimeout(timeout);
      console.warn('News listener error:', error.code || error.message);
      setNewsLoading(false);
      setNewsError(true);
    });
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [user, refresh]);

  useEffect(() => {
    setEventsLoading(true);
    setEventsError(false);
    const timeout = setTimeout(() => {
      setEventsLoading(false);
      setEventsError(true);
    }, 8000);
    const unsubscribe = subscribeToEvents((items) => {
      clearTimeout(timeout);
      setEvents(items);
      setEventsLoading(false);
      setEventsError(false);
    }, (error) => {
      clearTimeout(timeout);
      console.warn('Home events listener error:', error.code || error.message);
      setEventsLoading(false);
      setEventsError(true);
    });
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [user, refresh]);

  const nextEvents = useMemo(() => {
    const now = new Date();
    const dynamicEvents = events.map((event) => ({ ...event, eventDate: getEventDate(event) }));
    return [...getUpcomingProgramEvents(8), ...dynamicEvents]
      .filter((event) => event.eventDate ? event.eventDate >= now : event.date >= now)
      .sort((left, right) => (left.eventDate || left.date) - (right.eventDate || right.date))
      .slice(0, 6);
  }, [events]);

  const nextCommunion = getUpcomingProgramEvents(8).find(event => event.id.startsWith('holy-communion-'));
  const recommendationItems = nextCommunion ? [...recommendations, {
    id: 'holy-communion', title: nextCommunion.title, detail: `${formatEventDate(nextCommunion.date)}, 19h · Provisório`,
    action: 'Ver encontro', image: communityImage, event: nextCommunion
  }] : recommendations;

  const firstName = userData?.name?.split(' ')[0] || 'Visitante';

  const retrySync = () => {
    setNewsLoading(true);
    setEventsLoading(true);
    setRefresh((value) => value + 1);
  };

  const handleAddNews = async () => {
    const token = scope.capture();
    if (!scope.isCurrent(token) || saving) return;
    if (!newMessage.trim()) {
      Alert.alert('Atenção', 'Escreva a mensagem do aviso antes de publicar.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'news'), {
        message: newMessage.trim(),
        publishDate: new Date().toISOString(),
        priority: newPriority
      });
      if (!scope.isCurrent(token)) return;
      setNewMessage('');
      setNewPriority('normal');
      setModalVisible(false);
      Alert.alert('Aviso publicado', 'A comunidade já pode ver a atualização.');
    } catch (error) {
      if (!scope.isCurrent(token)) return;
      Alert.alert('Não foi possível publicar', 'Verifique a conexão e tente novamente.');
    } finally {
      if (scope.isCurrent(token)) setSaving(false);
    }
  };

  const handleDeleteNews = (item) => {
    const token = scope.capture();
    if (!scope.isCurrent(token)) return;
    Alert.alert('Remover aviso', 'Deseja remover este aviso da Home?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Remover', style: 'destructive', onPress: async () => {
      if (!scope.isCurrent(token)) return;
      try {
        await deleteDoc(doc(db, 'news', item.id));
      } catch (error) {
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
          <View style={styles.brandRow}>
            <ImageBackground source={metodistaLogo} style={styles.logo} resizeMode="contain" />
            <View style={styles.brandText}>
              <Text style={styles.greeting}>Olá, {firstName}!</Text>
              <Text style={styles.churchName}>Igreja Metodista · Santana de Parnaíba</Text>
            </View>
            {isAdmin && <View style={styles.adminMark}><Ionicons name="shield-checkmark" size={16} color="#146fae" /></View>}
          </View>
          <Text style={styles.welcome}>A sua comunidade, mais perto.</Text>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Próximos eventos</Text>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Events')} style={styles.seeAll}>
            <Text style={styles.seeAllText}>Ver todos</Text>
            <Ionicons name="arrow-forward" size={16} color="#167ec3" />
          </Pressable>
        </View>
        {eventsLoading && nextEvents.length === 0 ? (
          <ActivityIndicator color="#1689d6" style={styles.eventLoading} />
        ) : nextEvents.length === 0 ? (
          <Pressable accessibilityRole="button" onPress={eventsError ? retrySync : () => navigation.navigate('Events')} style={styles.noticeEmpty}>
            <Ionicons name={eventsError ? 'cloud-offline-outline' : 'calendar-clear-outline'} size={22} color="#6e747c" />
            <Text style={styles.emptyText}>{eventsError ? 'A agenda não pôde ser atualizada.' : 'Ainda não há próximos encontros publicados.'}</Text>
            <Text style={styles.retryText}>{eventsError ? 'Tentar novamente' : 'Ver agenda'}</Text>
          </Pressable>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventRail}>
            {nextEvents.map((event) => {
              const eventDate = event.eventDate || event.date;
              const image = event.imageUrl ? { uri: event.imageUrl } : communityImage;
              return (
                <Pressable testID="event-details" accessibilityRole="button" accessibilityLabel={`Ver detalhes de ${event.title}`} key={`${event.source || 'firestore'}-${event.id}`} style={styles.eventTile} onPress={() => setSelectedEvent(event)}>
                  <ImageBackground source={image} resizeMode="cover" style={styles.eventImage} imageStyle={styles.eventImageStyle}>
                    <View style={styles.eventShade} />
                    <Text style={styles.eventBadge}>{event.provisional ? 'Provisório' : 'Comunidade'}</Text>
                    <View style={styles.eventTileCopy}>
                      <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                      <Text style={styles.eventMeta}>{formatEventDate(eventDate)}{event.time ? ` · ${getEventTime(event)}` : ''}</Text>
                    </View>
                  </ImageBackground>
                </Pressable>
              );
            })}
            {eventsError && <Text style={styles.inlineError}>Eventos atualizados indisponíveis.</Text>}
          </ScrollView>
        )}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Recomendações</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendationRail}>
          {recommendationItems.map((item) => (
            <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.event ? `Ver detalhes de ${item.title}` : item.title} onPress={() => item.event ? setSelectedEvent(item.event) : navigation.navigate(item.target)} style={styles.recommendationCard}>
              {item.image ? (
                <ImageBackground source={item.image} resizeMode="cover" style={styles.recommendationImage} imageStyle={styles.recommendationImageStyle}>
                  <View style={styles.eventShade} />
                  <Text style={styles.recommendationActionLight}>{item.action}</Text>
                  <View style={styles.recommendationCopy}>
                    <Text style={styles.recommendationTitleLight}>{item.title}</Text>
                    <Text style={styles.recommendationDetailLight}>{item.detail}</Text>
                  </View>
                </ImageBackground>
              ) : (
                <View style={styles.givingCard}>
                  <View style={styles.givingIcon}><Ionicons name="heart" size={22} color="#c92834" /></View>
                  <Text style={styles.recommendationTitle}>{item.title}</Text>
                  <Text style={styles.recommendationDetail}>{item.detail}</Text>
                  <Text style={styles.recommendationAction}>{item.action} <Ionicons name="arrow-forward" size={14} color="#167ec3" /></Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Avisos da comunidade</Text>
          {isAdmin && (
            <Pressable accessibilityRole="button" accessibilityLabel="Adicionar aviso" onPress={() => setModalVisible(true)} style={styles.iconButton}>
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
          )}
        </View>
        {newsLoading ? (
          <ActivityIndicator color="#1689d6" style={styles.newsLoading} />
        ) : newsError ? (
          <View style={styles.noticeEmpty}>
            <Ionicons name="cloud-offline-outline" size={22} color="#6e747c" />
            <Text style={styles.emptyText}>Não foi possível atualizar os avisos.</Text>
            <Pressable onPress={retrySync}><Text style={styles.retryText}>Tentar novamente</Text></Pressable>
          </View>
        ) : news.length === 0 ? (
          <View style={styles.noticeEmpty}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#6e747c" />
            <Text style={styles.emptyText}>Nenhum aviso publicado no momento.</Text>
          </View>
        ) : news.slice(0, 4).map((item) => (
          <View key={item.id} style={styles.noticeRow}>
            <View style={[styles.priorityMark, item.priority === 'high' && styles.priorityHigh]} />
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeMessage}>{item.message}</Text>
              <Text style={styles.noticeDate}>{getNewsDate(item.publishDate)}{item.priority === 'high' ? ' · Importante' : ''}</Text>
            </View>
            {isAdmin && <Pressable accessibilityRole="button" accessibilityLabel="Excluir aviso" onPress={() => handleDeleteNews(item)} hitSlop={8}><Ionicons name="trash-outline" size={18} color="#747a82" /></Pressable>}
          </View>
        ))}
      </ScrollView>

      <EventDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onLogin={() => navigation.navigate('SignIn')} />
      <Modal isVisible={modalVisible} onBackdropPress={() => setModalVisible(false)} onBackButtonPress={() => setModalVisible(false)} avoidKeyboard>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo aviso</Text>
            <Text style={styles.fieldLabel}>Mensagem</Text>
            <TextInput style={styles.modalInput} value={newMessage} onChangeText={setNewMessage} placeholder="Escreva uma atualização para a comunidade" placeholderTextColor="#6e747c" multiline />
            <Text style={styles.fieldLabel}>Prioridade</Text>
            <View style={styles.priorityOptions}>
              {['normal', 'high'].map((value) => (
                <Pressable key={value} onPress={() => setNewPriority(value)} style={[styles.priorityOption, newPriority === value && styles.priorityOptionSelected]}>
                  <Text style={[styles.priorityOptionText, newPriority === value && styles.priorityOptionTextSelected]}>{value === 'normal' ? 'Normal' : 'Importante'}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Button label={saving ? 'Publicando...' : 'Publicar aviso'} type="primary" onPress={handleAddNews} disabled={saving} />
              <Button label="Cancelar" type="secondary" onPress={() => setModalVisible(false)} disabled={saving} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaViewComponent>
  );
}
