export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  clientSecret: string;
  eventId: string;
  userId: string;
  ticketId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentIntentRequest {
  eventId: string;
  amount: number;
  currency?: string;
}

export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  ticketId: string;
}

export interface PaymentWebhookEvent {
  type: string;
  data: {
    object: any;
  };
}

export enum PaymentStatus {
  PENDING = 'pending_payment',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}
