/**
 * @fileoverview Routes de téléversement (upload) de fichiers.
 * @description Permet aux organisateurs et administrateurs de téléverser
 * des images pour les événements. Nécessite une authentification et le rôle
 * `organizer` ou `admin`.
 *
 * Endpoints enregistrés :
 * - POST /api/upload/event-image → Téléverser une image d'événement (organisateur/admin)
 * @module routes/uploadRoutes
 */
import { Router } from 'express';
import { uploadEventImage } from '../controllers/uploadController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.post('/event-image', requireAuth, requireRole(['organizer', 'admin']), uploadEventImage);

export default router;
