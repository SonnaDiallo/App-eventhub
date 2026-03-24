/**
 * @module reviewController
 * @description Contrôleur des avis utilisateurs sur les événements.
 *
 * Permet aux participants de laisser un avis (note 1-5 + commentaire)
 * sur un événement auquel ils ont assisté. Un utilisateur ne peut
 * laisser qu'un seul avis par événement (unicité userId+eventId).
 * Les avis sont modifiables et supprimables uniquement par leur auteur.
 *
 * Les statistiques d'avis (moyenne, distribution) sont calculées
 * à la volée plutôt que mises en cache, car le volume par événement
 * reste raisonnable.
 *
 * Routes gérées :
 * - POST   /reviews                         → createReview
 * - GET    /reviews/event/:eventId          → getEventReviews
 * - GET    /reviews/event/:eventId/stats    → getEventReviewStats
 * - GET    /reviews/event/:eventId/my       → getUserReview
 * - PUT    /reviews/:reviewId               → updateReview
 * - DELETE /reviews/:reviewId               → deleteReview
 */
import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { firebaseDb } from '../config/firebaseAdmin';
import { getUserByFirebaseUid } from '../services/userService';

const toDate = (v: admin.firestore.Timestamp | Date | undefined): Date | undefined =>
  !v ? undefined : v instanceof Date ? v : (v as admin.firestore.Timestamp).toDate?.() ?? undefined;

/**
 * POST /reviews
 * Crée un nouvel avis sur un événement. Vérifie que l'événement existe
 * et que l'utilisateur n'a pas déjà laissé un avis (un seul par événement).
 * La note doit être entre 1 et 5, le commentaire ne peut pas être vide.
 * Le nom de l'utilisateur est résolu depuis MongoDB pour l'affichage.
 *
 * @body {string} eventId  - Identifiant de l'événement
 * @body {number} rating   - Note de 1 à 5
 * @body {string} comment  - Texte du commentaire
 */
export const createReview = async (req: Request, res: Response) => {
  try {
    const { eventId, rating, comment } = req.body;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!eventId) return res.status(400).json({ message: 'Event ID is required' });
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ message: 'Comment is required' });
    }

    const user = await getUserByFirebaseUid(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const eventSnap = await firebaseDb.collection('events').doc(eventId).get();
    if (!eventSnap.exists) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const existingReviewSnap = await firebaseDb
      .collection('reviews')
      .where('eventId', '==', eventId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!existingReviewSnap.empty) {
      return res.status(400).json({ message: 'You have already reviewed this event' });
    }

    const userName = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Utilisateur';

    const reviewData = {
      eventId,
      userId,
      userName,
      userAvatar: user.avatar || null,
      rating: Number(rating),
      comment: comment.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const reviewRef = await firebaseDb.collection('reviews').add(reviewData);

    return res.status(201).json({
      message: 'Review created successfully',
      review: {
        id: reviewRef.id,
        ...reviewData,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error('Create review error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /reviews/event/:eventId
 * Liste les avis d'un événement avec pagination. Triés du plus récent
 * au plus ancien. La pagination est gérée en mémoire après récupération
 * de tous les avis (acceptable car le volume par événement est faible).
 *
 * @param {string} eventId    - Identifiant de l'événement
 * @query {number} [page=1]   - Numéro de page
 * @query {number} [limit=10] - Éléments par page (max 50)
 */
export const getEventReviews = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { page = '1', limit = '10' } = req.query;

    if (!eventId) return res.status(400).json({ message: 'Event ID is required' });

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 50);
    const skip = (pageNum - 1) * limitNum;

    const reviewsSnap = await firebaseDb
      .collection('reviews')
      .where('eventId', '==', eventId)
      .orderBy('createdAt', 'desc')
      .get();

    const allReviews = reviewsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        eventId: data.eventId,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        rating: data.rating,
        comment: data.comment,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      };
    });

    const total = allReviews.length;
    const paginatedReviews = allReviews.slice(skip, skip + limitNum);

    return res.status(200).json({
      reviews: paginatedReviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get event reviews error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /reviews/event/:eventId/stats
 * Calcule les statistiques d'avis d'un événement : note moyenne,
 * nombre total d'avis, et distribution par étoile (1 à 5).
 * Si aucun avis n'existe, retourne des valeurs à zéro.
 *
 * @param {string} eventId - Identifiant de l'événement
 */
export const getEventReviewStats = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    if (!eventId) return res.status(400).json({ message: 'Event ID is required' });

    const reviewsSnap = await firebaseDb.collection('reviews').where('eventId', '==', eventId).get();

    if (reviewsSnap.empty) {
      return res.status(200).json({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      });
    }

    const reviews = reviewsSnap.docs.map((doc) => doc.data());
    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    const averageRating = totalRating / totalReviews;

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      const rating = review.rating;
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating as keyof typeof ratingDistribution]++;
      }
    });

    return res.status(200).json({
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ratingDistribution,
    });
  } catch (error: any) {
    console.error('Get event review stats error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * PUT /reviews/:reviewId
 * Met à jour un avis existant. Seul l'auteur peut modifier son avis.
 * Les champs rating et comment sont optionnels (merge partiel).
 *
 * @param {string} reviewId  - Identifiant Firestore de l'avis
 * @body {number}  [rating]  - Nouvelle note (1-5)
 * @body {string}  [comment] - Nouveau commentaire
 */
export const updateReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!reviewId) return res.status(400).json({ message: 'Review ID is required' });

    const reviewSnap = await firebaseDb.collection('reviews').doc(reviewId).get();
    if (!reviewSnap.exists) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const reviewData = reviewSnap.data()!;
    if (reviewData.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden: You can only update your own reviews' });
    }

    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
      updateData.rating = Number(rating);
    }

    if (comment !== undefined) {
      if (comment.trim().length === 0) {
        return res.status(400).json({ message: 'Comment cannot be empty' });
      }
      updateData.comment = comment.trim();
    }

    await reviewSnap.ref.update(updateData);

    return res.status(200).json({
      message: 'Review updated successfully',
      review: {
        id: reviewId,
        ...reviewData,
        ...updateData,
        updatedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error('Update review error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * DELETE /reviews/:reviewId
 * Supprime définitivement un avis. Seul l'auteur peut supprimer
 * son propre avis. La suppression est physique (pas de soft-delete)
 * car les avis n'ont pas besoin d'historique de modération à ce niveau.
 *
 * @param {string} reviewId - Identifiant Firestore de l'avis
 */
export const deleteReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!reviewId) return res.status(400).json({ message: 'Review ID is required' });

    const reviewSnap = await firebaseDb.collection('reviews').doc(reviewId).get();
    if (!reviewSnap.exists) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const reviewData = reviewSnap.data()!;
    if (reviewData.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden: You can only delete your own reviews' });
    }

    await reviewSnap.ref.delete();

    return res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error: any) {
    console.error('Delete review error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /reviews/event/:eventId/my
 * Récupère l'avis de l'utilisateur connecté sur un événement donné.
 * Retourne 404 si l'utilisateur n'a pas encore laissé d'avis, ce qui
 * permet au mobile de savoir s'il doit afficher le formulaire de
 * création ou d'édition.
 *
 * @param {string} eventId - Identifiant de l'événement
 */
export const getUserReview = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!eventId) return res.status(400).json({ message: 'Event ID is required' });

    const reviewSnap = await firebaseDb
      .collection('reviews')
      .where('eventId', '==', eventId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (reviewSnap.empty) {
      return res.status(404).json({ message: 'No review found' });
    }

    const doc = reviewSnap.docs[0];
    const data = doc.data();

    return res.status(200).json({
      review: {
        id: doc.id,
        eventId: data.eventId,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        rating: data.rating,
        comment: data.comment,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      },
    });
  } catch (error: any) {
    console.error('Get user review error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
