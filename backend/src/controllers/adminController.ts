/**
 * @module adminController
 * @description Contrôleur d'administration de la plateforme EventHub.
 *
 * Fournit les endpoints réservés aux administrateurs pour superviser
 * l'ensemble de la plateforme : tableau de bord statistique, gestion
 * des événements et modération des avis utilisateurs.
 *
 * Toutes les routes sont protégées par le middleware d'authentification
 * et le middleware de vérification du rôle « admin ».
 *
 * Routes gérées :
 * - GET    /admin/stats          → getDashboardStats
 * - GET    /admin/events         → getAdminEvents
 * - DELETE /admin/events/:id     → deleteAdminEvent
 * - GET    /admin/reviews        → getAdminReviews
 * - DELETE /admin/reviews/:id    → deleteAdminReview
 */
import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { firebaseDb } from '../config/firebaseAdmin';

const toDate = (v: admin.firestore.Timestamp | Date | undefined): Date | undefined =>
  !v ? undefined : v instanceof Date ? v : (v as admin.firestore.Timestamp).toDate?.() ?? undefined;

/**
 * GET /admin/stats
 * Agrège les statistiques globales pour le tableau de bord admin :
 * nombre total d'utilisateurs (ventilé par rôle), d'événements,
 * de billets et d'avis. Permet à l'administrateur d'avoir une
 * vue d'ensemble rapide de l'activité de la plateforme.
 *
 * @returns {Object} Statistiques groupées (users, events, tickets, reviews)
 */
export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const [usersSnap, eventsSnap, ticketsSnap, reviewsSnap] = await Promise.all([
      firebaseDb.collection('users').get(),
      firebaseDb.collection('events').get(),
      firebaseDb.collection('tickets').get(),
      firebaseDb.collection('reviews').get(),
    ]);

    const usersByRole: Record<string, number> = {};
    usersSnap.docs.forEach((doc) => {
      const role = (doc.data() as { role?: string }).role ?? 'user';
      usersByRole[role] = (usersByRole[role] ?? 0) + 1;
    });

    return res.status(200).json({
      users: {
        total: usersSnap.size,
        byRole: usersByRole,
      },
      events: { total: eventsSnap.size },
      tickets: { total: ticketsSnap.size },
      reviews: { total: reviewsSnap.size },
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Erreur lors du chargement des statistiques',
      error: error.message,
    });
  }
};

/**
 * GET /admin/events
 * Liste tous les événements de la plateforme avec pagination côté serveur.
 * Enrichit chaque événement avec le nombre réel de participants
 * (sous-collection Firestore) pour donner aux admins une vue
 * consolidée sans avoir à ouvrir chaque événement individuellement.
 *
 * @query {number} page  - Numéro de page (défaut 1)
 * @query {number} limit - Nombre d'éléments par page (défaut 20, max 50)
 */
export const getAdminEvents = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const offset = (page - 1) * limit;

    const snapshot = await firebaseDb
      .collection('events')
      .orderBy('createdAt', 'desc')
      .get();

    const total = snapshot.size;
    const docs = snapshot.docs.slice(offset, offset + limit);

    const events = await Promise.all(
      docs.map(async (docSnap) => {
        const data = docSnap.data();
        let participantsCount = 0;
        try {
          const participantsSnap = await firebaseDb
            .collection('events')
            .doc(docSnap.id)
            .collection('participants')
            .get();
          participantsCount = participantsSnap.size;
        } catch {
          // ignore
        }
        return {
          id: docSnap.id,
          title: data.title,
          coverImage: data.coverImage,
          category: data.category,
          startDate: toDate(data.startDate),
          endDate: toDate(data.endDate),
          location: data.location,
          isFree: data.isFree ?? true,
          price: data.price,
          capacity: data.capacity,
          organizerId: data.organizerId,
          organizerName: data.organizerName,
          participantsCount,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        };
      })
    );

    return res.status(200).json({
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Erreur lors du chargement des événements',
      error: error.message,
    });
  }
};

/**
 * DELETE /admin/events/:id
 * Supprime un événement et toutes ses données associées en cascade :
 * d'abord les participants (sous-collection), puis le document événement,
 * et enfin les billets liés. Le batch Firestore est découpé par tranches
 * de 500 pour respecter la limite d'écriture atomique de Firestore.
 *
 * @param {string} id - Identifiant Firestore de l'événement à supprimer
 */
export const deleteAdminEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const eventRef = firebaseDb.collection('events').doc(id);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    const batch = firebaseDb.batch();
    const participantsSnap = await eventRef.collection('participants').get();
    participantsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(eventRef);
    await batch.commit();

    const ticketsSnap = await firebaseDb.collection('tickets').where('eventId', '==', id).get();
    const BATCH_SIZE = 500;
    for (let i = 0; i < ticketsSnap.docs.length; i += BATCH_SIZE) {
      const b = firebaseDb.batch();
      ticketsSnap.docs.slice(i, i + BATCH_SIZE).forEach((d) => b.delete(d.ref));
      await b.commit();
    }

    return res.status(200).json({ message: 'Événement supprimé' });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Erreur lors de la suppression',
      error: error.message,
    });
  }
};

/**
 * GET /admin/reviews
 * Liste tous les avis de la plateforme avec pagination.
 * Joint le titre de l'événement concerné pour faciliter la
 * modération sans navigation supplémentaire.
 *
 * @query {number} page  - Numéro de page (défaut 1)
 * @query {number} limit - Nombre d'éléments par page (défaut 20, max 50)
 */
export const getAdminReviews = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const offset = (page - 1) * limit;

    const snapshot = await firebaseDb
      .collection('reviews')
      .orderBy('createdAt', 'desc')
      .get();

    const total = snapshot.size;
    const docs = snapshot.docs.slice(offset, offset + limit);

    const reviews = await Promise.all(
      docs.map(async (docSnap) => {
        const data = docSnap.data();
        let eventTitle = '';
        if (data.eventId) {
          const eventSnap = await firebaseDb.collection('events').doc(data.eventId).get();
          if (eventSnap.exists) eventTitle = eventSnap.data()?.title || '';
        }
        return {
          id: docSnap.id,
          eventId: data.eventId,
          eventTitle,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          rating: data.rating,
          comment: data.comment,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        };
      })
    );

    return res.status(200).json({
      reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Erreur lors du chargement des avis',
      error: error.message,
    });
  }
};

/**
 * DELETE /admin/reviews/:id
 * Supprime un avis signalé ou inapproprié.
 * Vérifie l'existence avant suppression afin de renvoyer
 * une 404 explicite si l'avis a déjà été supprimé.
 *
 * @param {string} id - Identifiant Firestore de l'avis à supprimer
 */
export const deleteAdminReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ref = firebaseDb.collection('reviews').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ message: 'Avis non trouvé' });
    }
    await ref.delete();
    return res.status(200).json({ message: 'Avis supprimé' });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Erreur lors de la suppression',
      error: error.message,
    });
  }
};
