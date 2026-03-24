/**
 * useEvents.ts - Hook personnalisé pour charger et gérer la liste des événements.
 * 
 * Stratégie de chargement avec cache offline-first :
 * 1. Vérifie d'abord le cache AsyncStorage (si pas de filtre catégorie/upcoming)
 * 2. Sinon, appelle l'API backend
 * 3. En cas d'erreur réseau, se rabat sur le cache
 * 
 * Les événements sont dédupliqués par ID, normalisés (images, dates),
 * et filtrés pour garantir qu'ils ont une image de couverture.
 */

import { useState, useEffect, useRef } from 'react';
import { getEvents } from '../services/eventsService';
import { EventsCache } from '../services/eventsCache';
import { normalizeImageUrl } from '../config/constants';
import { ensureUniqueImages } from '../utils/eventHelpers';

/** Structure d'un événement côté client */
export interface Event {
  id: string;
  title: string;
  description: string;
  date?: string;
  time?: string;
  startDate?: string;
  endDate?: string;
  location: string;
  address?: string;
  coverImage: string;
  price?: number;
  isFree: boolean;
  category?: string;
  organizer?: string;
  organizerId?: string;
  organizerName?: string;
  capacity?: number;
  isExternal?: boolean;
  externalLink?: string;
  createdAt?: any;
  participantsCount?: number;
}

interface UseEventsOptions {
  limit?: number;
  category?: string;
  includeExternal?: boolean;
  upcoming?: boolean;
}

export const useEvents = (options?: UseEventsOptions) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Compteur pour ignorer les réponses de requêtes obsolètes (race condition) */
  const requestIdRef = useRef(0);

  /**
   * Charge les événements depuis le cache ou l'API.
   * @param forceRefresh - Si true, ignore le cache et appelle l'API directement
   */
  const loadEvents = async (forceRefresh: boolean = false) => {
    const currentId = ++requestIdRef.current;
    try {
      setLoading(true);
      setError(null);

      // Pas de cache si on filtre par catégorie ou si on veut uniquement les événements à venir (données fraîches)
      const USE_CACHE = !options?.category && !options?.upcoming;
      
      if (!forceRefresh && USE_CACHE) {
        const cachedEvents = await EventsCache.getEvents();
        if (cachedEvents && cachedEvents.length > 0) {
          const byId = new Map<string, Event>();
          cachedEvents.forEach((e) => {
            if (e.id && !byId.has(e.id)) byId.set(e.id, e);
          });
          let filteredEvents = Array.from(byId.values());
          filteredEvents = filteredEvents.filter((e) => (e.coverImage || '').trim().length > 0);
          filteredEvents = ensureUniqueImages(filteredEvents);
          if (options?.limit) {
            filteredEvents = filteredEvents.slice(0, options.limit);
          }
          console.log('📦 Chargement depuis le cache:', filteredEvents.length, 'événements');
          if (currentId === requestIdRef.current) {
            setEvents(filteredEvents);
          }
          setLoading(false);
          return;
        }
      }

      console.log('🌐 Chargement depuis l\'API backend...');
      
      const response = await getEvents({
        limit: options?.limit || 100,
        category: options?.category,
        includeExternal: options?.includeExternal,
        upcoming: options?.upcoming, // à venir uniquement (pas d’anciens événements type janvier)
      });

      // Dédupliquer les événements par ID uniquement (évite doublons API / multi-sources)
      const byId = new Map<string, any>();
      response.events.forEach((event) => {
        const id = event?.id;
        if (id && !byId.has(id)) byId.set(id, event);
      });

      let eventsList: Event[] = Array.from(byId.values()).map(event => {
        // Convertir startDate en date et time pour l'affichage
        let date = '';
        let time = '';
        
        if (event.startDate) {
          const startDate = new Date(event.startDate);
          if (!isNaN(startDate.getTime())) {
            date = startDate.toLocaleDateString('fr-FR', { 
              weekday: 'short', 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric' 
            });
            time = startDate.toLocaleTimeString('fr-FR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
          }
        }

        return {
          id: event.id,
          title: event.title,
          description: event.description || '',
          date: date,
          time: time,
          startDate: event.startDate,
          endDate: event.endDate,
          location: event.location || '',
          coverImage: normalizeImageUrl(event.coverImage),
          price: event.price,
          isFree: event.isFree ?? true,
          category: event.category || undefined,
          organizerName: event.organizerName,
          organizerId: event.organizerId,
          capacity: event.capacity,
          participantsCount: event.participantsCount,
          createdAt: event.createdAt,
        };
      });

      eventsList = eventsList.filter((e) => (e.coverImage || '').trim().length > 0);
      eventsList = ensureUniqueImages(eventsList);

      if (!options?.category) {
        const toCache = eventsList.slice(0, 200);
        await EventsCache.saveEvents(toCache);
      }
      if (options?.limit) {
        eventsList = eventsList.slice(0, options.limit);
      }
      if (currentId === requestIdRef.current) {
        setEvents(eventsList);
      }
      console.log('✅ Événements chargés depuis l\'API:', eventsList.length);
    } catch (err: any) {
      console.error('Error loading events:', err);
      setError(err.message || 'Erreur lors du chargement des événements');
      
      const cachedEvents = await EventsCache.getEvents();
      if (cachedEvents && cachedEvents.length > 0) {
        console.log('⚠️ Erreur réseau, utilisation du cache');
        const byId = new Map<string, Event>();
        cachedEvents.forEach((e) => {
          if (e.id && !byId.has(e.id)) byId.set(e.id, e);
        });
        let filteredEvents = Array.from(byId.values());
        if (options?.upcoming) {
          const now = new Date();
          filteredEvents = filteredEvents.filter((e) => {
            const d = e.startDate ? new Date(e.startDate) : null;
            return d && d >= now;
          });
        }
        if (options?.category) {
          const catLower = options.category.toLowerCase();
          filteredEvents = filteredEvents.filter(
            (e) => (e.category || '').toLowerCase() === catLower
          );
        }
        if (options?.limit) {
          filteredEvents = filteredEvents.slice(0, options.limit);
        }
        filteredEvents = filteredEvents.filter((e) => (e.coverImage || '').trim().length > 0);
        filteredEvents = ensureUniqueImages(filteredEvents);
        if (currentId === requestIdRef.current) {
          setEvents(filteredEvents);
          setError(null);
        }
      }
    } finally {
      if (currentId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadEvents();
  }, [JSON.stringify(options)]);

  return {
    events,
    loading,
    error,
    refetch: () => loadEvents(true),
    loadFromCache: () => loadEvents(false),
  };
};
