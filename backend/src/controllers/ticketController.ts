/**
 * @module ticketController
 * @description Contrôleur de gestion des billets et du check-in événementiel.
 *
 * Couvre toute la chaîne du billet : consultation par le participant,
 * recherche par code, validation (scan QR) par l'organisateur,
 * et reporting pour le tableau de bord organisateur.
 *
 * Le système de vérification (verifyTicket) inclut un contrôle
 * d'autorisation multi-niveaux : soit l'utilisateur est l'organisateur
 * de l'événement, soit il a le rôle global organizer/admin ou le
 * flag canScanTickets. Un historique de scan est enregistré à chaque
 * validation pour traçabilité.
 *
 * Routes gérées :
 * - GET  /tickets/my                          → getMyTickets
 * - GET  /tickets/code/:code                  → getTicketByCode
 * - POST /tickets/verify/:code                → verifyTicket
 * - GET  /tickets/events/:eventId/stats       → getEventTicketStats
 * - GET  /tickets/events/:eventId/scan-history→ getEventScanHistory
 */
import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { firebaseDb } from '../config/firebaseAdmin';
import { getUserByFirebaseUid } from '../services/userService';

const toDate = (v: admin.firestore.Timestamp | Date | undefined): Date | undefined =>
  !v ? undefined : v instanceof Date ? v : (v as admin.firestore.Timestamp).toDate?.() ?? undefined;

/**
 * GET /tickets/my
 * Retourne les billets de l'utilisateur connecté avec pagination.
 * Chaque billet est enrichi des informations de l'événement associé
 * (titre, image, dates, lieu) pour l'affichage dans « Mes billets ».
 * Peut être filtré par eventId ou par statut checkedIn.
 *
 * @query {number}  [page=1]     - Numéro de page
 * @query {number}  [limit=20]   - Éléments par page
 * @query {string}  [eventId]    - Filtre par événement
 * @query {string}  [checkedIn]  - « true » ou « false »
 */
export const getMyTickets = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await getUserByFirebaseUid(userId);
    if (!user) return res.status(404).json({ message: 'User not found in database' });

    const { page = '1', limit = '20', eventId, checkedIn } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    let query: admin.firestore.Query = firebaseDb.collection('tickets').where('userId', '==', userId);
    if (eventId) query = query.where('eventId', '==', eventId);
    if (checkedIn !== undefined) query = query.where('checkedIn', '==', checkedIn === 'true');

    const snap = await query.get();
    let list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
    const total = list.length;
    list = list.slice(skip, skip + limitNum);

    const eventIds = [...new Set(list.map((t) => t.eventId).filter(Boolean))];
    const eventSnaps = await Promise.all(eventIds.map((id) => firebaseDb.collection('events').doc(id).get()));
    const eventMap: Record<string, any> = {};
    eventIds.forEach((id, i) => {
      if (eventSnaps[i]?.exists) eventMap[id] = eventSnaps[i].data();
    });

    const ticketsData = list.map((t) => {
      const ev = eventMap[t.eventId];
      return {
        id: t.id,
        code: t.code,
        eventId: t.eventId,
        event: ev
          ? { id: t.eventId, title: ev.title, coverImage: ev.coverImage, startDate: toDate(ev.startDate), endDate: toDate(ev.endDate), location: ev.location }
          : undefined,
        participantName: t.participantName,
        participantEmail: t.participantEmail,
        ticketType: t.ticketType,
        price: t.price,
        checkedIn: t.checkedIn ?? false,
        checkedInAt: toDate(t.checkedInAt),
        createdAt: toDate(t.createdAt),
        updatedAt: toDate(t.updatedAt),
      };
    });

    return res.status(200).json({
      tickets: ticketsData,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    console.error('Get my tickets error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /tickets/code/:code
 * Recherche un billet par son code unique (8 caractères hexadécimaux).
 * Le code est normalisé en majuscules avant la recherche.
 * Joint les informations de l'événement et de l'utilisateur pour
 * afficher un résumé complet du billet.
 *
 * @param {string} code - Code unique du billet (insensible à la casse)
 */
export const getTicketByCode = async (req: Request, res: Response) => {
  try {
    const code = (req.params.code || '').toUpperCase();
    if (!code) return res.status(400).json({ message: 'Ticket code is required' });

    const snap = await firebaseDb.collection('tickets').where('code', '==', code).limit(1).get();
    if (snap.empty) return res.status(404).json({ message: 'Ticket not found' });

    const doc = snap.docs[0];
    const t = { id: doc.id, ...doc.data() } as any;
    const eventSnap = await firebaseDb.collection('events').doc(t.eventId).get();
    const userSnap = t.userId ? await firebaseDb.collection('users').doc(t.userId).get() : null;
    const event = eventSnap.exists ? eventSnap.data() : null;
    const user = userSnap?.exists ? userSnap.data() : null;

    const ticketData = {
      id: t.id,
      code: t.code,
      eventId: t.eventId,
      event: event ? { id: t.eventId, title: event.title, startDate: toDate(event.startDate), endDate: toDate(event.endDate), location: event.location, organizerName: event.organizerName } : undefined,
      user: user ? { id: t.userId, name: user.name || [user.firstName, user.lastName].filter(Boolean).join(' '), email: user.email } : null,
      participantName: t.participantName,
      participantEmail: t.participantEmail,
      ticketType: t.ticketType,
      price: t.price,
      checkedIn: t.checkedIn ?? false,
      checkedInAt: toDate(t.checkedInAt),
      createdAt: toDate(t.createdAt),
    };

    return res.status(200).json({ ticket: ticketData });
  } catch (error: any) {
    console.error('Get ticket by code error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * POST /tickets/verify/:code
 * Valide un billet lors du check-in (scan QR). Contrôle d'autorisation
 * multi-niveaux : organisateur de l'événement OU rôle global autorisé.
 * Si eventId est fourni en query, vérifie que le billet correspond bien
 * à cet événement. Refuse les billets déjà scannés (idempotence).
 * Enregistre un historique de scan avec l'identité du scanner.
 *
 * @param {string} code       - Code du billet à valider
 * @query {string} [eventId]  - Événement attendu (vérification croisée)
 */
export const verifyTicket = async (req: Request, res: Response) => {
  try {
    const code = (req.params.code || '').trim().toUpperCase();
    const eventIdQuery = (req.query.eventId as string | undefined)?.trim();
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    if (!code) return res.status(400).json({ message: 'Ticket code is required' });

    const snap = await firebaseDb.collection('tickets').where('code', '==', code).limit(1).get();
    if (snap.empty) return res.status(404).json({ message: 'Ticket not found' });

    const doc = snap.docs[0];
    const t = doc.data() as { eventId?: string; checkedIn?: boolean; checkedInAt?: unknown; code?: string; userId?: string; participantName?: string };
    const ticketEventId = (t.eventId || '').trim();

    // Vérifier que le scanner peut valider ce billet : organisateur de l'événement OU rôle global organizer/admin/canScanTickets
    const eventSnap = await firebaseDb.collection('events').doc(ticketEventId).get();
    const eventData = eventSnap.exists ? (eventSnap.data() as { organizerId?: string; title?: string }) : null;
    const isOrganizerOfEvent = !!eventData?.organizerId && eventData.organizerId === userId;

    const user = await getUserByFirebaseUid(userId);
    const hasGlobalPermission = user && (user.canScanTickets === true || user.role === 'organizer' || user.role === 'admin');

    if (!isOrganizerOfEvent && !hasGlobalPermission) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to scan tickets for this event' });
    }

    if (eventIdQuery && ticketEventId !== eventIdQuery) {
      const otherTitle = eventData?.title ?? 'Événement';
      return res.status(400).json({
        message: `Ce billet appartient à l'événement "${otherTitle}". Sélectionnez le bon événement.`,
      });
    }
    if (t.checkedIn) {
      return res.status(400).json({ message: 'Ticket already checked in', checkedInAt: toDate(t.checkedInAt) });
    }

    await doc.ref.update({
      checkedIn: true,
      checkedInAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const scannerName = (user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()) || 'Utilisateur';
    await firebaseDb.collection('scanHistory').add({
      ticketId: doc.id,
      ticketCode: t.code || code,
      eventId: t.eventId,
      participantId: t.userId || null,
      participantName: t.participantName || null,
      scannedBy: userId,
      scannedByName: scannerName,
      scannedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const eventTitle = eventData?.title ?? '';

    return res.status(200).json({
      message: 'Ticket verified successfully',
      ticket: {
        id: doc.id,
        code: t.code,
        eventId: t.eventId,
        eventTitle,
        participantName: t.participantName,
        checkedIn: true,
        checkedInAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error('Verify ticket error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /tickets/events/:eventId/stats
 * Statistiques de billetterie pour un événement : total de billets,
 * nombre de check-ins, billets en attente, taux de check-in,
 * revenus totaux et ventilation par type de billet.
 * Réservé à l'organisateur de l'événement.
 *
 * @param {string} eventId - Identifiant Firestore de l'événement
 */
export const getEventTicketStats = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const eventSnap = await firebaseDb.collection('events').doc(eventId).get();
    if (!eventSnap.exists) return res.status(404).json({ message: 'Event not found' });
    const eventData = eventSnap.data()!;
    if (eventData.organizerId !== userId) return res.status(403).json({ message: 'Forbidden: You are not the organizer of this event' });

    const ticketsSnap = await firebaseDb.collection('tickets').where('eventId', '==', eventId).get();
    const tickets = ticketsSnap.docs.map((d) => d.data());
    const totalTickets = tickets.length;
    const checkedInTickets = tickets.filter((t) => t.checkedIn === true).length;
    const pendingTickets = totalTickets - checkedInTickets;

    const byType: Record<string, number> = {};
    tickets.forEach((t) => {
      const type = t.ticketType || 'Standard';
      byType[type] = (byType[type] || 0) + 1;
    });
    const totalRevenue = tickets.reduce((sum, t) => sum + (Number(t.price) || 0), 0);

    return res.status(200).json({
      eventId,
      eventTitle: eventData.title,
      stats: {
        totalTickets,
        checkedInTickets,
        pendingTickets,
        checkInRate: totalTickets > 0 ? ((checkedInTickets / totalTickets) * 100).toFixed(2) : '0.00',
        totalRevenue,
        ticketsByType: Object.entries(byType).map(([type, count]) => ({ type, count })),
      },
    });
  } catch (error: any) {
    console.error('Get event ticket stats error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /tickets/events/:eventId/scan-history
 * Historique des scans de billets pour un événement, trié du plus
 * récent au plus ancien. Inclut l'identité du scanner et du participant.
 * Réservé à l'organisateur. Limité à 100 entrées max.
 *
 * @param {string} eventId     - Identifiant Firestore de l'événement
 * @query {number} [limit=50]  - Nombre max d'entrées (max 100)
 */
export const getEventScanHistory = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const eventSnap = await firebaseDb.collection('events').doc(eventId).get();
    if (!eventSnap.exists) return res.status(404).json({ message: 'Event not found' });
    const eventData = eventSnap.data()!;
    if (eventData.organizerId !== userId) return res.status(403).json({ message: 'Forbidden: You are not the organizer of this event' });

    const { limit = '50' } = req.query;
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);

    const snap = await firebaseDb
      .collection('scanHistory')
      .where('eventId', '==', eventId)
      .orderBy('scannedAt', 'desc')
      .limit(limitNum)
      .get();

    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ticketId: data.ticketId,
        ticketCode: data.ticketCode || '',
        eventId: data.eventId,
        participantId: data.participantId,
        participantName: data.participantName,
        scannedBy: data.scannedBy,
        scannedByName: data.scannedByName || '',
        scannedAt: toDate(data.scannedAt),
      };
    });

    return res.status(200).json({ scans: list, total: list.length });
  } catch (error: any) {
    console.error('Get event scan history error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
