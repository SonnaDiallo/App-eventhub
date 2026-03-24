/**
 * @fileoverview Routes d'administration de la plateforme.
 * @description Toutes les routes de ce module nécessitent une authentification
 * et le rôle `admin`. Elles permettent de gérer le tableau de bord,
 * les événements et les avis depuis le panneau d'administration.
 *
 * Endpoints enregistrés :
 * - GET    /api/admin/stats          → Statistiques du tableau de bord
 * - GET    /api/admin/events         → Liste des événements (vue admin)
 * - DELETE /api/admin/events/:id     → Supprimer un événement
 * - GET    /api/admin/reviews        → Liste des avis (vue admin)
 * - DELETE /api/admin/reviews/:id    → Supprimer un avis
 * @module routes/adminRoutes
 */
import { Router } from 'express';
import { getDashboardStats, getAdminEvents, deleteAdminEvent, getAdminReviews, deleteAdminReview } from '../controllers/adminController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(requireAuth, requireRole(['admin']));

router.get('/stats', getDashboardStats);
router.get('/events', getAdminEvents);
router.delete('/events/:id', deleteAdminEvent);
router.get('/reviews', getAdminReviews);
router.delete('/reviews/:id', deleteAdminReview);

export default router;
