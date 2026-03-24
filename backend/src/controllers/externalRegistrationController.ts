/**
 * @module externalRegistrationController
 * @description Contrôleur d'inscription aux événements externes (Ticketmaster).
 *
 * Permet aux utilisateurs de manifester leur intérêt pour un événement
 * externe sans créer de billet réel (la billetterie reste sur la
 * plateforme tierce). Les inscriptions sont stockées dans la collection
 * Firestore « externalRegistrations » et servent principalement à :
 * - Afficher les événements externes dans « Mes inscriptions »
 * - Montrer le nombre de participants de la communauté EventHub
 * - Empêcher les doublons (une seule inscription active par utilisateur)
 *
 * Routes gérées :
 * - POST   /external-registrations                           → registerForExternalEvent
 * - DELETE /external-registrations/:externalEventId          → cancelExternalEventRegistration
 * - GET    /external-registrations/:externalEventId/participants → getExternalEventParticipants
 * - GET    /external-registrations/my                        → getMyExternalRegistrations
 * - GET    /external-registrations/:externalEventId/check    → checkExternalEventRegistration
 */
import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { firebaseDb } from '../config/firebaseAdmin';
import { getUserByFirebaseUid } from '../services/userService';

type AuthRequest = Request & { user?: { userId?: string } };

const getUserId = (req: AuthRequest): string | null => (req as any).user?.userId ?? null;

const toDate = (v: admin.firestore.Timestamp | undefined): Date | undefined =>
  !v ? undefined : (v as admin.firestore.Timestamp).toDate?.();

/**
 * POST /external-registrations
 * Inscrit l'utilisateur connecté à un événement externe. Vérifie qu'il
 * n'existe pas déjà une inscription active (status=registered) pour
 * éviter les doublons. Retourne 409 Conflict si déjà inscrit.
 *
 * @body {string} externalEventId - Identifiant unique de l'événement externe
 * @body {string} eventTitle      - Titre de l'événement (pour affichage)
 * @body {string} eventDate       - Date de l'événement (pour affichage)
 * @body {string} eventLocation   - Lieu de l'événement (pour affichage)
 */
export const registerForExternalEvent = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const user = await getUserByFirebaseUid(firebaseUid);
    if (!user) return res.status(404).json({ message: 'User not found in database' });

    const { externalEventId, eventTitle, eventDate, eventLocation } = req.body;
    if (!externalEventId || !eventTitle || !eventDate || !eventLocation) {
      return res.status(400).json({ message: 'Missing required fields: externalEventId, eventTitle, eventDate, eventLocation' });
    }

    const existing = await firebaseDb
      .collection('externalRegistrations')
      .where('userId', '==', firebaseUid)
      .where('externalEventId', '==', externalEventId)
      .where('status', '==', 'registered')
      .limit(1)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0];
      return res.status(409).json({ message: 'Already registered for this event', registration: { id: doc.id, ...doc.data() } });
    }

    const ref = await firebaseDb.collection('externalRegistrations').add({
      userId: firebaseUid,
      externalEventId,
      eventTitle,
      eventDate,
      eventLocation,
      status: 'registered',
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    const data = snap.data()!;

    return res.status(201).json({
      message: 'Successfully registered for external event',
      registration: { id: ref.id, ...data, userId: { id: user._id, name: user.name, firstName: user.firstName, lastName: user.lastName, email: user.email } },
    });
  } catch (error: any) {
    console.error('registerForExternalEvent error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * DELETE /external-registrations/:externalEventId
 * Annule l'inscription de l'utilisateur à un événement externe.
 * Ne supprime pas le document mais passe son statut à « cancelled »
 * pour conserver l'historique d'inscription.
 *
 * @param {string} externalEventId - Identifiant de l'événement externe
 */
export const cancelExternalEventRegistration = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const user = await getUserByFirebaseUid(firebaseUid);
    if (!user) return res.status(404).json({ message: 'User not found in database' });

    const { externalEventId } = req.params;
    const snap = await firebaseDb
      .collection('externalRegistrations')
      .where('userId', '==', firebaseUid)
      .where('externalEventId', '==', externalEventId)
      .where('status', '==', 'registered')
      .limit(1)
      .get();

    if (snap.empty) return res.status(404).json({ message: 'Registration not found or already cancelled' });

    await snap.docs[0].ref.update({ status: 'cancelled', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return res.status(200).json({ message: 'Registration cancelled successfully', registration: { id: snap.docs[0].id, status: 'cancelled' } });
  } catch (error: any) {
    console.error('cancelExternalEventRegistration error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /external-registrations/:externalEventId/participants
 * Liste les utilisateurs EventHub inscrits à un événement externe.
 * Joint le profil utilisateur depuis la collection Firestore « users »
 * pour afficher les noms et emails des participants.
 *
 * @param {string} externalEventId - Identifiant de l'événement externe
 */
export const getExternalEventParticipants = async (req: Request, res: Response) => {
  try {
    const { externalEventId } = req.params;
    const snap = await firebaseDb
      .collection('externalRegistrations')
      .where('externalEventId', '==', externalEventId)
      .where('status', '==', 'registered')
      .get();

    const userIds = snap.docs.map((d) => d.data().userId).filter(Boolean);
    const userSnaps = await Promise.all(userIds.map((id) => firebaseDb.collection('users').doc(id).get()));
    const formattedParticipants = snap.docs.map((d, i) => {
      const data = d.data();
      const u = userSnaps[i]?.exists ? userSnaps[i].data() : null;
      return {
        id: d.id,
        user: u ? { id: data.userId, name: u.name, firstName: u.firstName, lastName: u.lastName, email: u.email } : null,
        status: 'confirmed',
        registeredAt: toDate(data.registeredAt),
      };
    });

    return res.status(200).json({ participants: formattedParticipants, total: formattedParticipants.length });
  } catch (error: any) {
    console.error('getExternalEventParticipants error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /external-registrations/my
 * Retourne toutes les inscriptions actives de l'utilisateur connecté
 * aux événements externes. Utilisé par l'écran « Mes billets » pour
 * afficher à la fois les billets locaux et les inscriptions externes.
 */
export const getMyExternalRegistrations = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const user = await getUserByFirebaseUid(firebaseUid);
    if (!user) return res.status(404).json({ message: 'User not found in database' });

    const snap = await firebaseDb
      .collection('externalRegistrations')
      .where('userId', '==', firebaseUid)
      .where('status', '==', 'registered')
      .get();

    const registrations = snap.docs.map((d) => ({ id: d.id, ...d.data(), registeredAt: toDate(d.data().registeredAt) }));
    return res.status(200).json({ registrations, total: registrations.length });
  } catch (error: any) {
    console.error('getMyExternalRegistrations error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /external-registrations/:externalEventId/check
 * Vérifie si l'utilisateur connecté est déjà inscrit à un événement
 * externe donné. Retourne un booléen isRegistered et éventuellement
 * les détails de l'inscription. Permet au mobile d'afficher le bon
 * bouton (« S'inscrire » vs « Se désinscrire »).
 *
 * @param {string} externalEventId - Identifiant de l'événement externe
 */
export const checkExternalEventRegistration = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const user = await getUserByFirebaseUid(firebaseUid);
    if (!user) return res.status(404).json({ message: 'User not found in database' });

    const { externalEventId } = req.params;
    const snap = await firebaseDb
      .collection('externalRegistrations')
      .where('userId', '==', firebaseUid)
      .where('externalEventId', '==', externalEventId)
      .where('status', '==', 'registered')
      .limit(1)
      .get();

    const registration = snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
    return res.status(200).json({ isRegistered: !!registration, registration });
  } catch (error: any) {
    console.error('checkExternalEventRegistration error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
