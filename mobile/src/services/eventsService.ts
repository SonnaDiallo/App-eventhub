// mobile/src/services/eventsService.ts
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
 * Récupère tous les événements depuis l'API backend
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
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.isFree !== undefined) queryParams.append('isFree', params.isFree.toString());
    if (params?.location) queryParams.append('location', params.location);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.includeExternal) queryParams.append('includeExternal', 'true');
    if (params?.upcoming) queryParams.append('upcoming', 'true');

    const response = await api.get<EventsResponse>(`/events?${queryParams.toString()}`);
    return response.data;
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
    const response = await api.get<{ event: EventData }>(`/events/${eventId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching event by id:', error);
    throw error;
  }
};

/**
 * Récupère les événements externes depuis Ticketmaster (sans les sauvegarder)
 */
export const getExternalEvents = async (params?: ExternalEventsParams): Promise<EventsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.location) queryParams.append('location', params.location);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const response = await api.get<EventsResponse>(`/events/external?${queryParams.toString()}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching external events:', error);
    throw error;
  }
};

/**
 * Récupère les participants d'un événement depuis le backend (MongoDB)
 * Les participants sont ceux qui ont rejoint l'événement via l'API (EventParticipation)
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
  const response = await api.get<EventParticipantsResponse>(`/events/${eventId}/participants`);
  return response.data;
};

/**
 * Rejoindre un événement (créer la participation dans MongoDB)
 */
export const joinEvent = async (eventId: string): Promise<void> => {
  await api.post(`/events/${eventId}/join`);
};

/**
 * Annuler une participation à un événement (MongoDB)
 * À appeler si l'événement provient du backend (id MongoDB 24 caractères)
 */
export const leaveEvent = async (eventId: string): Promise<void> => {
  await api.post(`/events/${eventId}/leave`);
};

/**
 * Récupère les événements de l'organisateur connecté
 */
export const getMyEvents = async (params?: {
  page?: number;
  limit?: number;
}): Promise<EventsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get<EventsResponse>(`/events/organizer/my?${queryParams.toString()}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching my events:', error);
    throw error;
  }
};
