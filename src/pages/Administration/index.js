import React, { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { SafeAreaViewComponent } from '../../styles';
import { listMembersForAdministration, setMemberRole } from '../../services/adminService';
import styles from './styles';

const roleLabels = { member: 'Membro', admin: 'Administrador', master: 'Administrador master' };
const errorMessage = (error) => {
  if (error.code === 'functions/permission-denied' || error.code === 'functions/unauthenticated') return 'Acesso administrativo não autorizado.';
  if (error.code === 'functions/failed-precondition') return 'Não é possível remover o último administrador master.';
  if (error.code === 'functions/not-found') return 'Serviço ou usuário indisponível. Confira a configuração do Firebase.';
  return 'Não foi possível concluir. Confira sua conexão e tente novamente.';
};

export default function Administration({ navigation }) {
  const { user, isMaster } = useContext(AuthContext);
  const [members, setMembers] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingUid, setPendingUid] = useState(null);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const busy = useRef(false);

  const load = async (append = false) => {
    if (!isMaster || !user || busy.current || pendingUid) return;
    const current = generation.current;
    busy.current = true;
    setLoading(true);
    setError('');
    try {
      const result = await listMembersForAdministration(append ? { pageToken: nextPageToken } : {});
      if (current !== generation.current) return;
      setMembers((previous) => {
        const combined = append ? [...previous, ...result.members] : result.members;
        return [...new Map(combined.map((member) => [member.uid, member])).values()];
      });
      setNextPageToken(result.nextPageToken);
    } catch (loadError) {
      if (current === generation.current) setError(errorMessage(loadError));
    } finally {
      if (current === generation.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    generation.current += 1;
    busy.current = false;
    setMembers([]);
    setNextPageToken(null);
    setPendingUid(null);
    setError('');
    setLoading(false);
    if (isMaster && user) load();
    return () => { generation.current += 1; };
  }, [user?.uid, isMaster]);

  const changeRole = async (member, role, expectedGeneration) => {
    if (!isMaster || expectedGeneration !== generation.current || busy.current) return;
    busy.current = true;
    setPendingUid(member.uid);
    try {
      const result = await setMemberRole({ uid: member.uid, role });
      if (expectedGeneration !== generation.current) return;
      setMembers((previous) => previous.map((item) => item.uid === result.uid ? { ...item, role: result.role } : item));
      Alert.alert('Permissão atualizada', `${member.name || member.email || 'Usuário'}: ${roleLabels[result.role]}.`);
    } catch (changeError) {
      if (expectedGeneration === generation.current) Alert.alert('Não foi possível alterar', errorMessage(changeError));
    } finally {
      if (expectedGeneration === generation.current) {
        busy.current = false;
        setPendingUid(null);
      }
    }
  };

  const selectRole = (member) => {
    const current = generation.current;
    Alert.alert(member.name || member.email || 'Usuário', roleLabels[member.role], [
      ...Object.entries(roleLabels).filter(([role]) => role !== member.role).map(([role, label]) => ({
        text: label,
        onPress: () => {
          if (current !== generation.current) return;
          Alert.alert('Confirmar permissão', `Definir ${member.name || member.email || 'usuário'} como ${label.toLowerCase()}?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Confirmar', onPress: () => changeRole(member, role, current) }
          ]);
        }
      })),
      { text: 'Cancelar', style: 'cancel' }
    ]);
  };

  return (
    <SafeAreaViewComponent>
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar ao perfil" style={styles.iconButton} onPress={() => navigation.navigate('Profile')}><Ionicons name="arrow-back" size={24} color="#202328" /></Pressable>
          <View style={styles.heading}><Text style={styles.title}>Administração</Text><Text style={styles.subtitle}>Usuários e permissões</Text></View>
          {isMaster && <Pressable accessibilityRole="button" accessibilityLabel="Atualizar usuários" accessibilityState={{ disabled: loading || !!pendingUid }} disabled={loading || !!pendingUid} style={styles.iconButton} onPress={() => load()}><Ionicons name="refresh" size={23} color="#167ec3" /></Pressable>}
        </View>
        {!isMaster ? <View style={styles.feedback}><Ionicons name="lock-closed-outline" size={32} color="#59616b" /><Text style={styles.message}>Acesso restrito ao administrador master.</Text></View> : (
          <FlatList
            data={members}
            keyExtractor={(member) => member.uid}
            renderItem={({ item }) => <View style={styles.member}>
              <View style={styles.memberCopy}><Text style={styles.name}>{item.name || 'Usuário'}{item.uid === user.uid ? ' (você)' : ''}</Text><Text style={styles.email}>{item.email}</Text><Text style={styles.role}>{roleLabels[item.role]}</Text></View>
              {pendingUid === item.uid ? <ActivityIndicator color="#167ec3" /> : <Pressable accessibilityRole="button" accessibilityLabel={`Alterar permissão de ${item.name || item.email || 'usuário'}`} disabled={loading || !!pendingUid} style={styles.iconButton} onPress={() => selectRole(item)}><Ionicons name="shield-checkmark-outline" size={24} color="#167ec3" /></Pressable>}
            </View>}
            ListEmptyComponent={!loading && !error ? <View style={styles.feedback}><Text style={styles.message}>Nenhum usuário encontrado.</Text></View> : null}
            ListFooterComponent={<View>
              {!!error && <View style={styles.feedback}><Text style={styles.error}>{error}</Text></View>}
              {loading && <View style={styles.feedback}><ActivityIndicator color="#167ec3" /></View>}
              {!!nextPageToken && !loading && <Pressable accessibilityRole="button" accessibilityLabel="Carregar mais usuários" style={styles.loadMore} disabled={!!pendingUid} onPress={() => load(true)}><Ionicons name="chevron-down" size={18} color="#167ec3" /><Text style={styles.loadMoreText}>Carregar mais</Text></Pressable>}
            </View>}
          />
        )}
      </View>
    </SafeAreaViewComponent>
  );
}
