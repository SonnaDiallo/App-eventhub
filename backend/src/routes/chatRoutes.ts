/**
 * @fileoverview Routes de messagerie instantanée (chat).
 * @description Toutes les routes nécessitent une authentification.
 * Permet de gérer les conversations, envoyer et recevoir des messages,
 * marquer un message comme lu et supprimer des messages.
 *
 * Endpoints enregistrés :
 * - GET    /api/chat/conversations                      → Lister les conversations
 * - GET    /api/chat/conversations/:userId/messages      → Messages d'une conversation
 * - POST   /api/chat/conversations/:userId/messages      → Envoyer un message
 * - PATCH  /api/chat/messages/:id/read                   → Marquer un message comme lu
 * - DELETE /api/chat/messages/:id                        → Supprimer un message
 * @module routes/chatRoutes
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import {
  getConversations,
  getMessages,
  sendMessage,
  markMessageRead,
  deleteMessage,
} from '../controllers/chatController';

const router = Router();

router.use(requireAuth);

router.get('/conversations', getConversations);
router.get('/conversations/:userId/messages', getMessages);
router.post('/conversations/:userId/messages', sendMessage);
router.patch('/messages/:id/read', markMessageRead);
router.delete('/messages/:id', deleteMessage);

export default router;
