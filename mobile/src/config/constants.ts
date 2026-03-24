/**
 * constants.ts - Configuration globale de l'application.
 * 
 * Centralise :
 * - L'URL de l'API backend (avec résolution automatique selon la plateforme)
 * - La normalisation des URLs d'images (gestion des changements d'IP en dev)
 * - Les clés de stockage AsyncStorage
 * - Les paramètres de pagination et de cache
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

declare const __DEV__: boolean;

/**
 * Configuration de connexion à l'API backend.
 * L'URL est d'abord lue depuis .env (API_URL), sinon utilise LOCAL_IP.
 */
export const API_CONFIG = {
  LOCAL_IP: '10.5.21.22',
  PORT: 5000,
  /** Timeout par défaut pour les requêtes API (15s) */
  TIMEOUT: 15000,
  /** Timeout étendu pour les appels impliquant des APIs externes comme Stripe (60s) */
  TIMEOUT_WITH_EXTERNAL: 60000,
};

/**
 * Résout l'URL de base de l'API selon la plateforme et l'environnement :
 * - Web : localhost (même machine que le serveur de dev)
 * - .env configuré : utilise API_URL depuis app.config.js → Constants.expoConfig.extra
 * - iOS dev : IP locale directe
 * - Android dev : 10.0.2.2 (alias localhost de l'émulateur Android)
 */
export const getApiBaseUrl = (): string => {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const publicApiUrl = extra.apiUrl as string | undefined;

  // Web (navigateur) : même machine que le dev → localhost pour que l’API soit joignable des deux côtés
  if (Platform.OS === 'web') {
    const webUrl = `http://localhost:${API_CONFIG.PORT}/api`;
    console.log('🌐 Web: using API URL', webUrl);
    return webUrl;
  }

  if (publicApiUrl) {
    console.log('🌐 Using API URL from app config (.env):', publicApiUrl);
    return publicApiUrl;
  }

  if (__DEV__) {
    if (Platform.OS === 'ios') {
      return `http://${API_CONFIG.LOCAL_IP}:${API_CONFIG.PORT}/api`;
    }
    if (Platform.OS === 'android') {
      return `http://10.0.2.2:${API_CONFIG.PORT}/api`;
    }
  }

  return `http://${API_CONFIG.LOCAL_IP}:${API_CONFIG.PORT}/api`;
};

/** Retourne l'URL racine du serveur (sans /api) pour accéder aux fichiers statiques (images, etc.) */
export const getServerBaseUrl = (): string => {
  const apiUrl = getApiBaseUrl();
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

/** Clés utilisées dans AsyncStorage pour la persistance locale */
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@eventhub_token',
  THEME_MODE: '@eventhub_theme_mode',
  LANGUAGE: '@eventhub_language',
  USER_DATA: '@eventhub_user_data',
} as const;

/** Limites de pagination pour les listes d'événements et autres */
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/** Durées de cache en millisecondes pour limiter les appels API répétés */
export const CACHE_DURATION = {
  EVENTS: 5 * 60 * 1000,
  USER_PROFILE: 10 * 60 * 1000,
} as const;
