/**
 * @fileoverview Routes de téléchargement des billets au format PDF.
 * @description Toutes les routes nécessitent une authentification.
 * Permet de télécharger un billet individuel ou tous les billets
 * de l'utilisateur au format PDF.
 *
 * Endpoints enregistrés :
 * - GET /api/ticket-pdf/download/:ticketId  → Télécharger un billet PDF (auth requise)
 * - GET /api/ticket-pdf/download-all        → Télécharger tous ses billets en PDF (auth requise)
 * @module routes/ticketPdfRoutes
 */
import express from 'express';
import { downloadTicketPDF, downloadAllTicketsPDF } from '../controllers/ticketPdfController';
import { requireAuth } from '../middleware/requireAuth';

const router = express.Router();

router.get('/download/:ticketId', requireAuth, downloadTicketPDF);
router.get('/download-all', requireAuth, downloadAllTicketsPDF);

export default router;
