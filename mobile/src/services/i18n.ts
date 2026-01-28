// mobile/src/services/i18n.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'fr' | 'en' | 'es';

const translations = {
  fr: {
    // Navigation
    events: 'Événements',
    profile: 'Profil',
    tickets: 'Mes billets',
    favorites: 'Mes favoris',
    settings: 'Paramètres',
    
    // Profile
    myEvents: 'Mes événements',
    preferences: 'Préférences',
    account: 'Compte',
    about: 'À propos',
    language: 'Langue',
    logout: 'Déconnexion',
    version: 'Version',
    editProfile: 'Modifier le profil',
    save: 'Enregistrer',
    cancel: 'Annuler',
    name: 'Nom',
    email: 'Email',
    role: 'Rôle',
    participant: 'Participant',
    organizer: 'Organisateur',
    
    // Common
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    confirm: 'Confirmer',
    delete: 'Supprimer',
    close: 'Fermer',
  },
  en: {
    // Navigation
    events: 'Events',
    profile: 'Profile',
    tickets: 'My tickets',
    favorites: 'My favorites',
    settings: 'Settings',
    
    // Profile
    myEvents: 'My events',
    preferences: 'Preferences',
    account: 'Account',
    about: 'About',
    language: 'Language',
    logout: 'Logout',
    version: 'Version',
    editProfile: 'Edit profile',
    save: 'Save',
    cancel: 'Cancel',
    name: 'Name',
    email: 'Email',
    role: 'Role',
    participant: 'Participant',
    organizer: 'Organizer',
    
    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    delete: 'Delete',
    close: 'Close',
  },
  es: {
    // Navigation
    events: 'Eventos',
    profile: 'Perfil',
    tickets: 'Mis entradas',
    favorites: 'Mis favoritos',
    settings: 'Configuración',
    
    // Profile
    myEvents: 'Mis eventos',
    preferences: 'Preferencias',
    account: 'Cuenta',
    about: 'Acerca de',
    language: 'Idioma',
    logout: 'Cerrar sesión',
    version: 'Versión',
    editProfile: 'Editar perfil',
    save: 'Guardar',
    cancel: 'Cancelar',
    name: 'Nombre',
    email: 'Email',
    role: 'Rol',
    participant: 'Participante',
    organizer: 'Organizador',
    
    // Common
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    confirm: 'Confirmar',
    delete: 'Eliminar',
    close: 'Cerrar',
  },
};

let currentLanguage: Language = 'fr';

export const setLanguage = async (lang: Language) => {
  currentLanguage = lang;
  await AsyncStorage.setItem('@eventhub_language', lang);
};

export const getLanguage = async (): Promise<Language> => {
  try {
    const savedLang = await AsyncStorage.getItem('@eventhub_language');
    if (savedLang === 'fr' || savedLang === 'en' || savedLang === 'es') {
      currentLanguage = savedLang;
      return savedLang;
    }
  } catch (error) {
    console.error('Error loading language:', error);
  }
  return 'fr';
};

export const t = (key: string, lang?: Language): string => {
  const langToUse = lang || currentLanguage;
  const translation = translations[langToUse];
  return (translation as any)[key] || key;
};

export const getCurrentLanguage = (): Language => {
  return currentLanguage;
};
