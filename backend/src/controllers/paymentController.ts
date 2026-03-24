/**
 * @module paymentController
 * @description Contrôleur de paiement via Stripe pour les événements payants.
 *
 * Orchestre le flux de paiement complet :
 * 1. Création d'un PaymentIntent Stripe avec les métadonnées événement/utilisateur
 * 2. Confirmation côté serveur après succès du paiement côté client
 * 3. Mise à jour automatique via webhooks Stripe (succeeded, failed, canceled)
 * 4. Consultation du statut et de l'historique des paiements
 *
 * Les montants sont stockés en euros dans Firestore et convertis en centimes
 * pour Stripe (convention Stripe : 10€ = 1000 centimes).
 *
 * Routes gérées :
 * - POST /payments/create-intent           → createPaymentIntent
 * - POST /payments/confirm                 → confirmPayment
 * - GET  /payments/status/:paymentIntentId → getPaymentStatus
 * - POST /payments/webhook                 → handleStripeWebhook
 * - GET  /payments/my                      → getMyPayments
 */
import { Request, Response } from 'express';
import { stripe, STRIPE_WEBHOOK_SECRET } from '../config/stripe';
import { firebaseDb } from '../config/firebaseAdmin';
import { getUserByFirebaseUid } from '../services/userService';
import Stripe from 'stripe';

/**
 * POST /payments/create-intent
 * Crée un PaymentIntent Stripe pour un événement payant. Vérifie que
 * l'événement existe, qu'il n'est pas gratuit, et que le montant est positif.
 * Le PaymentIntent est aussi persisté dans Firestore pour suivi interne.
 * Retourne le clientSecret nécessaire au SDK Stripe côté mobile.
 *
 * @body {string} eventId        - Identifiant de l'événement
 * @body {number} amount         - Montant en euros (sera converti en centimes)
 * @body {string} [currency=eur] - Devise ISO (défaut EUR)
 */
export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { eventId, amount, currency = 'eur' } = req.body;

    if (!eventId || !amount) {
      return res.status(400).json({ message: 'eventId and amount are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    // Vérifier que l'événement existe
    const eventDoc = await firebaseDb.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const eventData = eventDoc.data()!;
    
    // Vérifier que l'événement est payant
    if (eventData.isFree) {
      return res.status(400).json({ message: 'This event is free, no payment required' });
    }

    // Récupérer l'utilisateur
    const user = await getUserByFirebaseUid(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Créer le PaymentIntent avec Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe utilise les centimes
      currency: currency.toLowerCase(),
      metadata: {
        eventId,
        userId,
        eventTitle: eventData.title,
        userEmail: user.email,
        userName: user.name || user.email,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Sauvegarder le PaymentIntent dans Firestore
    await firebaseDb.collection('payments').doc(paymentIntent.id).set({
      id: paymentIntent.id,
      amount: amount,
      currency,
      status: paymentIntent.status,
      eventId,
      userId,
      eventTitle: eventData.title,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.status(200).json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount,
      currency,
    });
  } catch (error: any) {
    console.error('Create payment intent error:', error);
    return res.status(500).json({ 
      message: 'Failed to create payment intent', 
      error: error.message 
    });
  }
};

/**
 * POST /payments/confirm
 * Confirme un paiement réussi côté serveur. Vérifie le statut « succeeded »
 * sur Stripe, que le paiement appartient bien à l'utilisateur, puis
 * met à jour le billet associé en « confirmed » et le paiement en « succeeded ».
 * Double vérification d'appartenance (paymentIntent.metadata + ticket.userId)
 * pour éviter toute fraude.
 *
 * @body {string} paymentIntentId - Identifiant du PaymentIntent Stripe
 * @body {string} ticketId        - Identifiant du billet à confirmer
 */
export const confirmPayment = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { paymentIntentId, ticketId } = req.body;

    if (!paymentIntentId || !ticketId) {
      return res.status(400).json({ message: 'paymentIntentId and ticketId are required' });
    }

    // Récupérer le PaymentIntent depuis Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        message: 'Payment not completed', 
        status: paymentIntent.status 
      });
    }

    // Vérifier que le paiement appartient à cet utilisateur
    if (paymentIntent.metadata.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to confirm this payment' });
    }

    // Récupérer le billet
    const ticketDoc = await firebaseDb.collection('tickets').doc(ticketId).get();
    if (!ticketDoc.exists) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticketData = ticketDoc.data()!;

    // Vérifier que le billet appartient à cet utilisateur
    if (ticketData.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to update this ticket' });
    }

    // Mettre à jour le statut du billet à "confirmed"
    await firebaseDb.collection('tickets').doc(ticketId).update({
      status: 'confirmed',
      paymentIntentId: paymentIntentId,
      paidAt: new Date(),
      updatedAt: new Date(),
    });

    // Mettre à jour le paiement dans Firestore
    await firebaseDb.collection('payments').doc(paymentIntentId).update({
      status: 'succeeded',
      ticketId,
      updatedAt: new Date(),
    });

    return res.status(200).json({
      message: 'Payment confirmed successfully',
      ticketId,
      status: 'confirmed',
    });
  } catch (error: any) {
    console.error('Confirm payment error:', error);
    return res.status(500).json({ 
      message: 'Failed to confirm payment', 
      error: error.message 
    });
  }
};

/**
 * GET /payments/status/:paymentIntentId
 * Récupère le statut actuel d'un paiement depuis Stripe et synchronise
 * Firestore si le statut a changé. Permet au mobile de vérifier
 * l'état du paiement en cas de doute (retour à l'app après background).
 *
 * @param {string} paymentIntentId - Identifiant du PaymentIntent Stripe
 */
export const getPaymentStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      return res.status(400).json({ message: 'paymentIntentId is required' });
    }

    // Récupérer depuis Firestore
    const paymentDoc = await firebaseDb.collection('payments').doc(paymentIntentId).get();
    
    if (!paymentDoc.exists) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const paymentData = paymentDoc.data()!;

    // Vérifier que le paiement appartient à cet utilisateur
    if (paymentData.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Récupérer le statut à jour depuis Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Mettre à jour le statut dans Firestore si différent
    if (paymentIntent.status !== paymentData.status) {
      await firebaseDb.collection('payments').doc(paymentIntentId).update({
        status: paymentIntent.status,
        updatedAt: new Date(),
      });
    }

    return res.status(200).json({
      paymentIntentId,
      status: paymentIntent.status,
      amount: paymentData.amount,
      currency: paymentData.currency,
      eventId: paymentData.eventId,
      ticketId: paymentData.ticketId,
    });
  } catch (error: any) {
    console.error('Get payment status error:', error);
    return res.status(500).json({ 
      message: 'Failed to get payment status', 
      error: error.message 
    });
  }
};

/**
 * POST /payments/webhook
 * Endpoint webhook Stripe pour recevoir les notifications asynchrones.
 * Vérifie la signature pour garantir l'authenticité, puis met à jour
 * le statut du paiement dans Firestore selon le type d'événement :
 * - payment_intent.succeeded → « succeeded »
 * - payment_intent.payment_failed → « failed »
 * - payment_intent.canceled → « canceled »
 *
 * Le body brut est nécessaire (pas de JSON parse) pour la vérification
 * de signature Stripe ; le middleware express.raw() doit être configuré
 * sur cette route.
 */
export const handleStripeWebhook = async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      return res.status(400).json({ message: 'Missing stripe-signature header' });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ message: `Webhook Error: ${err.message}` });
    }

    // Gérer les différents types d'événements
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('✅ Payment succeeded:', paymentIntent.id);

        // Mettre à jour le statut dans Firestore
        await firebaseDb.collection('payments').doc(paymentIntent.id).update({
          status: 'succeeded',
          updatedAt: new Date(),
        });

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('❌ Payment failed:', paymentIntent.id);

        // Mettre à jour le statut dans Firestore
        await firebaseDb.collection('payments').doc(paymentIntent.id).update({
          status: 'failed',
          updatedAt: new Date(),
        });

        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('🚫 Payment canceled:', paymentIntent.id);

        await firebaseDb.collection('payments').doc(paymentIntent.id).update({
          status: 'canceled',
          updatedAt: new Date(),
        });

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      message: 'Webhook handler failed', 
      error: error.message 
    });
  }
};

/**
 * GET /payments/my
 * Retourne l'historique des 50 derniers paiements de l'utilisateur
 * connecté, triés du plus récent au plus ancien. Utilisé par l'écran
 * « Mes paiements » sur le mobile.
 */
export const getMyPayments = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const paymentsSnap = await firebaseDb
      .collection('payments')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const payments = paymentsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.(),
      updatedAt: doc.data().updatedAt?.toDate?.(),
    }));

    return res.status(200).json({ payments });
  } catch (error: any) {
    console.error('Get my payments error:', error);
    return res.status(500).json({ 
      message: 'Failed to get payments', 
      error: error.message 
    });
  }
};
