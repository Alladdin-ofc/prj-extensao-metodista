// Arquivo principal do aplicativo
import { BackHandler, Linking, Text, View } from 'react-native';

// Polyfill para compatibilidade com bibliotecas antigas no React Native 0.65+
if (typeof BackHandler.removeEventListener !== 'function') {
  BackHandler.removeEventListener = () => {};
}
if (typeof Linking.removeEventListener !== 'function') {
  Linking.removeEventListener = () => {};
}


//Importando o container de navegação para poder navegar entre as telas
import { NavigationContainer } from '@react-navigation/native';

//Importando o arquivo onde são definidas as telas da aplicação
import Routes from './src/routes';
import { AuthProvider } from './src/context/AuthContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { isFirebaseEmulatorMode } from './src/services/firebaseConfig';

export default function App() {

  return (
    <SafeAreaProvider>
    <View style={{ flex: 1 }}>
    {isFirebaseEmulatorMode && (
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fce8e8' }}>
      <Text accessibilityRole="text" style={{ backgroundColor: '#fce8e8', color: '#7a1515', textAlign: 'center', fontSize: 12, paddingVertical: 4 }}>
        QA local - dados de teste
      </Text>
      </SafeAreaView>
    )}
    <AuthProvider>
      <NavigationContainer>
        <Routes />
      </NavigationContainer>
    </AuthProvider>
    </View>
    </SafeAreaProvider>
  );
}
