/**
 * @fileoverview Routes de gestion des billets (tickets).
 * @description Toutes les routes nécessitent une authentification.
 * Permet de consulter ses billets, vérifier un billet par code,
 * et accéder aux statistiques et à l'historique de scan (organisateurs uniquement).
 *
 * Endpoints enregistrés :
 * - GET  /api/tickets/my                         → Mes billets (pagination, filtres)
 * - GET  /api/tickets/code/:code                  → Récupérer un billet par code
 * - POST /api/tickets/verify/:code                → Vérifier/scanner un billet
 * - GET  /api/tickets/event/:eventId/stats        → Statistiques des billets (organisateur)
 * - GET  /api/tickets/event/:eventId/scans        → Historique de scan (organisateur)
 * @module routes/ticketRoutes
 */
import { Router } from 'express';
import { getMyTickets, getTicketByCode, verifyTicket, getEventTicketStats, getEventScanHistory } from '../controllers/ticketController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();
router.get('/my', requireAuth, getMyTickets); // GET /api/tickets/my?page=1&limit=20&eventId=xxx&checkedIn=true
router.get('/code/:code', requireAuth, getTicketByCode); // GET /api/tickets/code/ABC12345
router.post('/verify/:code', requireAuth, verifyTicket); // POST /api/tickets/verify/ABC12345
router.get('/event/:eventId/stats', requireAuth, requireRole('organizer'), getEventTicketStats); // GET /api/tickets/event/:eventId/stats
router.get('/event/:eventId/scans', requireAuth, requireRole('organizer'), getEventScanHistory); // GET /api/tickets/event/:eventId/scans?limit=50

export default router;
