/**
 * @file Service de gestion des tickets / billets d'événements.
 *
 * Permet la vérification de tickets par QR code (scan organisateur),
 * la consultation de l'historique des scans d'un événement, la
 * récupération des billets de l'utilisateur connecté et l'inscription
 * à un événement (génération d'un nouveau ticket).
 */

import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { 
  getMyTicketsViaFunctions, 
  verifyTicketViaFunctions, 
  joinEventViaFunctions 
} from './functionsService';

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

/** Vérifie un ticket par son code et le marque comme utilisé (check-in). */
export const verifyTicket = async (
  ticketCode: string,
  eventId?: string
): Promise<VerifyTicketResponse> => {
  try {
    const result = await verifyTicketViaFunctions(ticketCode, eventId, true);
    return {
      success: result.valid,
      message: result.message || (result.valid ? 'Ticket valide' : 'Ticket invalide'),
      ticket: result.ticket,
    };
  } catch (error: any) {
    console.error('Error verifying ticket:', error);
    throw new Error(error.message || 'Erreur lors de la vérification du billet');
  }
};

/** Récupère l'historique des tickets scannés pour un événement donné. */
export const getEventScanHistory = async (
  eventId: string
): Promise<ScanHistoryItem[]> => {
  try {
    // Récupérer directement depuis Firestore les tickets scannés pour cet événement
    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef, 
      where('eventId', '==', eventId),
      where('checkedIn', '==', true),
      orderBy('checkedInAt', 'desc')
    );
    const snap = await getDocs(q);
    
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ticketId: doc.id,
        participantName: data.participantName || '',
        participantEmail: data.participantEmail || '',
        scannedAt: data.checkedInAt?.toDate?.()?.toISOString() || '',
        scannedBy: data.scannedBy || '',
      };
    });
  } catch (error: any) {
    console.error('Error fetching scan history:', error);
    return [];
  }
};

/** Récupère tous les billets de l'utilisateur connecté via Cloud Function. */
export const getMyTickets = async () => {
  try {
    const result = await getMyTicketsViaFunctions();
    return result.tickets || [];
  } catch (error: any) {
    console.error('Error fetching my tickets:', error);
    throw new Error(error.message || 'Erreur lors du chargement des billets');
  }
};

/** Inscrit l'utilisateur à un événement et génère son billet. */
export const registerForEvent = async (eventId: string) => {
  try {
    const result = await joinEventViaFunctions(eventId);
    return result;
  } catch (error: any) {
    console.error('Error registering for event:', error);
    throw new Error(error.message || 'Erreur lors de l\'inscription à l\'événement');
  }
};
