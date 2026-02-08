import { api } from './api';

export interface ExternalRegistrationData {
  externalEventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
}

export interface ExternalRegistration {
  id: string;
  userId: string;
  externalEventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  status: 'registered' | 'cancelled';
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalParticipant {
  id: string;
  user: {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  status: string;
  registeredAt: string;
}

/**
 * S'inscrire à un événement externe (Ticketmaster)
 */
export const registerForExternalEvent = async (data: ExternalRegistrationData): Promise<{
  message: string;
  registration: ExternalRegistration;
}> => {
  const response = await api.post('/external-events/register', data);
  return response.data;
};

/**
 * Annuler l'inscription à un événement externe
 */
export const cancelExternalEventRegistration = async (externalEventId: string): Promise<{
  message: string;
  registration: ExternalRegistration;
}> => {
  const response = await api.delete(`/external-events/${externalEventId}/register`);
  return response.data;
};

/**
 * Obtenir les participants d'un événement externe
 */
export const getExternalEventParticipants = async (externalEventId: string): Promise<{
  participants: ExternalParticipant[];
  total: number;
}> => {
  const response = await api.get(`/external-events/${externalEventId}/participants`);
  return response.data;
};

/**
 * Obtenir mes inscriptions aux événements externes
 */
export const getMyExternalRegistrations = async (): Promise<{
  registrations: ExternalRegistration[];
  total: number;
}> => {
  const response = await api.get('/external-events/my-registrations');
  return response.data;
};

/**
 * Vérifier si je suis inscrit à un événement externe
 */
export const checkExternalEventRegistration = async (externalEventId: string): Promise<{
  isRegistered: boolean;
  registration?: ExternalRegistration;
}> => {
  const response = await api.get(`/external-events/${externalEventId}/check-registration`);
  return response.data;
};
