import { useState, useEffect } from 'react';
import { Timestamp, collection, onSnapshot, orderBy, query as fsQuery, QueryDocumentSnapshot, QuerySnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getEvents } from '../services/eventsService';
import type { EventData } from '../navigation/AuthNavigator';
import { formatDate, formatTime, getPlaceholderImageForEvent, ensureUniqueImages } from '../utils/eventHelpers';

export const useEvents = (selectedCategory: string | null, searchQuery: string) => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventData[]>([]);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let isMounted = true;

    const loadAllEvents = async () => {
      setLoading(true);
      const allEvents: (EventData & { _startDate?: Date })[] = [];

      // 1. Charger depuis l'API (MongoDB + Ticketmaster)
      try {
        const response = await getEvents({
          page: 1,
          limit: 50,
          category: selectedCategory || undefined,
          search: searchQuery || undefined,
          includeExternal: true,
          upcoming: true,
        });

        const apiEvents = (response.events || []).map((event: any) => {
          const startDate = event.startDate ? new Date(event.startDate) : undefined;
          const endDate = event.endDate ? new Date(event.endDate) : undefined;
          return {
            id: event.id,
            title: event.title || 'Sans titre',
            coverImage: event.coverImage || getPlaceholderImageForEvent(event.id, event.category ?? null),
            date: formatDate(startDate),
            time: formatTime(startDate, endDate),
            location: event.location || '',
            address: event.location || '',
            organizer: event.organizerName || 'Organisateur',
            description: event.description || '',
            price: event.price ?? 0,
            isFree: event.isFree ?? false,
            category: event.category || null,
            _startDate: startDate,
            source: event.source === 'ticketmaster' ? 'external' : 'local',
          } as EventData & { _startDate?: Date; source?: string };
        });

        const seenIds = new Set<string>();
        apiEvents.forEach((e: EventData & { _startDate?: Date }) => {
          if (!seenIds.has(e.id)) {
            seenIds.add(e.id);
            allEvents.push(e);
          }
        });
      } catch (error: any) {
        console.warn('Backend injoignable – affichage des événements Firestore uniquement.', error?.message);
      }

      // 2. Charger depuis Firestore (événements locaux)
      const q = fsQuery(collection(db, 'events'), orderBy('createdAt', 'desc'));
      
      unsub = onSnapshot(
        q,
        (snap: QuerySnapshot) => {
          if (!isMounted) return;

          const now = new Date();
          const localEvents = snap.docs
            .filter((d: QueryDocumentSnapshot) => {
              const data: any = d.data();
              if (data.source === 'paris_opendata' || 
                  data.organizerName?.includes('Ville de Paris - Que faire à Paris')) {
                return false;
              }
              if (data.startDate) {
                const startDate = data.startDate instanceof Timestamp 
                  ? data.startDate.toDate() 
                  : new Date(data.startDate);
                if (startDate < now) {
                  return false;
                }
              }
              return true;
            })
            .map((d: QueryDocumentSnapshot) => {
              const data: any = d.data();
              const start: Date | undefined = data.startDate instanceof Timestamp ? data.startDate.toDate() : undefined;
              const end: Date | undefined = data.endDate instanceof Timestamp ? data.endDate.toDate() : undefined;

              const isFree = !!data.isFree;
              const price = typeof data.price === 'number' ? data.price : 0;

              return {
                id: d.id,
                title: data.title || 'Sans titre',
                coverImage: data.coverImage || getPlaceholderImageForEvent(d.id, data.category ?? null),
                date: formatDate(start),
                time: formatTime(start, end),
                location: data.location || '',
                address: data.location || '',
                organizer: data.organizerName || 'Organisateur',
                description: data.description || '',
                price,
                isFree,
                category: data.category || null,
                _startDate: start,
                source: 'local',
              } as EventData & { _startDate?: Date; source?: string };
            });

          // Combiner et dédupliquer
          const normalizeLocation = (loc: string) =>
            (loc || '').trim().toLowerCase().replace(/\s*,\s*/, ', ').slice(0, 80);
          const normalizeOrganizer = (o: string) =>
            (o || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 60);
          const normalizeImageUrl = (url: string) => {
            const u = (url || '').trim();
            if (!u) return '';
            try {
              const withoutQuery = u.split('?')[0];
              return withoutQuery.toLowerCase().slice(0, 200);
            } catch {
              return u.toLowerCase().slice(0, 200);
            }
          };
          const dateKey = (e: EventData & { _startDate?: Date }) =>
            e._startDate
              ? e._startDate.toISOString().slice(0, 16)
              : (e.date || '').trim().toLowerCase().slice(0, 30);
          const signature = (e: EventData & { _startDate?: Date }) => {
            const title = (e.title || '').trim().toLowerCase().slice(0, 120);
            const location = normalizeLocation(e.location || '');
            const image = normalizeImageUrl(e.coverImage || '');
            return `${title}|${dateKey(e)}|${location}|${image}`;
          };
          const venueSignature = (e: EventData & { _startDate?: Date }) => {
            const loc = normalizeLocation(e.location || '');
            const org = normalizeOrganizer(e.organizer || '');
            return `${loc}|${dateKey(e)}|${org}`;
          };
          const seenSignatures = new Set<string>();
          const seenVenueSignatures = new Set<string>();
          const seenIds = new Set<string>();
          const combinedEvents: (EventData & { _startDate?: Date; source?: string })[] = [];
          const isDuplicate = (e: EventData & { _startDate?: Date; source?: string }) => {
            const id = (e.id || '').toString();
            if (id && seenIds.has(id)) return true;
            if (seenSignatures.has(signature(e))) return true;
            if (seenVenueSignatures.has(venueSignature(e))) return true;
            return false;
          };
          const addEvent = (e: EventData & { _startDate?: Date; source?: string }) => {
            const id = (e.id || '').toString();
            if (id) seenIds.add(id);
            seenSignatures.add(signature(e));
            seenVenueSignatures.add(venueSignature(e));
            combinedEvents.push(e);
          };
          
          for (const e of localEvents) {
            if (isDuplicate(e)) continue;
            addEvent(e);
          }
          for (const e of allEvents) {
            if (isDuplicate(e)) continue;
            addEvent(e);
          }
          
          setEvents(ensureUniqueImages(combinedEvents));
          setLoading(false);
        },
        (err: any) => {
          if (isMounted) {
            console.error('Firestore events error', err?.message);
            setEvents(ensureUniqueImages(allEvents));
            setLoading(false);
          }
        }
      );
    };

    loadAllEvents();

    return () => {
      isMounted = false;
      if (unsub) {
        unsub();
      }
    };
  }, [selectedCategory, searchQuery]);

  return { events, loading };
};
