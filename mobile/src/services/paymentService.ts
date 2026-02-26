import { api } from './api';

export interface CreatePaymentIntentResponse {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
}

export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  ticketId: string;
}

export interface PaymentStatusResponse {
  paymentIntentId: string;
  status: string;
  amount: number;
  currency: string;
  eventId: string;
  ticketId?: string;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  eventId: string;
  eventTitle: string;
  ticketId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Créer un PaymentIntent pour un événement
 */
export const createPaymentIntent = async (
  eventId: string,
  amount: number,
  currency: string = 'eur'
): Promise<CreatePaymentIntentResponse> => {
  const response = await api.post('/payments/create-payment-intent', {
    eventId,
    amount,
    currency,
  });
  return response.data;
};

/**
 * Confirmer un paiement après succès
 */
export const confirmPayment = async (
  paymentIntentId: string,
  ticketId: string
): Promise<{ message: string; ticketId: string; status: string }> => {
  const response = await api.post('/payments/confirm', {
    paymentIntentId,
    ticketId,
  });
  return response.data;
};

/**
 * Récupérer le statut d'un paiement
 */
export const getPaymentStatus = async (
  paymentIntentId: string
): Promise<PaymentStatusResponse> => {
  const response = await api.get(`/payments/status/${paymentIntentId}`);
  return response.data;
};

/**
 * Récupérer l'historique des paiements de l'utilisateur
 */
export const getMyPayments = async (): Promise<Payment[]> => {
  const response = await api.get('/payments/my-payments');
  return response.data.payments.map((payment: any) => ({
    ...payment,
    createdAt: new Date(payment.createdAt),
    updatedAt: new Date(payment.updatedAt),
  }));
};
