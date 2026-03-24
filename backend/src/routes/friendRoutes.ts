/**
 * @fileoverview Routes de gestion des amis et demandes d'amitié.
 * @description Toutes les routes nécessitent une authentification.
 * Permet d'envoyer, recevoir, accepter ou refuser des demandes d'amitié,
 * ainsi que de consulter la liste de ses amis.
 *
 * Endpoints enregistrés :
 * - POST /api/friends/request              → Envoyer une demande d'amitié
 * - GET  /api/friends/requests             → Lister les demandes reçues
 * - POST /api/friends/requests/:id/accept  → Accepter une demande
 * - POST /api/friends/requests/:id/reject  → Refuser une demande
 * - GET  /api/friends                      → Lister ses amis
 * @module routes/friendRoutes
 */
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
