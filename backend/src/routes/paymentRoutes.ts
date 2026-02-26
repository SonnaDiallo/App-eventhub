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

// Routes protégées (nécessitent authentification)
router.post('/create-payment-intent', requireAuth, createPaymentIntent);
router.post('/confirm', requireAuth, confirmPayment);
router.get('/status/:paymentIntentId', requireAuth, getPaymentStatus);
router.get('/my-payments', requireAuth, getMyPayments);

// Webhook Stripe (pas d'authentification JWT, vérification par signature Stripe)
// IMPORTANT: Cette route doit recevoir le body brut (raw), pas du JSON parsé
router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
