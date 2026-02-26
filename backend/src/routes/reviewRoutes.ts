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
