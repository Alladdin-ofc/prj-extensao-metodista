import React, { useState } from 'react';
import { StyleSheet, Alert, View, TextInput, Platform, Text, Image, TouchableOpacity as RNTouchableOpacity, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaViewComponent } from '../../styles';
import { Ionicons } from '@expo/vector-icons';
import { Button } from "../../components/Button";
import Modal from 'react-native-modal';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import MetodistaLogo from '../../../assets/MetodistaLogo.png';
import {
  SignInContainer,
  HeaderContainer,
  HeaderTitle,
  CancelButton,
  FormContainer,
  FormItem,
  FormIcon,
  FormInput,
  SrcContainer
} from './styles';

export default function SignIn({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erro", "Por favor, preencha e-mail e senha.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert("Sucesso", "Login realizado com sucesso!");
      navigation.navigate('Home');
    } catch (error) {
      console.warn('Login error:', error.code);
      let errorMessage = "Usuário não cadastrado e/ou senha incorreta.";
      
      if (error.code === 'auth/user-not-found' ||
          error.code === 'auth/wrong-password' ||
          error.code === 'auth/invalid-credential' ||
          error.code === 'auth/invalid-login-credentials') {
        errorMessage = "Usuário não cadastrado e/ou senha incorreta.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "E-mail inválido.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
      }
      
      Alert.alert("Erro de Autenticação", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert("Atenção", "Por favor, digite seu e-mail.");
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setForgotPasswordModalVisible(false);
      setForgotEmail('');
      Alert.alert("Enviado!", "Verifique sua caixa de entrada para redefinir sua senha.");
    } catch (err) {
      console.warn('Password reset error:', err.code, err.message);
      let msg = "Não foi possível enviar o e-mail. Verifique se o endereço está correto e cadastrado.";
      if (err.code === 'auth/user-not-found') msg = "Usuário não encontrado. Verifique o e-mail digitado.";
      if (err.code === 'auth/invalid-email') msg = "E-mail inválido.";
      if (err.code === 'auth/too-many-requests') msg = "Muitas tentativas. Aguarde um pouco.";
      
      Alert.alert("Erro (" + err.code + ")", msg);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <SafeAreaViewComponent>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        resetScrollToCoords={{ x: 0, y: 0 }}
        scrollEnabled={true}
      >
        <SignInContainer>
          <Image source={MetodistaLogo} style={styles.logo} resizeMode="contain" />
          <HeaderContainer>
            <HeaderTitle>Entre em sua conta</HeaderTitle>
            <CancelButton onPress={() => navigation.navigate('Login')}>
              <Text>Voltar</Text>
            </CancelButton>
          </HeaderContainer>

          <FormContainer>
            <FormItem>
              <FormIcon>
                <Ionicons name="mail" size={24} color="black" />
              </FormIcon>
              <FormInput 
                placeholder="E-mail" 
                placeholderTextColor="#9ca3af"
                value={email} 
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </FormItem>

            <FormItem>
              <FormIcon>
                <Ionicons name="lock-closed" size={24} color="black" />
              </FormIcon>
              <TextInput 
                style={styles.passwordInput}
                placeholder="Senha" 
                placeholderTextColor="#9ca3af"
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                underlineColorAndroid="transparent"
              />
            </FormItem>
          </FormContainer>

          <SrcContainer>
            <Button 
              label={loading ? "Carregando..." : "Acessar"} 
              type="primary" 
              onPress={handleLogin}
              disabled={loading}
            />
            <RNTouchableOpacity 
              onPress={() => {
                setForgotEmail(email);
                setForgotPasswordModalVisible(true);
              }}
            >
              <Text style={styles.forgotPasswordText}>
                Esqueceu sua senha?
              </Text>
            </RNTouchableOpacity>
          </SrcContainer>
        </SignInContainer>
      </KeyboardAwareScrollView>

      <Modal isVisible={forgotPasswordModalVisible} onBackdropPress={() => setForgotPasswordModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recuperar Senha</Text>
            <Text style={styles.modalDescription}>
              Um link para redefinir sua senha será enviado para o e-mail abaixo:
            </Text>
            <TextInput
              style={styles.input}
              value={forgotEmail}
              onChangeText={setForgotEmail}
              placeholder="Seu e-mail"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={{ marginTop: 24, gap: 8 }}>
              <Button 
                label={resetLoading ? "Enviando..." : "Enviar E-mail"} 
                type="primary" 
                onPress={handleForgotPassword}
                disabled={resetLoading}
              />
              <Button label="Cancelar" type="secondary" onPress={() => setForgotPasswordModalVisible(false)} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaViewComponent>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  logo: {
    width: 92,
    height: 92,
    marginBottom: 18
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
  passwordInput: {
    borderColor: '#d7dbe0',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    flex: 1,
    minWidth: 0,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#3b82f6',
    marginTop: 12,
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  }
});
