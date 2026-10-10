import React, { useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { uploadAvatar } from '../../services/avatarService';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import StatePicker from '../../components/StatePicker';
import { isBrazilianState } from '../../services/brazilianStates';
import { SafeAreaViewComponent } from '../../styles';
import { auth, db } from '../../services/firebaseConfig';
import MetodistaLogo from '../../../assets/MetodistaLogo.png';
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

export default function Register({ navigation }) {
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneType, setPhoneType] = useState('celular');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75
      });
      if (!result.canceled && result.assets?.[0]) setImageUri(result.assets[0].uri);
    } catch (error) {
      Alert.alert('Foto indisponível', 'Não foi possível abrir suas imagens.');
    }
  };

  const validate = () => {
    if (!name.trim() || !email.trim() || !password || !phone.trim() || !address.trim() || !city.trim() || !state.trim() || !postalCode.trim()) {
      Alert.alert('Complete seu cadastro', 'Preencha nome, e-mail, senha, telefone e endereço.');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Senha curta', 'Use pelo menos 6 caracteres.');
      return false;
    }
    if (!isBrazilianState(state)) {
      Alert.alert('Estado inválido', 'Selecione um estado brasileiro na lista.');
      return false;
    }
    if (phone.replace(/\D/g, '').length < 10 || postalCode.replace(/\D/g, '').length !== 8) {
      Alert.alert('Confira seus dados', 'Informe um telefone e um CEP válidos.');
      return false;
    }
    if (dateOfBirth) {
      const match = dateOfBirth.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!match) {
        Alert.alert('Data inválida', 'Use o formato dd/mm/aaaa.');
        return false;
      }
      const [, day, month, year] = match.map(Number);
      const parsedDate = new Date(year, month - 1, day);
      if (parsedDate.getDate() !== day || parsedDate.getMonth() !== month - 1 || parsedDate > new Date() || year < 1900) {
        Alert.alert('Data inválida', 'Confira o dia, o mês e o ano informados.');
        return false;
      }
    }
    return true;
  };

  const onFinish = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      let avatarPath = '';

      if (imageUri) {
        try {
          avatarPath = await uploadAvatar(credential.user.uid, imageUri);
        } catch (uploadError) {
          console.warn('Avatar upload error:', uploadError.code || uploadError.message);
        }
      }

      await setDoc(doc(db, 'users', credential.user.uid), {
        name: name.trim(),
        dateOfBirth,
        email: email.trim(),
        phone,
        phoneType,
        address: address.trim(),
        city: city.trim(),
        state,
        postalCode,
        ...(avatarPath ? { avatarPath } : {}),
        createdAt: new Date().toISOString()
      });
      Alert.alert('Cadastro concluído', 'Sua conta foi criada. Boas-vindas à comunidade!');
      navigation.navigate('Home');
    } catch (error) {
      console.warn('Register error:', error.code || error.message);
      const messages = {
        'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
        'auth/invalid-email': 'Informe um e-mail válido.',
        'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
        'permission-denied': 'Sua conta foi criada, mas os dados do perfil não puderam ser salvos. Entre em contato com a administração.'
      };
      Alert.alert('Não foi possível concluir', messages[error.code] || 'Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaViewComponent>
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={24}>
        <View style={styles.page}>
          <View style={styles.header}>
            <Image source={MetodistaLogo} style={styles.logo} resizeMode="contain" />
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Criar cadastro</Text>
              <Text style={styles.subtitle}>Faça parte da comunidade.</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Login')} style={styles.backButton}>
              <Text style={styles.backText}>Voltar</Text>
            </Pressable>
          </View>

          <Pressable accessibilityRole="button" onPress={selectImage} style={styles.avatarPicker}>
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.avatar} /> : <Ionicons name="camera-outline" size={30} color="#4f5962" />}
            <Text style={styles.avatarLabel}>{imageUri ? 'Alterar foto' : 'Adicionar foto'}</Text>
          </Pressable>

          <Field label="Nome completo" value={name} onChangeText={setName} placeholder="Seu nome" autoCapitalize="words" />
          <Field label="Data de nascimento" value={dateOfBirth} onChangeText={(value) => setDateOfBirth(formatDate(value))} placeholder="dd/mm/aaaa" keyboardType="numeric" maxLength={10} />
          <Field label="E-mail" value={email} onChangeText={setEmail} placeholder="nome@exemplo.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
          <Field label="Senha" value={password} onChangeText={setPassword} placeholder="Mínimo de 6 caracteres" secureTextEntry autoCapitalize="none" autoCorrect={false} />

          <Field label="Telefone" value={phone} onChangeText={(value) => setPhone(formatPhone(value))} placeholder="(11) 99999-9999" keyboardType="phone-pad" maxLength={15} />
          <Text style={styles.label}>Tipo de telefone</Text>
          <View style={styles.segmentedRow}>
            {[
              { id: 'celular', label: 'Celular' },
              { id: 'residencial', label: 'Residencial' }
            ].map((item) => (
              <Pressable key={item.id} onPress={() => setPhoneType(item.id)} style={[styles.segment, phoneType === item.id && styles.segmentSelected]}>
                <Text style={[styles.segmentText, phoneType === item.id && styles.segmentTextSelected]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <Field label="Endereço" value={address} onChangeText={setAddress} placeholder="Rua, número e complemento" autoCapitalize="words" />
          <Field label="Cidade" value={city} onChangeText={setCity} placeholder="Cidade" autoCapitalize="words" />
          <StatePicker accessibilityLabel="Estado (UF)" value={state} onValueChange={setState} enabled={!loading} />
          <Field label="CEP" value={postalCode} onChangeText={(value) => setPostalCode(formatPostalCode(value))} placeholder="00000-000" keyboardType="numeric" maxLength={9} />

          <View style={styles.actions}>
            <Button label={loading ? 'Criando sua conta...' : 'Continuar'} type="primary" onPress={onFinish} disabled={loading} />
            <Text style={styles.privacyNote}>Seus dados serão usados para manter seu perfil atualizado na comunidade.</Text>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaViewComponent>
  );
}
