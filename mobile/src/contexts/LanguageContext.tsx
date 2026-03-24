/**
 * LanguageContext.tsx - Contexte React pour la gestion de la langue (i18n).
 * 
 * Gère la langue de l'application avec cette priorité :
 * 1. Préférence stockée dans Firestore (utilisateur connecté)
 * 2. Préférence stockée dans AsyncStorage (utilisateur déconnecté)
 * 3. Français par défaut
 * 
 * Expose via useLanguage() :
 * - language : la langue actuelle ('fr' | 'en' | 'es')
 * - setLanguage : change la langue et la persiste (Firestore + local)
 * - t(key) : traduit une clé dans la langue courante
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { getLanguage, setLanguage, Language, t as translate } from '../services/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  /** Fonction de traduction qui utilise la langue courante du contexte */
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('fr');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
    
    // Écouter les changements d'authentification pour recharger la langue
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadLanguage();
      }
    });
    
    return () => unsubscribe();
  }, []);

  /** Charge la langue : d'abord depuis Firestore (si connecté), sinon depuis AsyncStorage */
  const loadLanguage = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const firestoreLang = data.language;
            if (firestoreLang === 'fr' || firestoreLang === 'en' || firestoreLang === 'es') {
              setLanguageState(firestoreLang);
              await setLanguage(firestoreLang);
              setIsLoading(false);
              return;
            }
          }
        } catch (firestoreError) {
          console.warn('Error loading language from Firestore:', firestoreError);
        }
      }
      
      // Sinon charger depuis AsyncStorage
      const savedLang = await getLanguage();
      setLanguageState(savedLang);
    } catch (error) {
      console.error('Error loading language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /** Change la langue : met à jour l'état, AsyncStorage, et Firestore si connecté */
  const handleSetLanguage = async (lang: Language) => {
    try {
      setLanguageState(lang);
      await setLanguage(lang);
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          language: lang,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error setting language:', error);
    }
  };

  if (isLoading) {
    return null;
  }

  // Créer une fonction t qui utilise le state language actuel
  const tWithCurrentLang = (key: string): string => {
    return translate(key, language);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t: tWithCurrentLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

/** Hook pour accéder au contexte de langue. Doit être utilisé dans un LanguageProvider. */
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
