/**
 * @fileoverview Routes de gestion des paiements via Stripe.
 * @description Gère la création d'intentions de paiement, la confirmation,
 * la consultation du statut et l'historique des paiements de l'utilisateur.
 * Comprend également le webhook Stripe pour les notifications asynchrones.
 * Les routes utilisateur nécessitent une authentification JWT.
 * Le webhook utilise la signature Stripe pour la vérification.
 *
 * Endpoints enregistrés :
 * - POST /api/payments/create-payment-intent          → Créer une intention de paiement (auth requise)
 * - POST /api/payments/confirm                        → Confirmer un paiement (auth requise)
 * - GET  /api/payments/status/:paymentIntentId        → Statut d'un paiement (auth requise)
 * - GET  /api/payments/my-payments                    → Historique de mes paiements (auth requise)
 * - POST /api/payments/webhook                        → Webhook Stripe (body brut, signature Stripe)
 * @module routes/paymentRoutes
 */
import express from 'express';
import { 
  createPaymentIntent, 
  confirmPayment, 
  getPaymentStatus,
  handleStripeWebhook,
  getMyPayments
} from '../controllers/paymentController';
import { requireAuth } from '../middleware/requireAuth';

const router = express.Router();

router.post('/create-payment-intent', requireAuth, createPaymentIntent);
router.post('/confirm', requireAuth, confirmPayment);
router.get('/status/:paymentIntentId', requireAuth, getPaymentStatus);
router.get('/my-payments', requireAuth, getMyPayments);

router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
