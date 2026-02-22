// mobile/src/theme/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ThemeMode, ThemeColors, themes } from './theme';
import { auth, db } from '../services/firebase';

interface ThemeContextType {
  theme: ThemeColors;
  themeMode: ThemeMode;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@eventhub_theme_mode';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Mode clair uniquement
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Écouter les changements d'authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
      if (user) {
        // Charger le thème depuis Firestore si l'utilisateur est connecté
        loadThemeFromFirestore(user.uid);
      } else {
        // Charger depuis le stockage local si non connecté
        loadThemeFromLocal();
      }
    });

    return () => unsubscribe();
  }, []);

  // Écouter les changements de thème dans Firestore (pour synchronisation en temps réel)
  useEffect(() => {
    if (!userId) return;

    // Vérifier que l'utilisateur est bien authentifié avant d'écouter
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== userId) {
      return;
    }

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const firestoreTheme = data.themeMode;
          if (firestoreTheme === 'light' || firestoreTheme === 'dark') {
            setThemeModeState(firestoreTheme);
            // Mettre à jour le cache local
            AsyncStorage.setItem(THEME_STORAGE_KEY, firestoreTheme).catch(console.error);
          }
        }
      },
      (error: any) => {
        // Ne pas afficher l'erreur si c'est juste une question de permissions
        // L'utilisateur peut utiliser le thème local sans problème
        if (error?.code !== 'permission-denied') {
          console.warn('Error listening to theme changes (using local theme):', error?.message || error);
        }
        // En cas d'erreur, continuer avec le thème local
        // Le thème local est déjà chargé, donc pas besoin de faire quoi que ce soit
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const loadThemeFromLocal = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeModeState(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme from local storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadThemeFromFirestore = async (uid: string) => {
    try {
      setIsLoading(true);
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const firestoreTheme = data.themeMode;
        
        if (firestoreTheme === 'light' || firestoreTheme === 'dark') {
          setThemeModeState(firestoreTheme);
          // Mettre à jour le cache local
          await AsyncStorage.setItem(THEME_STORAGE_KEY, firestoreTheme);
        } else {
          // Si pas de thème dans Firestore, charger depuis le local
          await loadThemeFromLocal();
        }
      } else {
        // Utilisateur n'existe pas encore dans Firestore, charger depuis le local
        await loadThemeFromLocal();
      }
    } catch (error: any) {
      // Ne pas bloquer l'application en cas d'erreur de permissions
      // L'utilisateur peut toujours utiliser le thème local
      if (error?.code !== 'permission-denied') {
        console.warn('Error loading theme from Firestore (using local theme):', error?.message || error);
      }
      // En cas d'erreur, charger depuis le local
      await loadThemeFromLocal();
    } finally {
      setIsLoading(false);
    }
  };

  const saveTheme = async (mode: ThemeMode) => {
    try {
      // Sauvegarder dans le cache local immédiatement
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);

      // Sauvegarder dans Firestore si l'utilisateur est connecté
      if (userId) {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, { themeMode: mode }, { merge: true });
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    saveTheme(mode);
  };

  const toggleTheme = () => {
    const newMode: ThemeMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
  };

  const theme = themes[themeMode];
  const isDarkMode = themeMode === 'dark';

  // Ne pas rendre les enfants tant que le thème n'est pas chargé
  if (isLoading) {
    return null; // Ou un écran de chargement
  }

  return (
    <ThemeContext.Provider value={{ theme, themeMode, isDarkMode, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
