import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import {
  sendRequest,
  getIncomingRequests,
  acceptRequest,
  rejectRequest,
  getFriends,
} from '../controllers/friendsController';

const router = Router();

router.use(requireAuth);

router.post('/request', sendRequest);
router.get('/requests', getIncomingRequests);
router.post('/requests/:id/accept', acceptRequest);
router.post('/requests/:id/reject', rejectRequest);
router.get('/', getFriends);

export default router;
