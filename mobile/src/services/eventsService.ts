// mobile/src/services/eventsService.ts
// Service événements utilisant Firestore directement (sans backend)

import {
  collection,
  query,
  getDocs,
  getDoc,
  doc,
  orderBy,
  deleteDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { joinEventViaFunctions, getExternalEventsViaFunctions } from './functionsService';
import { api } from './api';
import type { EventData } from '../navigation/AuthNavigator';

export interface EventsResponse {
  events: EventData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  sources?: {
    local: number;
    external: number;
  };
}

export interface ExternalEventsParams {
  location?: string;
  category?: string;
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Récupère tous les événements depuis Firestore + Ticketmaster si demandé
 */
export const getEvents = async (params?: {
  page?: number;
  limit?: number;
  category?: string;
  isFree?: boolean;
  location?: string;
  search?: string;
  includeExternal?: boolean;
  upcoming?: boolean;
}): Promise<EventsResponse> => {
  try {
    const eventsRef = collection(db, 'events');
    let q = query(eventsRef, orderBy('startDate', 'asc'));

    const snap = await getDocs(q);
    let localEvents = snap.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title || '',
        coverImage: data.coverImage || '',
        category: data.category || 'other',
        startDate: data.startDate?.toDate?.() || new Date(),
        endDate: data.endDate?.toDate?.() || new Date(),
        location: data.location || '',
        description: data.description || '',
        isFree: data.isFree ?? true,
        price: data.price || 0,
        capacity: data.capacity || 0,
        organizerName: data.organizerName || 'Organisateur',
        organizerId: data.organizerId || '',
        source: 'local' as const,
      };
    }) as EventData[];

    // Récupérer les événements externes (Ticketmaster) : backend d'abord, sinon Firebase Functions
    let externalEvents: EventData[] = [];
    if (params?.includeExternal) {
      try {
        const externalResult = await getExternalEvents({
          location: params?.location,
          category: params?.category,
          search: params?.search,
          page: params?.page,
          limit: params?.limit,
        });
        externalEvents = externalResult.events || [];
      } catch (err) {
        console.warn('Could not fetch external events:', err);
      }
    }

    // Combiner local + externe puis dédupliquer (même événement peut venir des deux sources)
    const seenKeys = new Set<string>();
    const deduped: EventData[] = [];
    for (const e of [...localEvents, ...externalEvents]) {
      const start = e.startDate instanceof Date ? e.startDate : new Date(e.startDate);
      const key = `${(e.title || '').trim().toLowerCase()}|${start.toISOString()}|${(e.location || '').trim().toLowerCase()}`;
      if (key && !seenKeys.has(key)) {
        seenKeys.add(key);
        deduped.push(e);
      }
    }
    let events = deduped;
    console.log(
      '[eventsService.getEvents] counts -> local =',
      localEvents.length,
      ', external =',
      externalEvents.length,
      ', after dedup =',
      events.length
    );

    // Filtrage côté client
    if (params?.category && params.category !== 'all') {
      events = events.filter(e => e.category === params.category);
    }
    if (params?.isFree !== undefined) {
      events = events.filter(e => e.isFree === params.isFree);
    }
    if (params?.upcoming) {
      const now = new Date();
      events = events.filter(e => new Date(e.startDate) >= now);
    }
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      events = events.filter(e => 
        e.title.toLowerCase().includes(searchLower) ||
        e.description?.toLowerCase().includes(searchLower) ||
        e.location?.toLowerCase().includes(searchLower)
      );
    }

    // Trier par date
    events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    // Pagination
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const total = events.length;
    const startIndex = (page - 1) * limit;
    const paginatedEvents = events.slice(startIndex, startIndex + limit);

    return {
      events: paginatedEvents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      sources: { local: localEvents.length, external: externalEvents.length },
    };
  } catch (error: any) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

/**
 * Récupère un événement spécifique par son ID
 */
export const getEventById = async (eventId: string): Promise<{ event: EventData }> => {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      throw new Error('Événement non trouvé');
    }

    const data = eventSnap.data();
    const event: EventData = {
      id: eventSnap.id,
      title: data.title || '',
      coverImage: data.coverImage || '',
      category: data.category || 'other',
      startDate: data.startDate?.toDate?.() || new Date(),
      endDate: data.endDate?.toDate?.() || new Date(),
      location: data.location || '',
      description: data.description || '',
      isFree: data.isFree ?? true,
      price: data.price || 0,
      capacity: data.capacity || 0,
      organizerName: data.organizerName || 'Organisateur',
      organizerId: data.organizerId || '',
      source: 'local',
    };

    return { event };
  } catch (error: any) {
    console.error('Error fetching event by id:', error);
    throw error;
  }
};

/**
 * Récupère les événements externes (Ticketmaster).
 * Utilise le backend API si disponible (TICKETMASTER_API_KEY côté serveur), sinon Firebase Functions.
 */
export const getExternalEvents = async (params?: ExternalEventsParams): Promise<EventsResponse> => {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  const mapBackendEvent = (e: any): EventData => ({
    id: e.id,
    title: e.title || '',
    coverImage: e.coverImage || '',
    category: e.category || 'other',
    startDate: e.startDate,
    endDate: e.endDate,
    location: e.location || e.venueName || '',
    description: e.description || '',
    isFree: e.isFree ?? false,
    price: e.price ?? 0,
    capacity: 0,
    organizerName: e.organizerName || 'Organisateur externe',
    organizerId: '',
    source: 'ticketmaster',
    isExternal: true,
    externalLink: e.externalUrl,
  });

  try {
    const res = await api.get<{
      events: any[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>('/events/external', {
      params: {
        location: params?.location || 'Paris,France',
        category: params?.category || 'all',
        page,
        limit,
        search: params?.search,
      },
      timeout: 15000,
    });
    const events = (res.data?.events || []).map(mapBackendEvent);
    const pagination = res.data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 };
    return {
      events,
      pagination,
      sources: { local: 0, external: events.length },
    };
  } catch (backendErr: any) {
    console.warn('Backend external events failed, trying Firebase Functions:', backendErr?.message);
    try {
      const result = await getExternalEventsViaFunctions(params);
      const events = (result.events || []).map((e: any) => ({
        id: e.id,
        title: e.title || '',
        coverImage: e.coverImage || '',
        category: e.category || 'other',
        startDate: e.startDate,
        endDate: e.endDate,
        location: e.location || '',
        description: e.description || '',
        isFree: e.isFree ?? false,
        price: e.price ?? 0,
        capacity: 0,
        organizerName: e.organizerName || 'Organisateur externe',
        organizerId: '',
        source: 'ticketmaster',
        isExternal: true,
        externalLink: e.externalUrl,
      })) as EventData[];
      return {
        events,
        pagination: result.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
        sources: { local: 0, external: events.length },
      };
    } catch (fnErr: any) {
      console.error('Error fetching external events:', fnErr);
      return {
        events: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        sources: { local: 0, external: 0 },
      };
    }
  }
};

/**
 * Récupère les participants d'un événement depuis Firestore
 */
export interface EventParticipantFromAPI {
  id: string;
  status: string;
  user: {
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  } | null;
  createdAt: string;
}

export interface EventParticipantsResponse {
  counts: { confirmed: number; pending_payment: number; total: number };
  participants: EventParticipantFromAPI[];
}

export const getEventParticipants = async (eventId: string): Promise<EventParticipantsResponse> => {
  try {
    const participantsRef = collection(db, 'events', eventId, 'participants');
    const snap = await getDocs(participantsRef);
    
    const participants: EventParticipantFromAPI[] = [];
    let confirmed = 0;
    let pending = 0;

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      
      // Récupérer les infos utilisateur
      let user = null;
      if (data.userId) {
        const userSnap = await getDoc(doc(db, 'users', data.userId));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          user = {
            id: data.userId,
            name: userData.name || [userData.firstName, userData.lastName].filter(Boolean).join(' '),
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
          };
        }
      }

      participants.push({
        id: docSnap.id,
        status: data.status || 'confirmed',
        user,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      });

      if (data.status === 'confirmed') confirmed++;
      else if (data.status === 'pending_payment') pending++;
    }

    return {
      counts: { confirmed, pending_payment: pending, total: participants.length },
      participants,
    };
  } catch (error: any) {
    console.error('Error fetching participants:', error);
    return { counts: { confirmed: 0, pending_payment: 0, total: 0 }, participants: [] };
  }
};

export interface JoinEventResponse {
  participation: { eventId: string; userId: string; status: string; id: string; ticketCode: string };
}

/**
 * Rejoindre un événement via Cloud Function
 */
export const joinEvent = async (eventId: string): Promise<JoinEventResponse> => {
  const result = await joinEventViaFunctions(eventId);
  return {
    participation: {
      eventId,
      userId: auth.currentUser?.uid || '',
      status: 'confirmed',
      id: result.ticket.id,
      ticketCode: result.ticket.code,
    },
  };
};

/**
 * Annuler une participation à un événement
 */
export const leaveEvent = async (eventId: string): Promise<void> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Non authentifié');

  // Supprimer la participation
  const participantRef = doc(db, 'events', eventId, 'participants', userId);
  await deleteDoc(participantRef);

  // Supprimer le ticket associé
  const ticketsRef = collection(db, 'tickets');
  const q = query(ticketsRef, where('eventId', '==', eventId), where('userId', '==', userId));
  const snap = await getDocs(q);
  
  for (const ticketDoc of snap.docs) {
    await deleteDoc(ticketDoc.ref);
  }
};

/**
 * Récupère les événements de l'organisateur connecté
 */
export const getMyEvents = async (params?: {
  page?: number;
  limit?: number;
}): Promise<EventsResponse> => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Non authentifié');

    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('organizerId', '==', userId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    const events = snap.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title || '',
        coverImage: data.coverImage || '',
        category: data.category || 'other',
        startDate: data.startDate?.toDate?.() || new Date(),
        endDate: data.endDate?.toDate?.() || new Date(),
        location: data.location || '',
        description: data.description || '',
        isFree: data.isFree ?? true,
        price: data.price || 0,
        capacity: data.capacity || 0,
        organizerName: data.organizerName || 'Organisateur',
        organizerId: data.organizerId || '',
        source: 'local' as const,
      };
    }) as EventData[];

    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const total = events.length;
    const startIndex = (page - 1) * limit;
    const paginatedEvents = events.slice(startIndex, startIndex + limit);

    return {
      events: paginatedEvents,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  } catch (error: any) {
    console.error('Error fetching my events:', error);
    throw error;
  }
};
