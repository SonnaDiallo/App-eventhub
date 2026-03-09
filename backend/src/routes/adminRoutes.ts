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
