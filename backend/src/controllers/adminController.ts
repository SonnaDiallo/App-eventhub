import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { firebaseDb } from '../config/firebaseAdmin';

const toDate = (v: admin.firestore.Timestamp | Date | undefined): Date | undefined =>
  !v ? undefined : v instanceof Date ? v : (v as admin.firestore.Timestamp).toDate?.() ?? undefined;

/** Statistiques dashboard admin (utilisateurs, événements, billets, etc.) */
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

/** Liste tous les événements (admin) avec pagination */
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

/** Supprimer un événement (admin) + participants et billets associés */
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

/** Liste tous les avis (admin) avec pagination */
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

/** Supprimer un avis (admin) */
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
