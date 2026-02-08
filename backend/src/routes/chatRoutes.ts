import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import {
  getConversations,
  getMessages,
  sendMessage,
  markMessageRead,
} from '../controllers/chatController';

const router = Router();

router.use(requireAuth);

router.get('/conversations', getConversations);
router.get('/conversations/:userId/messages', getMessages);
router.post('/conversations/:userId/messages', sendMessage);
router.patch('/messages/:id/read', markMessageRead);

export default router;
