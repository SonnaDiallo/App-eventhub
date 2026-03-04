import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import * as Linking from 'expo-linking';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import { useNotifications } from './src/hooks/useNotifications';
import { auth } from './src/services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Clé publique Stripe - REMPLACE par ta clé qui commence par pk_test_
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51T4zoMFkn70cTqmSy4r88qMNWzOgyBgHUktVqBQoT4gqMDBmobSz7o0XCbCROiw3K1mRXCmcb9GyTysVxMVGe0j300XCSYytpI';

function AppContent() {
  const { theme, themeMode } = useTheme();
  const { expoPushToken } = useNotifications();
  const BaseTheme = themeMode === 'dark' ? DarkTheme : DefaultTheme;

  // Gestionnaire de deep links pour la vérification d'email
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log('Deep link received:', url);
      
      // Vérifier si c'est un lien de vérification d'email
      if (url.includes('verify-email')) {
        console.log('✅ Email verification link detected');
        
        // Essayer de recharger l'utilisateur actuel pour voir si l'email a été vérifié
        const currentUser = auth.currentUser;
        if (currentUser) {
          try {
            await currentUser.reload();
            if (currentUser.emailVerified) {
              console.log('✅ Email verified successfully!');
              // L'utilisateur restera sur l'écran actuel mais sera connecté
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
      
      // Autres cas: lien Firebase standard
      if (url.includes('firebaseapp.com') || url.includes('page.link')) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.reload();
          console.log('Email verified:', currentUser.emailVerified);
        }
      }
    };

    // Écouter les deep links entrants
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Vérifier s'il y a un lien initial au démarrage
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
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

export default function App() {
  return (
    <StripeProvider 
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.eventhub"
      urlScheme="eventhub"
    >
      <ThemeProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </ThemeProvider>
    </StripeProvider>
  );
}