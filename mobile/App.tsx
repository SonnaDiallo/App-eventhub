/**
 * App.tsx - Point d'entrée principal de l'application EventHub.
 * 
 * Configure les providers globaux (Stripe, thème, langue),
 * gère les deep links pour la vérification d'email,
 * et adapte l'affichage pour le web (cadre mobile simulé).
 */

import React, { useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { StripeProviderWrapper } from './src/components/StripeProviderWrapper';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import { useNotifications } from './src/hooks/useNotifications';
import { auth } from './src/services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

/** Clé publique Stripe (mode test) pour initialiser le SDK côté client */
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51T4zoMFkn70cTqmSy4r88qMNWzOgyBgHUktVqBQoT4gqMDBmobSz7o0XCbCROiw3K1mRXCmcb9GyTysVxMVGe0j300XCSYytpI';

/**
 * AppContent - Composant interne qui contient la navigation et le thème.
 * Séparé de App() car il a besoin d'accéder au ThemeContext via useTheme().
 */
function AppContent() {
  const { theme, themeMode } = useTheme();
  const { expoPushToken } = useNotifications();

  /** Sélection du thème de base React Navigation selon le mode clair/sombre */
  const BaseTheme = themeMode === 'dark' ? DarkTheme : DefaultTheme;

  /**
   * Écoute les deep links entrants pour gérer la vérification d'email.
   * Quand l'utilisateur clique sur le lien de vérification dans son email,
   * l'app intercepte le lien et recharge le profil Firebase pour mettre à jour
   * le statut emailVerified.
   */
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log('Deep link received:', url);
      
      // Lien de vérification d'email personnalisé
      if (url.includes('verify-email')) {
        console.log('✅ Email verification link detected');
        
        const currentUser = auth.currentUser;
        if (currentUser) {
          try {
            // Recharge le profil utilisateur depuis Firebase pour obtenir le statut à jour
            await currentUser.reload();
            if (currentUser.emailVerified) {
              console.log('✅ Email verified successfully!');
            } else {
              console.log('⏳ Email verification in progress...');
            }
          } catch (error) {
            console.error('Error reloading user:', error);
          }
        } else {
          console.log('User not logged in yet - will verify on login');
        }
      }
      
      // Liens Firebase Dynamic Links (firebaseapp.com ou page.link)
      if (url.includes('firebaseapp.com') || url.includes('page.link')) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.reload();
          console.log('Email verified:', currentUser.emailVerified);
        }
      }
    };

    // Écoute les deep links reçus pendant que l'app est ouverte
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Vérifie si l'app a été lancée via un deep link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * Thème personnalisé pour React Navigation : fusionne le thème de base
   * avec les couleurs du thème applicatif (primary, background, etc.)
   */
  const navTheme = {
    ...BaseTheme,
    dark: themeMode === 'dark',
    colors: {
      ...BaseTheme.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      notification: theme.error,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <AuthNavigator />
    </NavigationContainer>
  );
}

/** Dimensions du cadre mobile simulé sur web (basé sur iPhone 14) */
const MOBILE_VIEWPORT_WIDTH = 390;
const MOBILE_VIEWPORT_MIN_HEIGHT = 844;

/**
 * Styles pour le mode web : simule un écran mobile centré
 * dans un fond sombre, avec ombre portée pour l'effet "device frame".
 */
const styles = StyleSheet.create({
  webMobileOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  webMobileWrapper: {
    width: MOBILE_VIEWPORT_WIDTH,
    height: MOBILE_VIEWPORT_MIN_HEIGHT,
    maxHeight: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
});

/**
 * App - Composant racine exporté.
 * 
 * Encapsule l'app dans les providers globaux (Stripe → Thème → Langue)
 * et ajoute un cadre mobile simulé sur la plateforme web.
 */
export default function App() {
  const content = (
    <StripeProviderWrapper publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <ThemeProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </ThemeProvider>
    </StripeProviderWrapper>
  );

  // Sur web, encadre l'app dans un viewport mobile simulé
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webMobileOuter}>
        <View style={styles.webMobileWrapper}>
          {content}
        </View>
      </View>
    );
  }

  return content;
}