/**
 * @module types/payments
 * @description Types et interfaces pour le système de paiement Stripe.
 *
 * Définit le contrat de données entre le frontend, les contrôleurs de paiement
 * et le service Stripe. Le flux de paiement suit le modèle Stripe PaymentIntents :
 * 1. Le client crée un PaymentIntent (CreatePaymentIntentRequest)
 * 2. Stripe retourne un clientSecret pour la confirmation côté mobile
 * 3. Le webhook Stripe notifie le backend du résultat (PaymentWebhookEvent)
 * 4. Le backend met à jour le statut du ticket en conséquence
 *
 * @exports PaymentIntent - Représentation locale d'un PaymentIntent Stripe
 * @exports CreatePaymentIntentRequest - Payload de création de paiement
 * @exports ConfirmPaymentRequest - Payload de confirmation avec ticket associé
 * @exports PaymentWebhookEvent - Structure des événements webhook Stripe
 * @exports PaymentStatus - États du cycle de vie d'un paiement
 */

/** Miroir local d'un PaymentIntent Stripe, enrichi des identifiants métier */
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  /** Les statuts suivent exactement la machine à états de Stripe */
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  /** Secret transmis au mobile pour finaliser le paiement côté client */
  clientSecret: string;
  eventId: string;
  userId: string;
  /** Associé une fois le paiement confirmé et le ticket généré */
  ticketId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Requête du frontend pour initier un paiement */
export interface CreatePaymentIntentRequest {
  eventId: string;
  /** Montant en centimes (convention Stripe) */
  amount: number;
  /** Défaut : 'eur' si non spécifié */
  currency?: string;
}

/** Requête pour lier un PaymentIntent confirmé à un ticket */
export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  ticketId: string;
}

/** Structure générique d'un événement webhook Stripe reçu par notre endpoint */
export interface PaymentWebhookEvent {
  type: string;
  data: {
    object: any;
  };
}

/**
 * Statuts internes du paiement dans notre système.
 * Découplés des statuts Stripe pour permettre une logique métier indépendante
 * (ex: REFUNDED n'existe pas directement comme état de PaymentIntent chez Stripe).
 */
export enum PaymentStatus {
  PENDING = 'pending_payment',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}
