import { initializeApp } from 'firebase/app';
import {
    initializeAuth,
    getAuth,
    getReactNativePersistence,
    connectAuthEmulator
} from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

export const isFirebaseEmulatorMode = process.env.EXPO_PUBLIC_FIREBASE_EMULATORS === '1';

// Reject cloud projects before any Firebase service can initialize.
if (isFirebaseEmulatorMode && firebaseConfig.projectId !== 'demo-metodista-backend') {
    throw new Error('Local Firebase QA requires EXPO_PUBLIC_FIREBASE_PROJECT_ID=demo-metodista-backend');
}

const app = initializeApp(firebaseConfig);

let authInstance;

if (Platform.OS === 'web') {
    authInstance = getAuth(app);
} else {
    try {
        authInstance = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
        });
    } catch (error) {
        authInstance = getAuth(app);
    }
}

export const auth = authInstance;

if (isFirebaseEmulatorMode) {
    // App.js displays a persistent QA banner without covering navigation controls.
    connectAuthEmulator(auth, 'http://127.0.0.1:19099', { disableWarnings: true });
}

export const db = initializeFirestore(app, {
    localCache: memoryLocalCache()
});

if (isFirebaseEmulatorMode) {
    connectFirestoreEmulator(db, '127.0.0.1', 18080);
}

export const storage = getStorage(app);

if (isFirebaseEmulatorMode) {
    connectStorageEmulator(storage, '127.0.0.1', 19199);
}

// getFunctions(app, region) is also used by adminService; the SDK shares this instance.
export const functions = getFunctions(app, 'southamerica-east1');

if (isFirebaseEmulatorMode) {
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
