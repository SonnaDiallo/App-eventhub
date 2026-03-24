/**
 * @fileoverview Routes d'inscription aux événements externes.
 * @description Toutes les routes nécessitent une authentification.
 * Permet aux utilisateurs de s'inscrire, se désinscrire et consulter
 * leurs inscriptions aux événements provenant de sources externes
 * (Ticketmaster, etc.).
 *
 * Endpoints enregistrés :
 * - POST   /api/external-registrations/register                              → S'inscrire à un événement externe
 * - DELETE /api/external-registrations/:externalEventId/register             → Annuler l'inscription
 * - GET    /api/external-registrations/:externalEventId/participants         → Participants d'un événement externe
 * - GET    /api/external-registrations/my-registrations                      → Mes inscriptions externes
 * - GET    /api/external-registrations/:externalEventId/check-registration   → Vérifier mon inscription
 * @module routes/externalRegistrationRoutes
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import {
  registerForExternalEvent,
  cancelExternalEventRegistration,
  getExternalEventParticipants,
  getMyExternalRegistrations,
  checkExternalEventRegistration,
} from '../controllers/externalRegistrationController';

const router = Router();

router.use(requireAuth);

router.post('/register', registerForExternalEvent);
router.delete('/:externalEventId/register', cancelExternalEventRegistration);
router.get('/:externalEventId/participants', getExternalEventParticipants);
router.get('/my-registrations', getMyExternalRegistrations);
router.get('/:externalEventId/check-registration', checkExternalEventRegistration);

export default router;
