import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from 'firebase/auth';

type FirebaseConfig = {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
const firebaseConfig = extra.firebase as FirebaseConfig | undefined;

if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId || !firebaseConfig?.appId) {
  throw new Error(
    'Firebase config missing. Add expo.extra.firebase (apiKey, projectId, appId) in app.json.'
  );
}

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Ensure RN persistence for Firebase Auth (must use initializeAuth on first init)
export const auth = getApps().length === 1
  ? initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  : getAuth(firebaseApp);

export const db = getFirestore(firebaseApp);
