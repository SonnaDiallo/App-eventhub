/**
 * @file Proxy vers les Cloud Functions Firebase (région us-central1).
 *
 * Regroupe tous les appels `httpsCallable` de l'application : création
 * d'événements, gestion des tickets, avis, amis et paiements Stripe.
 * Chaque fonction retourne les données typées renvoyées par le backend
 * serverless, offrant une interface unifiée au reste du code client.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from './firebase';

const functions = getFunctions(firebaseApp, 'us-central1');

/** Crée un nouvel événement via la Cloud Function `createEvent`. */
export async function createEventViaFunctions(eventData: {
  title: string;
  coverImage?: string | null;
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
  isFree?: boolean;
  price?: number;
  capacity?: number;
  category?: string;
}) {
  const fn = httpsCallable(functions, 'createEvent');
  const result = await fn(eventData);
  return result.data as { success: boolean; eventId: string; event: any };
}

/** Inscrit l'utilisateur courant à un événement et génère son ticket. */
export async function joinEventViaFunctions(eventId: string) {
  const fn = httpsCallable(functions, 'joinEvent');
  const result = await fn({ eventId });
  return result.data as { success: boolean; ticket: { id: string; code: string }; message: string };
}

/** Récupère les événements Ticketmaster via Cloud Function (fallback si le backend REST est indisponible). */
export async function getExternalEventsViaFunctions(params?: {
  location?: string;
  category?: string;
  page?: number;
  limit?: number;
  search?: string;
}) {
  try {
    const fn = httpsCallable(functions, 'getExternalEvents');
    const result = await fn(params || {});
    return result.data as { events: any[]; pagination: { page: number; limit: number; total: number; pages: number } };
  } catch (error: any) {
    // Si erreur d'auth, retourner une liste vide plutôt que bloquer
    console.warn('External events fetch failed:', error?.message);
    return { events: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
  }
}

// ==================== TICKETS ====================

/** Récupère tous les tickets de l'utilisateur connecté. */
export async function getMyTicketsViaFunctions() {
  const fn = httpsCallable(functions, 'getMyTickets');
  const result = await fn({});
  return result.data as { tickets: any[] };
}

/** Vérifie la validité d'un ticket par son code, et peut le marquer comme utilisé (scan). */
export async function verifyTicketViaFunctions(ticketCode: string, eventId?: string, markAsUsed?: boolean) {
  const fn = httpsCallable(functions, 'verifyTicket');
  const result = await fn({ ticketCode, eventId, markAsUsed });
  return result.data as { valid: boolean; ticket: any; alreadyUsed?: boolean; message?: string };
}

// ==================== REVIEWS ====================

/** Publie un avis (note + commentaire) pour un événement donné. */
export async function createReviewViaFunctions(eventId: string, rating: number, comment: string) {
  const fn = httpsCallable(functions, 'createReview');
  const result = await fn({ eventId, rating, comment });
  return result.data as { success: boolean; reviewId: string; message: string };
}

/** Récupère les avis paginés d'un événement avec les statistiques (moyenne, total). */
export async function getEventReviewsViaFunctions(eventId: string, page = 1, limit = 10) {
  const fn = httpsCallable(functions, 'getEventReviews');
  const result = await fn({ eventId, page, limit });
  return result.data as { reviews: any[]; stats: { total: number; averageRating: number }; pagination: any };
}

/** Supprime un avis par son identifiant. */
export async function deleteReviewViaFunctions(reviewId: string) {
  const fn = httpsCallable(functions, 'deleteReview');
  const result = await fn({ reviewId });
  return result.data as { success: boolean; message: string };
}

// ==================== FRIENDS ====================

/** Envoie une demande d'ami à l'utilisateur identifié par `toUserId`. */
export async function sendFriendRequestViaFunctions(toUserId: string) {
  const fn = httpsCallable(functions, 'sendFriendRequest');
  const result = await fn({ toUserId });
  return result.data as { success: boolean; message: string };
}

/** Récupère les demandes d'ami reçues par l'utilisateur courant. */
export async function getFriendRequestsViaFunctions() {
  const fn = httpsCallable(functions, 'getFriendRequests');
  const result = await fn({});
  return result.data as { requests: any[] };
}

/** Accepte une demande d'ami identifiée par `requestId`. */
export async function acceptFriendRequestViaFunctions(requestId: string) {
  const fn = httpsCallable(functions, 'acceptFriendRequest');
  const result = await fn({ requestId });
  return result.data as { success: boolean; message: string };
}

/** Refuse une demande d'ami. */
export async function rejectFriendRequestViaFunctions(requestId: string) {
  const fn = httpsCallable(functions, 'rejectFriendRequest');
  const result = await fn({ requestId });
  return result.data as { success: boolean; message: string };
}

/** Récupère la liste d'amis de l'utilisateur connecté. */
export async function getFriendsViaFunctions() {
  const fn = httpsCallable(functions, 'getFriends');
  const result = await fn({});
  return result.data as { friends: any[] };
}

// ==================== PAYMENTS ====================

/** Crée un PaymentIntent Stripe pour un événement payant (montant en centimes). */
export async function createPaymentIntentViaFunctions(eventId: string, amount: number, currency = 'eur') {
  const fn = httpsCallable(functions, 'createPaymentIntent');
  const result = await fn({ eventId, amount, currency });
  return result.data as { 
    paymentIntentId: string; 
    clientSecret: string; 
    amount: number; 
    currency: string; 
  };
}

/** Confirme un paiement côté serveur et associe le ticket si fourni. */
export async function confirmPaymentViaFunctions(paymentIntentId: string, ticketId?: string) {
  const fn = httpsCallable(functions, 'confirmPayment');
  const result = await fn({ paymentIntentId, ticketId });
  return result.data as { message: string; ticketId: string; status: string };
}

/** Récupère l'historique des paiements de l'utilisateur connecté. */
export async function getMyPaymentsViaFunctions() {
  const fn = httpsCallable(functions, 'getMyPayments');
  const result = await fn({});
  return result.data as { payments: any[] };
}
