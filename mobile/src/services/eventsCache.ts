// mobile/src/services/eventsCache.ts
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

export class EventsCache {
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

  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
      console.log('🗑️ Cache supprimé');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du cache:', error);
    }
  }

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
