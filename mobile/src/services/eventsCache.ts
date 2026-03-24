/**
 * @file Cache local des événements avec expiration automatique.
 *
 * Stocke la liste des événements dans AsyncStorage avec un TTL de
 * 5 minutes pour réduire les appels réseau et offrir un affichage
 * instantané au lancement de l'application. Le cache est invalidé
 * automatiquement après expiration du timestamp.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@eventhub_events_cache';
const CACHE_TIMESTAMP_KEY = '@eventhub_events_cache_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface CachedEvent {
  id: string;
  title: string;
  coverImage: string;
  date?: string;
  time?: string;
  location: string;
  description: string;
  price?: number;
  isFree: boolean;
  category?: string;
  organizerId?: string;
  organizerName?: string;
  participantsCount?: number;
  capacity?: number;
  isExternal?: boolean;
  externalLink?: string;
}

/**
 * Gestionnaire de cache pour les événements.
 * Fournit des méthodes statiques pour sauvegarder, lire, invalider
 * et vérifier la validité du cache.
 */
export class EventsCache {
  /** Sauvegarde les événements et enregistre le timestamp actuel. */
  static async saveEvents(events: CachedEvent[]): Promise<void> {
    try {
      const timestamp = Date.now();
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(events));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString());
      console.log('✅ Événements sauvegardés dans le cache');
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde du cache:', error);
    }
  }

  /** Retourne les événements en cache s'ils sont encore valides, sinon `null`. */
  static async getEvents(): Promise<CachedEvent[] | null> {
    try {
      const timestampStr = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (!timestampStr) {
        console.log('⏰ Pas de timestamp de cache');
        return null;
      }

      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();
      const age = Math.floor((now - timestamp) / 1000);

      if (now - timestamp > CACHE_DURATION) {
        console.log(`⏰ Cache expiré (${age} secondes)`);
        await this.clearCache();
        return null;
      }

      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (!cachedData) {
        console.log('📭 Cache vide');
        return null;
      }

      const events = JSON.parse(cachedData);
      console.log(`✅ ${events.length} événements chargés depuis le cache (${age}s)`);
      return events;
    } catch (error) {
      console.error('❌ Erreur lors de la lecture du cache:', error);
      return null;
    }
  }

  /** Supprime manuellement le cache et son timestamp. */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
      console.log('🗑️ Cache supprimé');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du cache:', error);
    }
  }

  /** Vérifie si le cache est encore valide (non expiré). */
  static async isCacheValid(): Promise<boolean> {
    try {
      const timestampStr = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (!timestampStr) return false;

      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();
      return now - timestamp <= CACHE_DURATION;
    } catch (error) {
      return false;
    }
  }
}
