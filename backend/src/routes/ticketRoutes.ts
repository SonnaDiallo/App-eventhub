import { Router } from 'express';
import { getMyTickets, getTicketByCode, verifyTicket, getEventTicketStats } from '../controllers/ticketController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// Routes protégées
router.get('/my', requireAuth, getMyTickets); // GET /api/tickets/my?page=1&limit=20&eventId=xxx&checkedIn=true
router.get('/code/:code', requireAuth, getTicketByCode); // GET /api/tickets/code/ABC12345
router.post('/verify/:code', requireAuth, verifyTicket); // POST /api/tickets/verify/ABC12345
router.get('/event/:eventId/stats', requireAuth, requireRole('organizer'), getEventTicketStats); // GET /api/tickets/event/:eventId/stats

export default router;
