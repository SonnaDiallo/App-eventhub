import { Platform } from 'react-native';
import Constants from 'expo-constants';

declare const __DEV__: boolean;

// Configuration de l'API
// ✅ Plus besoin de changer l'IP dans le code : mets API_URL dans mobile/.env (copie .env.example en .env).
// Au démarrage, le backend affiche la ligne exacte à copier (API_URL=http://...).
export const API_CONFIG = {
  LOCAL_IP: '10.5.21.22', // utilisé seulement si API_URL absent dans .env
  PORT: 5000,
  TIMEOUT: 15000,
  TIMEOUT_WITH_EXTERNAL: 60000,
};

// Fonction pour obtenir l'URL de base de l'API
export const getApiBaseUrl = (): string => {
  // 1. Vérifier d'abord s'il y a une URL publique configurée dans app.json
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const publicApiUrl = extra.apiUrl as string | undefined;
  
  if (publicApiUrl) {
    console.log('🌐 Using public API URL from app.json:', publicApiUrl);
    return publicApiUrl;
  }

  if (__DEV__) {
    // iOS (iPhone ou Simulator) : utilise toujours l'IP locale
    if (Platform.OS === 'ios') {
      return `http://${API_CONFIG.LOCAL_IP}:${API_CONFIG.PORT}/api`;
    }
    
    // Android Emulator : utilise 10.0.2.2 (localhost de l'émulateur)
    if (Platform.OS === 'android') {
      return `http://10.0.2.2:${API_CONFIG.PORT}/api`;
    }
  }
  
  // Production : utilise l'IP locale (à remplacer par l'URL de production)
  return `http://${API_CONFIG.LOCAL_IP}:${API_CONFIG.PORT}/api`;
};

// Fonction pour obtenir l'URL de base du serveur (sans /api)
export const getServerBaseUrl = (): string => {
  const apiUrl = getApiBaseUrl();
  // Retirer /api de la fin pour avoir l'URL du serveur
  return apiUrl.replace(/\/api$/, '');
};

/**
 * Normalise une URL d'image pour qu'elle soit toujours accessible
 * depuis le mobile, même si l'IP du serveur a changé depuis l'upload.
 * 
 * Exemples:
 * - "http://192.168.1.10:5000/images/events/xxx.jpg" -> "http://CURRENT_IP:5000/images/events/xxx.jpg"
 * - "/images/events/xxx.jpg" -> "http://CURRENT_IP:5000/images/events/xxx.jpg"
 * - "https://example.com/image.jpg" -> "https://example.com/image.jpg" (inchangé)
 */
export const normalizeImageUrl = (url: string | undefined | null): string => {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  // Si c'est une URL externe (Unsplash, Ticketmaster, etc.), ne pas modifier
  if (url.includes('unsplash.com') || 
      url.includes('ticketmaster') || 
      url.includes('cloudinary') ||
      url.includes('firebase') ||
      url.startsWith('https://')) {
    return url;
  }
  
  // Si c'est un chemin relatif commençant par /images
  if (url.startsWith('/images/')) {
    return `${getServerBaseUrl()}${url}`;
  }
  
  // Si c'est une URL locale avec une IP différente (ex: http://192.168.x.x:5000/images/...)
  const localImageMatch = url.match(/^https?:\/\/[^/]+(:5000)?\/images\/(.+)$/);
  if (localImageMatch) {
    const imagePath = localImageMatch[2];
    return `${getServerBaseUrl()}/images/${imagePath}`;
  }
  
  // Sinon retourner l'URL telle quelle
  return url;
};

// Clés de stockage AsyncStorage
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@eventhub_token',
  THEME_MODE: '@eventhub_theme_mode',
  LANGUAGE: '@eventhub_language',
  USER_DATA: '@eventhub_user_data',
} as const;

// Limites de pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Durées de cache (en millisecondes)
export const CACHE_DURATION = {
  EVENTS: 5 * 60 * 1000, // 5 minutes
  USER_PROFILE: 10 * 60 * 1000, // 10 minutes
} as const;
