import express from 'express';
import { downloadTicketPDF, downloadAllTicketsPDF } from '../controllers/ticketPdfController';
import { requireAuth } from '../middleware/requireAuth';

const router = express.Router();

// Routes protégées (nécessitent authentification)
router.get('/download/:ticketId', requireAuth, downloadTicketPDF);
router.get('/download-all', requireAuth, downloadAllTicketsPDF);

export default router;
