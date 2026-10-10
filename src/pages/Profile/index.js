import React, { useContext, useEffect, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Modal from 'react-native-modal';
import * as ImagePicker from 'expo-image-picker';
import { EmailAuthProvider, reauthenticateWithCredential, updateEmail } from 'firebase/auth';
import { downloadAvatar, uploadAvatar } from '../../services/avatarService';
import { doc, setDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useSessionScope } from '../../context/useSessionScope';
import { Button } from '../../components/Button';
import StatePicker from '../../components/StatePicker';
import { isBrazilianState } from '../../services/brazilianStates';
import { SafeAreaViewComponent } from '../../styles';
import { db } from '../../services/firebaseConfig';
import styles from './styles';

const formatPhone = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  const split = digits.length === 10 ? 6 : 7;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
};

const formatDate = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const formatPostalCode = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

function Field({ label, ...inputProps }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} style={styles.input} placeholderTextColor="#737a82" {...inputProps} />
    </View>
  );
}

export default function Profile({ navigation }) {
  const { height } = useWindowDimensions();
  const modalMaxHeight = Math.max(160, height - 80);
  const { userData, user, signOut, isMaster } = useContext(AuthContext);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhoneType, setEditPhoneType] = useState('celular');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPostalCode, setEditPostalCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [editImageUri, setEditImageUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const draftUid = useRef(null);
  const sessionUid = useRef(user?.uid);
  sessionUid.current = user?.uid;
  const scope = useSessionScope(user?.uid);
  const avatarPath = userData?.avatarPath || (userData?.avatarUrl && user ? `avatars/${user.uid}.jpg` : '');

  useEffect(() => {
    let active = true;
    setAvatar(null);
    if (user && avatarPath) {
      const uid = user.uid;
      downloadAvatar(uid, avatarPath).then((source) => {
        if (active) setAvatar({ uid, path: avatarPath, source });
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [user?.uid, avatarPath, userData]);
  const privateAvatar = avatar && avatar.uid === user?.uid && avatar.path === avatarPath ? avatar.source : null;

  useEffect(() => {
    draftUid.current = null;
    setEditModalVisible(false);
    setEditName('');
    setEditEmail('');
    setEditPhone('');
    setEditPhoneType('celular');
    setEditDateOfBirth('');
    setEditAddress('');
    setEditCity('');
    setEditState('');
    setEditPostalCode('');
    setCurrentPassword('');
    setEditImageUri(null);
    setSaving(false);
  }, [user?.uid]);

  const openEdit = () => {
    if (!user) return;
    scope.invalidate();
    draftUid.current = user.uid;
    setEditName(userData?.name || '');
    setEditEmail(user?.email || userData?.email || '');
    setEditPhone(userData?.phone || '');
    setEditPhoneType(userData?.phoneType || 'celular');
    setEditDateOfBirth(userData?.dateOfBirth || '');
    setEditAddress(userData?.address || '');
    setEditCity(userData?.city || '');
    setEditState(userData?.state || '');
    setEditPostalCode(userData?.postalCode || '');
    setCurrentPassword('');
    setEditImageUri(null);
    setEditModalVisible(true);
  };

  const selectImage = async () => {
    const token = scope.capture();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75
      });
      if (scope.isCurrent(token) && draftUid.current === user?.uid && !result.canceled && result.assets?.[0]) setEditImageUri(result.assets[0].uri);
    } catch (error) {
      if (!scope.isCurrent(token)) return;
      Alert.alert('Foto indisponível', 'Não foi possível abrir suas imagens.');
    }
  };

  const handleSave = async () => {
    if (!user || draftUid.current !== user.uid || saving) return;
    const savedUid = user.uid;
    const token = scope.capture();
    const isCurrentSession = () => scope.isCurrent(token) && sessionUid.current === savedUid && draftUid.current === savedUid;
    if (!editName.trim() || !editEmail.trim()) {
      Alert.alert('Dados incompletos', 'Nome e e-mail são obrigatórios.');
      return;
    }
    const phoneDigits = editPhone.replace(/\D/g, '');
    if (editState !== '' && !isBrazilianState(editState)) {
      Alert.alert('Estado inválido', 'Selecione um estado brasileiro na lista.');
      return;
    }
    if ((editPhone && ![10, 11].includes(phoneDigits.length)) ||
        (editPostalCode && editPostalCode.replace(/\D/g, '').length !== 8)) {
      Alert.alert('Confira seus dados', 'Informe telefone e CEP válidos.');
      return;
    }
    if (editDateOfBirth) {
      const match = editDateOfBirth.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      const day = Number(match?.[1]);
      const month = Number(match?.[2]);
      const year = Number(match?.[3]);
      const date = new Date(year, month - 1, day);
      if (!match || date.getDate() !== day || date.getMonth() !== month - 1 ||
          year < 1900 || date > new Date()) {
        Alert.alert('Data inválida', 'Confira a data de nascimento.');
        return;
      }
    }
    if (editEmail.trim().toLowerCase() !== (user.email || '').toLowerCase() && !currentPassword) {
      Alert.alert('Confirme sua identidade', 'Digite sua senha atual para alterar o e-mail.');
      return;
    }

    setSaving(true);
    let authEmailUpdated = false;
    try {
      let savedAvatarPath = avatarPath;
      if (editImageUri) {
        if (!isCurrentSession()) return;
        savedAvatarPath = await uploadAvatar(savedUid, editImageUri);
      }

      const emailChanged = editEmail.trim().toLowerCase() !== (user.email || '').toLowerCase();
      if (!isCurrentSession()) return;
      if (emailChanged) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        if (!isCurrentSession()) return;
        await updateEmail(user, editEmail.trim());
        authEmailUpdated = true;
      }

      if (!isCurrentSession()) return;
      await setDoc(doc(db, 'users', savedUid), {
        name: editName.trim(),
        email: user.email || editEmail.trim(),
        phone: editPhone,
        phoneType: editPhoneType,
        dateOfBirth: editDateOfBirth,
        address: editAddress.trim(),
        city: editCity.trim(),
        state: editState,
        postalCode: editPostalCode,
        ...(savedAvatarPath ? { avatarPath: savedAvatarPath } : {}),
        avatarUrl: '',
        createdAt: userData?.createdAt || new Date().toISOString()
      }, { merge: true });
      if (!isCurrentSession()) return;
      setEditModalVisible(false);
      Alert.alert('Perfil atualizado', 'Suas informações foram salvas.');
    } catch (error) {
      if (!isCurrentSession()) return;
      console.warn('Profile update error:', error.code || error.message);
      const message = authEmailUpdated
        ? 'Seu e-mail de acesso foi alterado, mas os dados do perfil ainda não foram salvos. Use o novo e-mail para entrar e tente salvar o perfil novamente.'
        : error.code === 'auth/requires-recent-login' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential'
        ? 'Não foi possível confirmar sua senha. Entre novamente e tente trocar o e-mail.'
        : 'Verifique sua conexão e tente novamente.';
      Alert.alert('Não foi possível salvar', message);
    } finally {
      if (isCurrentSession()) setSaving(false);
    }
  };

  const handleLogout = () => Alert.alert('Sair da conta', 'Deseja encerrar sua sessão neste dispositivo?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Sair', style: 'destructive', onPress: async () => {
      try {
        await signOut();
        navigation.navigate('Login');
      } catch (error) {
        Alert.alert('Não foi possível sair', 'Sua sessão permanece ativa. Tente novamente.');
      }
    } }
  ]);

  if (!user) {
    return (
      <SafeAreaViewComponent>
        <View style={styles.guestPage}>
          <View style={styles.guestIcon}><Ionicons name="person-outline" size={38} color="#167ec3" /></View>
          <Text style={styles.guestTitle}>Seu espaço na comunidade</Text>
          <Text style={styles.guestText}>Entre ou crie seu cadastro para manter seus dados e sua foto de perfil.</Text>
          <View style={styles.guestActions}>
            <Button label="Entrar" type="primary" onPress={() => navigation.navigate('SignIn')} />
            <Button label="Criar cadastro" type="secondary" onPress={() => navigation.navigate('Register')} />
          </View>
        </View>
      </SafeAreaViewComponent>
    );
  }

  const avatarSource = editImageUri ? { uri: editImageUri } : privateAvatar;
  const addressText = [userData?.address, [userData?.city, userData?.state].filter(Boolean).join(' - '), userData?.postalCode].filter(Boolean).join(', ');

  return (
    <SafeAreaViewComponent>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          {privateAvatar ? <Image source={privateAvatar} style={styles.avatar} /> : <View style={styles.avatarFallback}><Ionicons name="person" size={42} color="#fff" /></View>}
          <Text style={styles.name}>{userData?.name || 'Membro'}</Text>
          <Text style={styles.email}>{user.email || userData?.email}</Text>
          {!!userData?.address && <Text style={styles.location}>{userData.city}{userData.state ? `, ${userData.state}` : ''}</Text>}
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Dados pessoais</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Editar" onPress={openEdit} style={styles.editButton}>
            <Ionicons name="create-outline" size={17} color="#167ec3" />
            <Text style={styles.editButtonText}>Editar</Text>
          </Pressable>
        </View>

        <View style={styles.infoList}>
          <InfoRow icon="call-outline" label={userData?.phoneType === 'residencial' ? 'Telefone residencial' : 'Celular'} value={userData?.phone || 'Não informado'} />
          <InfoRow icon="calendar-outline" label="Data de nascimento" value={userData?.dateOfBirth || 'Não informado'} />
          <InfoRow icon="mail-outline" label="E-mail" value={user.email || userData?.email || 'Não informado'} />
          <InfoRow icon="location-outline" label="Endereço" value={addressText || 'Não informado'} />
        </View>

        <View style={styles.logoutArea}>
          {isMaster && <Button label="Administrar usuários" type="primary" onPress={() => navigation.navigate('Administration')} />}
          <Button label="Sair da conta" type="secondary" onPress={handleLogout} />
        </View>
      </ScrollView>

      <Modal isVisible={editModalVisible && draftUid.current === user.uid} onBackdropPress={() => !saving && setEditModalVisible(false)} onBackButtonPress={() => !saving && setEditModalVisible(false)} avoidKeyboard>
        <KeyboardAvoidingView style={{ maxHeight: modalMaxHeight }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={[styles.modal, { maxHeight: modalMaxHeight }]} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Editar perfil</Text>
            <Pressable accessibilityRole="button" onPress={selectImage} style={styles.avatarPicker}>
              {avatarSource ? <Image source={avatarSource} style={styles.avatarPreview} /> : <Ionicons name="camera-outline" size={30} color="#4f5962" />}
              <Text style={styles.avatarLabel}>Alterar foto</Text>
            </Pressable>

            <Field label="Nome" value={editName} onChangeText={setEditName} autoCapitalize="words" />
            <Field label="E-mail" value={editEmail} onChangeText={setEditEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
            {editEmail.trim().toLowerCase() !== (user.email || '').toLowerCase() && <Field label="Senha atual para confirmar o e-mail" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" />}
            <Field label="Telefone" value={editPhone} onChangeText={(value) => setEditPhone(formatPhone(value))} keyboardType="phone-pad" maxLength={15} />
            <Text style={styles.label}>Tipo de telefone</Text>
            <View style={styles.phoneTypeRow}>
              {['celular', 'residencial'].map((type) => (
                <Pressable key={type} onPress={() => setEditPhoneType(type)} style={[styles.phoneType, editPhoneType === type && styles.phoneTypeSelected]}>
                  <Text style={[styles.phoneTypeText, editPhoneType === type && styles.phoneTypeTextSelected]}>{type === 'celular' ? 'Celular' : 'Residencial'}</Text>
                </Pressable>
              ))}
            </View>
            <Field label="Data de nascimento" value={editDateOfBirth} onChangeText={(value) => setEditDateOfBirth(formatDate(value))} placeholder="dd/mm/aaaa" keyboardType="numeric" maxLength={10} />
            <Field label="Endereço" value={editAddress} onChangeText={setEditAddress} autoCapitalize="words" />
            <Field label="Cidade" value={editCity} onChangeText={setEditCity} autoCapitalize="words" />
            <StatePicker accessibilityLabel="Estado (UF)" value={editState} onValueChange={setEditState} enabled={!saving} />
            <Field label="CEP" value={editPostalCode} onChangeText={(value) => setEditPostalCode(formatPostalCode(value))} keyboardType="numeric" maxLength={9} />
            <View style={styles.modalActions}>
              <Button label={saving ? 'Salvando...' : 'Salvar mudanças'} type="primary" onPress={handleSave} disabled={saving} />
              <Button label="Cancelar" type="secondary" onPress={() => setEditModalVisible(false)} disabled={saving} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaViewComponent>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={20} color="#167ec3" /></View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}
