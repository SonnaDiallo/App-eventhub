// mobile/src/services/ticketService.ts
import { api } from './api';

export interface VerifyTicketResponse {
  success: boolean;
  message: string;
  ticket?: {
    id: string;
    eventId: string;
    userId: string;
    participantName: string;
    participantEmail: string;
    scannedAt?: string;
    scannedBy?: string;
  };
}

export interface ScanHistoryItem {
  id: string;
  ticketId: string;
  participantName: string;
  participantEmail: string;
  scannedAt: string;
  scannedBy: string;
}

export const verifyTicket = async (
  ticketId: string,
  eventId: string
): Promise<VerifyTicketResponse> => {
  try {
    const response = await api.post(`/tickets/verify`, {
      ticketId,
      eventId,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error verifying ticket:', error);
    throw new Error(
      error.response?.data?.message || 'Erreur lors de la vérification du billet'
    );
  }
};

export const getEventScanHistory = async (
  eventId: string
): Promise<ScanHistoryItem[]> => {
  try {
    const response = await api.get(`/tickets/scan-history/${eventId}`);
    return response.data.history || [];
  } catch (error: any) {
    console.error('Error fetching scan history:', error);
    return [];
  }
};

export const getMyTickets = async () => {
  try {
    const response = await api.get('/tickets/my-tickets');
    return response.data.tickets || [];
  } catch (error: any) {
    console.error('Error fetching my tickets:', error);
    throw new Error(
      error.response?.data?.message || 'Erreur lors du chargement des billets'
    );
  }
};

export const registerForEvent = async (eventId: string) => {
  try {
    const response = await api.post(`/tickets/register/${eventId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error registering for event:', error);
    throw new Error(
      error.response?.data?.message || 'Erreur lors de l\'inscription à l\'événement'
    );
  }
};
