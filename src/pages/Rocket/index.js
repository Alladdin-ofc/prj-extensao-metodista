import React, { useContext, useEffect, useState } from 'react';
import { Alert, View, TextInput, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaViewComponent } from '../../styles';
import { Ionicons } from '@expo/vector-icons';
import { Button } from "../../components/Button";
import * as Clipboard from 'expo-clipboard';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { AuthContext } from '../../context/AuthContext';
import { useSessionScope } from '../../context/useSessionScope';
import Modal from 'react-native-modal';
import { Text } from 'react-native';
import {
  RocketContainer,
  HeaderContainer,
  PageTitle,
  SubTitle,
  PixCard,
  PixLabel,
  PixKey,
  VerseContainer,
  VerseText
} from './styles';

const DEFAULT_PIX = '';
const DEFAULT_PIX_LABEL = 'Chave PIX da igreja';

export default function Rocket() {
  const { isAdmin, user } = useContext(AuthContext);
  const [pixKey, setPixKey] = useState(DEFAULT_PIX);
  const [pixLabel, setPixLabel] = useState(DEFAULT_PIX_LABEL);
  const [modalVisible, setModalVisible] = useState(false);
  const [editKey, setEditKey] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const scope = useSessionScope(user?.uid, isAdmin);

  useEffect(() => {
    let active = true;
    setPixKey(DEFAULT_PIX);
    setPixLabel(DEFAULT_PIX_LABEL);
    setModalVisible(false);
    setEditKey('');
    setEditLabel('');
    setSaving(false);
    const unsubscribe = onSnapshot(doc(db, 'config', 'pix'), (docSnap) => {
      if (!active) return;
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPixKey(data.key || DEFAULT_PIX);
        setPixLabel(data.label || DEFAULT_PIX_LABEL);
      } else {
        setPixKey(DEFAULT_PIX);
        setPixLabel(DEFAULT_PIX_LABEL);
      }
    }, (err) => {
      if (!active) return;
      setPixKey(DEFAULT_PIX);
      setPixLabel(DEFAULT_PIX_LABEL);
      console.warn('Pix listener error:', err.code || err.message);
    });
    return () => { active = false; unsubscribe(); };
  }, [user?.uid]);

  useEffect(() => {
    if (!isAdmin) { setModalVisible(false); setEditKey(''); setEditLabel(''); setSaving(false); }
  }, [isAdmin]);

  const copyToClipboard = async () => {
    if (!pixKey) {
      Alert.alert('Chave indisponível', 'A administração ainda não cadastrou a chave PIX.');
      return;
    }
    try {
      await Clipboard.setStringAsync(pixKey);
      Alert.alert('Chave copiada', 'Confira o destinatário no aplicativo do seu banco antes de confirmar.');
    } catch (error) {
      Alert.alert('Não foi possível copiar', 'Selecione e copie a chave manualmente.');
    }
  };

  const openEditModal = () => {
    if (!isAdmin || !user) return;
    scope.invalidate();
    setSaving(false);
    setEditKey(pixKey);
    setEditLabel(pixLabel);
    setModalVisible(true);
  };

  const closeEditModal = () => {
    scope.invalidate();
    setSaving(false);
    setModalVisible(false);
  };

  const savePixKey = async () => {
    if (!isAdmin || !user || saving) return;
    if (!editKey.trim()) {
      Alert.alert("Atenção", "A chave PIX não pode estar vazia.");
      return;
    }
    setSaving(true);
    const token = scope.capture();
    try {
      await setDoc(doc(db, 'config', 'pix'), {
        key: editKey.trim(),
        label: editLabel.trim() || DEFAULT_PIX_LABEL
      });
      if (!scope.isCurrent(token)) return;
      setModalVisible(false);
      Alert.alert("Sucesso", "Chave PIX atualizada!");
    } catch (err) {
      if (!scope.isCurrent(token)) return;
      console.warn('PIX save error:', err.code || err.message);
      Alert.alert("Erro", "Não foi possível atualizar a chave PIX.");
    } finally {
      if (scope.isCurrent(token)) setSaving(false);
    }
  };

  return (
    <SafeAreaViewComponent>
      <RocketContainer>
        <HeaderContainer>
          <View style={styles.headerIcon}><Ionicons name="heart-outline" size={26} color="#c92834" /></View>
          <PageTitle>Dízimos e Ofertas</PageTitle>
          <SubTitle>Contribua com a missão da comunidade.</SubTitle>
        </HeaderContainer>

        <PixCard>
          <View style={styles.pixHeading}>
            <Ionicons name="qr-code-outline" size={22} color="#167ec3" />
            <PixLabel>{pixLabel}</PixLabel>
          </View>
          <PixKey selectable>{pixKey || 'Chave ainda não cadastrada'}</PixKey>
          {!pixKey && <Text style={styles.pixNotice}>Quando a chave oficial estiver disponível, ela aparecerá aqui.</Text>}
          <Button label="Copiar chave PIX" type="primary" onPress={copyToClipboard} disabled={!pixKey} />
          {isAdmin && (
            <View style={{ marginTop: 12 }}>
              <Button label="Editar dados do PIX" type="secondary" onPress={openEditModal} />
            </View>
          )}
        </PixCard>

        <VerseContainer>
          <VerseText>
            "Cada um dê conforme determinou em seu coração, não com pesar ou por obrigação, pois Deus ama quem dá com alegria."
            {"\n\n"}
            2 Coríntios 9:7
          </VerseText>
        </VerseContainer>

        <View style={{ height: 32 }} />
      </RocketContainer>

      <Modal isVisible={modalVisible} onBackdropPress={closeEditModal} onBackButtonPress={closeEditModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Chave PIX</Text>
            <Text style={styles.modalLabel}>Tipo (CNPJ, Celular, E-mail...)</Text>
            <TextInput
              style={styles.input}
              value={editLabel}
              onChangeText={setEditLabel}
              placeholder="Ex: Chave PIX (CNPJ)"
              placeholderTextColor="#9ca3af"
            />
            <Text style={[styles.modalLabel, { marginTop: 8 }]}>Chave PIX</Text>
            <TextInput
              style={styles.input}
              value={editKey}
              onChangeText={setEditKey}
              placeholder="Digite a chave PIX"
              placeholderTextColor="#9ca3af"
            />
            <View style={{ marginTop: 16, gap: 8 }}>
              <Button label={saving ? "Salvando..." : "Salvar"} type="primary" onPress={savePixKey} disabled={saving} />
              <Button label="Cancelar" type="secondary" onPress={closeEditModal} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaViewComponent>
  );
}

const styles = StyleSheet.create({
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8e5e5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pixHeading: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  pixNotice: {
    color: '#5f666e',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
  },
  input: {
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  }
});
