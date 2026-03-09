import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from './firebase';

const functions = getFunctions(firebaseApp, 'us-central1');

// ==================== EVENTS ====================

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

export async function joinEventViaFunctions(eventId: string) {
  const fn = httpsCallable(functions, 'joinEvent');
  const result = await fn({ eventId });
  return result.data as { success: boolean; ticket: { id: string; code: string }; message: string };
}

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

export async function getMyTicketsViaFunctions() {
  const fn = httpsCallable(functions, 'getMyTickets');
  const result = await fn({});
  return result.data as { tickets: any[] };
}

export async function verifyTicketViaFunctions(ticketCode: string, eventId?: string, markAsUsed?: boolean) {
  const fn = httpsCallable(functions, 'verifyTicket');
  const result = await fn({ ticketCode, eventId, markAsUsed });
  return result.data as { valid: boolean; ticket: any; alreadyUsed?: boolean; message?: string };
}

// ==================== REVIEWS ====================

export async function createReviewViaFunctions(eventId: string, rating: number, comment: string) {
  const fn = httpsCallable(functions, 'createReview');
  const result = await fn({ eventId, rating, comment });
  return result.data as { success: boolean; reviewId: string; message: string };
}

export async function getEventReviewsViaFunctions(eventId: string, page = 1, limit = 10) {
  const fn = httpsCallable(functions, 'getEventReviews');
  const result = await fn({ eventId, page, limit });
  return result.data as { reviews: any[]; stats: { total: number; averageRating: number }; pagination: any };
}

export async function deleteReviewViaFunctions(reviewId: string) {
  const fn = httpsCallable(functions, 'deleteReview');
  const result = await fn({ reviewId });
  return result.data as { success: boolean; message: string };
}

// ==================== FRIENDS ====================

export async function sendFriendRequestViaFunctions(toUserId: string) {
  const fn = httpsCallable(functions, 'sendFriendRequest');
  const result = await fn({ toUserId });
  return result.data as { success: boolean; message: string };
}

export async function getFriendRequestsViaFunctions() {
  const fn = httpsCallable(functions, 'getFriendRequests');
  const result = await fn({});
  return result.data as { requests: any[] };
}

export async function acceptFriendRequestViaFunctions(requestId: string) {
  const fn = httpsCallable(functions, 'acceptFriendRequest');
  const result = await fn({ requestId });
  return result.data as { success: boolean; message: string };
}

export async function rejectFriendRequestViaFunctions(requestId: string) {
  const fn = httpsCallable(functions, 'rejectFriendRequest');
  const result = await fn({ requestId });
  return result.data as { success: boolean; message: string };
}

export async function getFriendsViaFunctions() {
  const fn = httpsCallable(functions, 'getFriends');
  const result = await fn({});
  return result.data as { friends: any[] };
}

// ==================== PAYMENTS ====================

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

export async function confirmPaymentViaFunctions(paymentIntentId: string, ticketId?: string) {
  const fn = httpsCallable(functions, 'confirmPayment');
  const result = await fn({ paymentIntentId, ticketId });
  return result.data as { message: string; ticketId: string; status: string };
}

export async function getMyPaymentsViaFunctions() {
  const fn = httpsCallable(functions, 'getMyPayments');
  const result = await fn({});
  return result.data as { payments: any[] };
}
