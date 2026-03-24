/**
 * @file Authentification sociale (Google et Apple Sign-In).
 *
 * Fournit les hooks et fonctions pour connecter les utilisateurs
 * via leurs comptes Google ou Apple. Les tokens OAuth obtenus sont
 * échangés contre des credentials Firebase Auth pour une session
 * unifiée dans toute l'application.
 */

import { useState, useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { auth } from './firebase';
import { signInWithCredential, signInWithPopup, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import Constants from 'expo-constants';

const GOOGLE_WEB_CLIENT_ID = Constants.expoConfig?.extra?.GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = Constants.expoConfig?.extra?.GOOGLE_IOS_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = Constants.expoConfig?.extra?.GOOGLE_ANDROID_CLIENT_ID || '';

/** Hook Expo pour initier le flux d'authentification Google (retourne request, response, promptAsync). */
export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  return { request, response, promptAsync };
};

/** Authentification Google via popup Firebase (pour le web uniquement) */
export const signInWithGooglePopup = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return { success: true, user: result };
  } catch (error: any) {
    console.error('Error signing in with Google popup:', error);
    if (error.code === 'auth/popup-closed-by-user') {
      return { success: false, error: 'Connexion annulée' };
    }
    return { success: false, error: error?.message || 'Erreur de connexion Google' };
  }
};

/** Échange un idToken Google contre un credential Firebase et connecte l'utilisateur. */
export const signInWithGoogleToken = async (idToken: string) => {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    return { success: true, user: result };
  } catch (error: any) {
    console.error('Error signing in with Google:', error);
    return { success: false, error: error?.message || 'Erreur de connexion Google' };
  }
};

/** Lance le flux Apple Sign-In (iOS uniquement) et connecte l'utilisateur à Firebase. */
export const signInWithApple = async () => {
  try {
    if (Platform.OS !== 'ios') {
      return { success: false, error: 'Apple Sign-In is only available on iOS' };
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const { identityToken } = credential;
    if (!identityToken) {
      return { success: false, error: 'No identity token returned from Apple' };
    }

    const provider = new OAuthProvider('apple.com');
    const firebaseCredential = provider.credential({
      idToken: identityToken,
    });

    const result = await signInWithCredential(auth, firebaseCredential);
    return { success: true, user: result };
  } catch (error: any) {
    console.error('Error signing in with Apple:', error);
    if (error.code === 'ERR_REQUEST_CANCELED') {
      return { success: false, error: 'Connexion annulée' };
    }
    return { success: false, error: error?.message || 'Erreur de connexion Apple' };
  }
};

/** Vérifie si Apple Sign-In est disponible sur l'appareil (iOS uniquement). */
export const isAppleAuthAvailable = async () => {
  if (Platform.OS !== 'ios') {
    return false;
  }
  return await AppleAuthentication.isAvailableAsync();
};
