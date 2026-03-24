/**
 * @fileoverview Routes de gestion des avis (reviews) sur les événements.
 * @description Permet de créer, consulter, modifier et supprimer des avis
 * sur les événements. Certaines routes sont publiques (consultation),
 * d'autres nécessitent une authentification (création, modification, suppression).
 *
 * Endpoints enregistrés :
 * - POST   /api/reviews                           → Créer un avis (auth requise)
 * - GET    /api/reviews/event/:eventId             → Avis d'un événement (public)
 * - GET    /api/reviews/event/:eventId/stats       → Statistiques des avis (public)
 * - GET    /api/reviews/event/:eventId/user        → Mon avis sur un événement (auth requise)
 * - PUT    /api/reviews/:reviewId                  → Modifier un avis (auth requise)
 * - DELETE /api/reviews/:reviewId                  → Supprimer un avis (auth requise)
 * @module routes/reviewRoutes
 */
import { Router } from 'express';
import {
  createReview,
  getEventReviews,
  getEventReviewStats,
  updateReview,
  deleteReview,
  getUserReview,
} from '../controllers/reviewController';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.post('/', requireAuth, createReview);
router.get('/event/:eventId', getEventReviews);
router.get('/event/:eventId/stats', getEventReviewStats);
router.get('/event/:eventId/user', requireAuth, getUserReview);
router.put('/:reviewId', requireAuth, updateReview);
router.delete('/:reviewId', requireAuth, deleteReview);

export default router;
