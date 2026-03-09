import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';

admin.initializeApp();
const db = admin.firestore();

// ==================== HELPERS ====================
const toDate = (v: admin.firestore.Timestamp | Date | undefined): Date | undefined =>
  !v ? undefined : v instanceof Date ? v : (v as admin.firestore.Timestamp).toDate?.() ?? undefined;

function generateTicketCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function ensureUniqueTicketCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateTicketCode();
    const snap = await db.collection('tickets').where('code', '==', code).limit(1).get();
    if (snap.empty) return code;
  }
  return generateTicketCode() + Date.now().toString(36).slice(-4).toUpperCase();
}

// Vérifier l'authentification
async function verifyAuth(context: functions.https.CallableContext) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentification requise');
  }
  return context.auth.uid;
}

// Récupérer les infos utilisateur depuis Firestore
async function getUserData(userId: string) {
  const userSnap = await db.collection('users').doc(userId).get();
  if (!userSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Utilisateur non trouvé');
  }
  return { id: userId, ...userSnap.data() };
}

// ==================== EVENTS ====================

// Créer un événement
export const createEvent = functions.https.onCall(async (data, context) => {
  const userId = await verifyAuth(context);
  const user = await getUserData(userId) as any;

  const { title, coverImage, startDate, endDate, location, description, isFree, price, capacity, category } = data;

  if (!title) {
    throw new functions.https.HttpsError('invalid-argument', 'Le titre est requis');
  }

  const organizerName = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Organisateur';

  const eventData: any = {
    title,
    coverImage: coverImage || null,
    category: category || 'other',
    organizerId: userId,
    organizerName,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (startDate) eventData.startDate = new Date(startDate);
  if (endDate) eventData.endDate = new Date(endDate);
  if (location) eventData.location = location;
  if (description) eventData.description = description;
  if (typeof isFree === 'boolean') eventData.isFree = isFree;
  if (typeof price === 'number') eventData.price = price;
  if (typeof capacity === 'number') eventData.capacity = capacity;

  const ref = await db.collection('events').add(eventData);
  
  return { 
    success: true, 
    eventId: ref.id,
    event: { id: ref.id, ...eventData, createdAt: new Date(), updatedAt: new Date() }
  };
});

// Rejoindre un événement
export const joinEvent = functions.https.onCall(async (data, context) => {
  const userId = await verifyAuth(context);
  const user = await getUserData(userId) as any;
  const { eventId } = data;

  if (!eventId) {
    throw new functions.https.HttpsError('invalid-argument', 'Event ID requis');
  }

  const eventSnap = await db.collection('events').doc(eventId).get();
  if (!eventSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Événement non trouvé');
  }

  const eventData = eventSnap.data()!;
  const isFree = eventData.isFree !== false;

  // Ajouter comme participant
  await db.collection('events').doc(eventId).collection('participants').doc(userId).set({
    status: isFree ? 'confirmed' : 'pending_payment',
    userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  // Créer le ticket
  const code = await ensureUniqueTicketCode();
  const participantName = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Participant';
  const startDateVal = toDate(eventData.startDate);
  const eventDate = startDateVal ? startDateVal.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const eventTime = startDateVal ? startDateVal.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

  const ticketRef = await db.collection('tickets').add({
    code,
    eventId,
    userId,
    participantName,
    participantEmail: user.email || undefined,
    ticketType: isFree ? 'Gratuit' : 'Standard',
    price: eventData.price ?? 0,
    checkedIn: false,
    eventTitle: eventData.title || '',
    eventLocation: eventData.location || '',
    eventDate,
    eventTime,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    ticket: { id: ticketRef.id, code },
    message: 'Inscription réussie'
  };
});

// ==================== TICKETS ====================

// Récupérer mes tickets
export const getMyTickets = functions.https.onCall(async (data, context) => {
  const userId = await verifyAuth(context);

  const snap = await db.collection('tickets').where('userId', '==', userId).get();
  
  const tickets = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
    updatedAt: toDate(doc.data().updatedAt),
  }));

  // Trier par date de création décroissante
  tickets.sort((a: any, b: any) => {
    const ta = a.createdAt?.getTime?.() ?? 0;
    const tb = b.createdAt?.getTime?.() ?? 0;
    return tb - ta;
  });

  return { tickets };
});

// Vérifier/scanner un ticket
export const verifyTicket = functions.https.onCall(async (data, context) => {
  const userId = await verifyAuth(context);
  const { ticketCode, eventId, markAsUsed } = data;

  if (!ticketCode) {
    throw new functions.https.HttpsError('invalid-argument', 'Code ticket requis');
  }

  const code = ticketCode.toUpperCase();
  const snap = await db.collection('tickets').where('code', '==', code).limit(1).get();
  
  if (snap.empty) {
    throw new functions.https.HttpsError('not-found', 'Ticket non trouvé');
  }

  const ticketDoc = snap.docs[0];
  const ticket = ticketDoc.data();

  // Vérifier que c'est pour le bon événement
  if (eventId && ticket.eventId !== eventId) {
    throw new functions.https.HttpsError('invalid-argument', 'Ce ticket n\'est pas pour cet événement');
  }

  // Vérifier que l'utilisateur est l'organisateur de l'événement
  if (eventId) {
    const eventSnap = await db.collection('events').doc(eventId).get();
    if (eventSnap.exists && eventSnap.data()?.organizerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Seul l\'organisateur peut scanner les tickets');
    }
  }

  const result: any = {
    valid: true,
    ticket: {
      id: ticketDoc.id,
      code: ticket.code,
      eventId: ticket.eventId,
      participantName: ticket.participantName,
      ticketType: ticket.ticketType,
      checkedIn: ticket.checkedIn,
      checkedInAt: toDate(ticket.checkedInAt),
    }
  };

  // Marquer comme utilisé si demandé
  if (markAsUsed && !ticket.checkedIn) {
    await ticketDoc.ref.update({
      checkedIn: true,
      checkedInAt: admin.firestore.FieldValue.serverTimestamp(),
      scannedBy: userId,
    });
    result.ticket.checkedIn = true;
    result.ticket.checkedInAt = new Date();
    result.message = 'Ticket validé avec succès';
  } else if (ticket.checkedIn) {
    result.alreadyUsed = true;
    result.message = 'Ce ticket a déjà été utilisé';
  }

  return result;
});

// ==================== REVIEWS ====================

// Créer un avis
export const createReview = functions.https.onCall(async (data, context) => {
  const userId = await verifyAuth(context);
  const user = await getUserData(userId) as any;
  const { eventId, rating, comment } = data;

  if (!eventId) {
    throw new functions.https.HttpsError('invalid-argument', 'Event ID requis');
  }
  if (!rating || rating < 1 || rating > 5) {
    throw new functions.https.HttpsError('invalid-argument', 'La note doit être entre 1 et 5');
  }
  if (!comment || comment.trim().length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Le commentaire est requis');
  }

  // Vérifier que l'événement existe
  const eventSnap = await db.collection('events').doc(eventId).get();
  if (!eventSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Événement non trouvé');
  }

  // Vérifier qu'on n'a pas déjà laissé un avis
  const existingSnap = await db.collection('reviews')
    .where('eventId', '==', eventId)
    .where('userId', '==', userId)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    throw new functions.https.HttpsError('already-exists', 'Vous avez déjà donné votre avis sur cet événement');
  }

  const userName = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Utilisateur';

  const reviewRef = await db.collection('reviews').add({
    eventId,
    userId,
    userName,
    userAvatar: user.avatar || user.photoURL || null,
    rating: Number(rating),
    comment: comment.trim(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    reviewId: reviewRef.id,
    message: 'Avis créé avec succès'
  };
});

// Récupérer les avis d'un événement
export const getEventReviews = functions.https.onCall(async (data) => {
  const { eventId, page = 1, limit = 10 } = data;

  if (!eventId) {
    throw new functions.https.HttpsError('invalid-argument', 'Event ID requis');
  }

  const snap = await db.collection('reviews')
    .where('eventId', '==', eventId)
    .orderBy('createdAt', 'desc')
    .get();

  const reviews = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: toDate(doc.data().createdAt),
    updatedAt: toDate(doc.data().updatedAt),
  }));

  // Pagination manuelle
  const startIndex = (page - 1) * limit;
  const paginatedReviews = reviews.slice(startIndex, startIndex + limit);

  // Calculer les stats
  const totalRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0);
  const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

  return {
    reviews: paginatedReviews,
    stats: {
      total: reviews.length,
      averageRating: Math.round(averageRating * 10) / 10,
    },
    pagination: {
      page,
      limit,
      total: reviews.length,
      pages: Math.ceil(reviews.length / limit),
    }
  };
});

// Supprimer un avis
export const deleteReview = functions.https.onCall(async (data, context) => {
  const userId = await verifyAuth(context);
  const { reviewId } = data;

  if (!reviewId) {
    throw new functions.https.HttpsError('invalid-argument', 'Review ID requis');
  }

  const reviewSnap = await db.collection('reviews').doc(reviewId).get();
  if (!reviewSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Avis non trouvé');
  }

  if (reviewSnap.data()?.userId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Vous ne pouvez supprimer que vos propres avis');
  }

  await db.collection('reviews').doc(reviewId).delete();

  return { success: true, message: 'Avis supprimé' };
});

// ==================== FRIENDS ====================

// Envoyer une demande d'ami
export const sendFriendRequest = functions.https.onCall(async (data, context) => {
  const userId = await verifyAuth(context);
  const { toUserId } = data;

  if (!toUserId) {
    throw new functions.https.HttpsError('invalid-argument', 'ID utilisateur requis');
  }
  if (toUserId === userId) {
    throw new functions.https.HttpsError('invalid-argument', 'Vous ne pouvez pas vous envoyer une demande à vous-même');
  }

  // Vérifier que l'utilisateur cible existe
  const toUserSnap = await db.collection('users').doc(toUserId).get();
  if (!toUserSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Utilisateur non trouvé');
  }

  // Créer un ID unique pour la relation
  const pair = [userId, toUserId].sort();
  const docId = `${pair[0]}_${pair[1]}`;

  const existingSnap = await db.collection('friendRequests').doc(docId).get();
  if (existingSnap.exists) {
    const existing = existingSnap.data()!;
    if (existing.status === 'accepted') {
      throw new functions.https.HttpsError('already-exists', 'Vous êtes déjà amis');
    }
    if (existing.status === 'pending') {
      throw new functions.https.HttpsError('already-exists', 'Une demande est déjà en cours');
    }
  }

  await db.collection('friendRequests').doc(docId).set({
    fromUserId: userId,
    toUserId,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, message: 'Demande envoyée' };
});

// Récupérer les demandes d'amis reçues
export const getFriendRequests = functions.https.onCall(async (data, context) => {
  const userId = await verifyAuth(context);

  const snap = await db.collection('friendRequests')
    .where('toUserId', '==', userId)
    .where('status', '==', 'pending')
    .get();

  const requests = await Promise.all(snap.docs.map(async doc => {
    const reqData = doc.data();
    const fromUserSnap = await db.collection('users').doc(reqData.fromUserId).get();
    const fromUser = fromUserSnap.exists ? fromUserSnap.data() : null;
    
    return {
      id: doc.id,
      fromUser: fromUser ? {
        id: reqData.fromUserId,
        name: (fromUser as any).name || [(fromUser as any).firstName, (fromUser as any).lastName].filter(Boolean).join(' '),
        photoURL: (fromUser as any).photoURL || (fromUser as any).profileImage,
      } : null,
      createdAt: toDate(reqData.createdAt),
    };
  }));

  return { requests };
});

// Accepter une demande d'ami
export const acceptFriendRequest = functions.https.onCall(async (data, context) => {
  const userId = await verifyAuth(context);
  const { requestId } = data;

  if (!requestId) {
    throw new functions.https.HttpsError('invalid-argument', 'Request ID requis');
  }

  const requestSnap = await db.collection('friendRequests').doc(requestId).get();
  if (!requestSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Demande non trouvée');
  }

  const request = requestSnap.data()!;
  if (request.toUserId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Vous ne pouvez pas accepter cette demande');
  }

  await db.collection('friendRequests').doc(requestId).update({
    status: 'accepted',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, message: 'Demande acceptée' };
});

// Refuser une demande d'ami
export const rejectFriendRequest = functions.https.onCall(async (data, context) => {
  const userId = await verifyAuth(context);
  const { requestId } = data;

  if (!requestId) {
    throw new functions.https.HttpsError('invalid-argument', 'Request ID requis');
  }

  const requestSnap = await db.collection('friendRequests').doc(requestId).get();
  if (!requestSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Demande non trouvée');
  }

  const request = requestSnap.data()!;
  if (request.toUserId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Vous ne pouvez pas refuser cette demande');
  }

  await db.collection('friendRequests').doc(requestId).update({
    status: 'rejected',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, message: 'Demande refusée' };
});

// Récupérer la liste d'amis
export const getFriends = functions.https.onCall(async (data, context) => {
  const userId = await verifyAuth(context);

  // Chercher toutes les relations acceptées où l'utilisateur est impliqué
  const snap1 = await db.collection('friendRequests')
    .where('fromUserId', '==', userId)
    .where('status', '==', 'accepted')
    .get();

  const snap2 = await db.collection('friendRequests')
    .where('toUserId', '==', userId)
    .where('status', '==', 'accepted')
    .get();

  const friendIds = new Set<string>();
  snap1.docs.forEach(doc => friendIds.add(doc.data().toUserId));
  snap2.docs.forEach(doc => friendIds.add(doc.data().fromUserId));

  const friends = await Promise.all([...friendIds].map(async friendId => {
    const userSnap = await db.collection('users').doc(friendId).get();
    if (!userSnap.exists) return null;
    const userData = userSnap.data()!;
    return {
      id: friendId,
      name: (userData as any).name || [(userData as any).firstName, (userData as any).lastName].filter(Boolean).join(' '),
      email: (userData as any).email,
      photoURL: (userData as any).photoURL || (userData as any).profileImage,
    };
  }));

  return { friends: friends.filter(Boolean) };
});

// ==================== EMAIL (trigger automatique) ====================

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
});

// Envoi automatique d'email quand un ticket est créé
export const sendTicketEmail = functions.firestore
  .document('tickets/{ticketId}')
  .onCreate(async (snap, context) => {
    const ticket = snap.data();

    if (!ticket.participantEmail) {
      console.log('No email found for ticket:', context.params.ticketId);
      return null;
    }

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticket.code)}`;

    const mailOptions = {
      from: `EventHub <${process.env.EMAIL_USER || 'noreply@eventhub.com'}>`,
      to: ticket.participantEmail,
      subject: `🎫 Ton billet pour ${ticket.eventTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <h1 style="color: #7b5cff; text-align: center;">🎫 EventHub</h1>
          <div style="background: white; padding: 20px; border-radius: 12px;">
            <h2 style="margin: 0 0 20px;">${ticket.eventTitle}</h2>
            <p><strong>📅 Date:</strong> ${ticket.eventDate}</p>
            <p><strong>🕐 Heure:</strong> ${ticket.eventTime}</p>
            <p><strong>📍 Lieu:</strong> ${ticket.eventLocation}</p>
            <p><strong>👤 Participant:</strong> ${ticket.participantName}</p>
            <div style="text-align: center; margin: 20px 0;">
              <img src="${qrCodeUrl}" alt="QR Code" style="width: 180px; height: 180px;">
              <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; font-family: monospace;">${ticket.code}</p>
            </div>
            <p style="text-align: center; color: #888;">Présente ce QR code à l'entrée</p>
          </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Ticket email sent to:', ticket.participantEmail);
      await snap.ref.update({ emailSent: true, emailSentAt: admin.firestore.FieldValue.serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }
  });

// ==================== PAYMENTS (Stripe) ====================
// Note: Nécessite d'installer stripe: npm install stripe
// Configure STRIPE_SECRET_KEY dans functions/.env

// Créer un PaymentIntent
export const createPaymentIntent = functions.https.onCall(async (data: any, context) => {
  const userId = await verifyAuth(context);
  const { eventId, amount, currency = 'eur' } = data;

  if (!eventId || !amount) {
    throw new functions.https.HttpsError('invalid-argument', 'eventId et amount requis');
  }

  // Vérifier que Stripe est configuré
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Stripe non configuré');
  }

  // Charger Stripe dynamiquement
  const Stripe = require('stripe');
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

  // Vérifier que l'événement existe
  const eventSnap = await db.collection('events').doc(eventId).get();
  if (!eventSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Événement non trouvé');
  }

  // Créer le PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Stripe utilise les centimes
    currency,
    metadata: {
      eventId,
      userId,
    },
  });

  // Stocker le paiement dans Firestore
  await db.collection('payments').add({
    paymentIntentId: paymentIntent.id,
    userId,
    eventId,
    amount,
    currency,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    amount,
    currency,
  };
});

// Confirmer un paiement
export const confirmPayment = functions.https.onCall(async (data: any, context) => {
  const userId = await verifyAuth(context);
  const { paymentIntentId, ticketId } = data;

  if (!paymentIntentId) {
    throw new functions.https.HttpsError('invalid-argument', 'paymentIntentId requis');
  }

  // Mettre à jour le paiement dans Firestore
  const paymentsRef = db.collection('payments');
  const q = paymentsRef.where('paymentIntentId', '==', paymentIntentId).where('userId', '==', userId);
  const snap = await q.get();

  if (snap.empty) {
    throw new functions.https.HttpsError('not-found', 'Paiement non trouvé');
  }

  const paymentDoc = snap.docs[0];
  await paymentDoc.ref.update({
    status: 'completed',
    ticketId: ticketId || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Mettre à jour le statut du participant
  const paymentData = paymentDoc.data();
  if (paymentData.eventId) {
    await db.collection('events').doc(paymentData.eventId).collection('participants').doc(userId).update({
      status: 'confirmed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return {
    message: 'Paiement confirmé',
    ticketId,
    status: 'completed',
  };
});

// Récupérer mes paiements
export const getMyPayments = functions.https.onCall(async (data: any, context) => {
  const userId = await verifyAuth(context);

  const snap = await db.collection('payments')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  const payments = await Promise.all(snap.docs.map(async (docSnap: any) => {
    const paymentData = docSnap.data();
    
    // Récupérer les infos de l'événement
    let eventTitle = '';
    if (paymentData.eventId) {
      const eventSnap = await db.collection('events').doc(paymentData.eventId).get();
      if (eventSnap.exists) {
        eventTitle = eventSnap.data()?.title || '';
      }
    }

    return {
      id: docSnap.id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: paymentData.status,
      eventId: paymentData.eventId,
      eventTitle,
      ticketId: paymentData.ticketId,
      createdAt: toDate(paymentData.createdAt),
      updatedAt: toDate(paymentData.updatedAt),
    };
  }));

  return { payments };
});

// ==================== TICKETMASTER (External Events) ====================

const TICKETMASTER_BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

// Mapping des catégories Ticketmaster vers nos catégories
const categoryMapping: Record<string, string> = {
  'Music': 'music',
  'Sports': 'sports',
  'Arts & Theatre': 'culture',
  'Film': 'culture',
  'Miscellaneous': 'other',
  'Undefined': 'other',
};

// Récupérer les événements externes depuis Ticketmaster (pas d'authentification requise)
export const getExternalEvents = functions.https.onCall(async (data: any, context) => {
  // Cette fonction est publique - pas besoin d'authentification
  // context.auth peut être null et c'est OK
  
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    console.warn('Ticketmaster API key not configured');
    return { events: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
  }

  const { location, category, page = 1, limit = 20, search } = data || {};

  // Construire l'URL
  const params = new URLSearchParams({
    apikey: apiKey,
    size: String(Math.min(limit, 50)),
    page: String(page - 1), // Ticketmaster utilise 0-indexed
    sort: 'date,asc',
    countryCode: 'FR', // France par défaut
  });

  if (search) params.append('keyword', search);
  if (location) params.append('city', location);
  if (category && category !== 'all') {
    // Mapper notre catégorie vers le segment Ticketmaster
    const segmentMap: Record<string, string> = {
      'music': 'Music',
      'sports': 'Sports',
      'culture': 'Arts & Theatre',
      'art': 'Arts & Theatre',
      'food': 'Miscellaneous',
      'tech': 'Miscellaneous',
      'business': 'Miscellaneous',
    };
    if (segmentMap[category]) {
      params.append('classificationName', segmentMap[category]);
    }
  }

  const url = `${TICKETMASTER_BASE_URL}/events.json?${params.toString()}`;

  try {
    // Utiliser fetch (disponible dans Node.js 18+)
    const response = await fetch(url);
    const json = await response.json() as any;

    if (!json._embedded?.events) {
      return { events: [], pagination: { page, limit, total: 0, pages: 0 } };
    }

    const events = json._embedded.events.map((event: any) => {
      const venue = event._embedded?.venues?.[0];
      const startDate = event.dates?.start?.dateTime || event.dates?.start?.localDate;
      const priceRange = event.priceRanges?.[0];
      const segment = event.classifications?.[0]?.segment?.name || 'Miscellaneous';

      return {
        id: `external_${event.id}`,
        title: event.name,
        coverImage: event.images?.find((img: any) => img.ratio === '16_9')?.url || 
                   event.images?.[0]?.url || '',
        category: categoryMapping[segment] || 'other',
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        location: venue?.name || event._embedded?.venues?.[0]?.city?.name || 'Lieu non précisé',
        address: venue?.city?.name ? `${venue.city.name}, ${venue.country?.name || 'France'}` : '',
        description: event.info || event.pleaseNote || '',
        isFree: !priceRange,
        price: priceRange?.min || 0,
        capacity: 0,
        organizerName: event.promoter?.name || 'Ticketmaster',
        organizerId: '',
        source: 'ticketmaster',
        externalUrl: event.url,
        externalId: event.id,
      };
    });

    const totalElements = json.page?.totalElements || events.length;
    const totalPages = json.page?.totalPages || 1;

    return {
      events,
      pagination: {
        page,
        limit,
        total: totalElements,
        pages: totalPages,
      },
    };
  } catch (error: any) {
    console.error('Ticketmaster API error:', error.message);
    return { events: [], pagination: { page, limit, total: 0, pages: 0 } };
  }
});
