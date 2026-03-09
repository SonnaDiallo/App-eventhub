import { 
  createPaymentIntentViaFunctions, 
  confirmPaymentViaFunctions, 
  getMyPaymentsViaFunctions 
} from './functionsService';

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
  return await createPaymentIntentViaFunctions(eventId, amount, currency);
};

/**
 * Confirmer un paiement après succès
 */
export const confirmPayment = async (
  paymentIntentId: string,
  ticketId: string
): Promise<{ message: string; ticketId: string; status: string }> => {
  return await confirmPaymentViaFunctions(paymentIntentId, ticketId);
};

/**
 * Récupérer le statut d'un paiement (simplifié - récupère depuis la liste)
 */
export const getPaymentStatus = async (
  paymentIntentId: string
): Promise<PaymentStatusResponse> => {
  const { payments } = await getMyPaymentsViaFunctions();
  const payment = payments.find((p: any) => p.paymentIntentId === paymentIntentId);
  
  if (!payment) {
    throw new Error('Paiement non trouvé');
  }

  return {
    paymentIntentId,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    eventId: payment.eventId,
    ticketId: payment.ticketId,
  };
};

/**
 * Récupérer l'historique des paiements de l'utilisateur
 */
export const getMyPayments = async (): Promise<Payment[]> => {
  const { payments } = await getMyPaymentsViaFunctions();
  return payments.map((payment: any) => ({
    ...payment,
    createdAt: payment.createdAt ? new Date(payment.createdAt) : new Date(),
    updatedAt: payment.updatedAt ? new Date(payment.updatedAt) : new Date(),
  }));
};
