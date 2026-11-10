const usesEmulators = process.env.EXPO_PUBLIC_FIREBASE_EMULATORS === '1';
export const firebasePlan = process.env.EXPO_PUBLIC_FIREBASE_PLAN || 'spark';

// Local emulators provide these services without enabling cloud billing.
export const hasStorage = usesEmulators || firebasePlan === 'blaze';
export const hasAdminFunctions = usesEmulators || firebasePlan === 'blaze';
