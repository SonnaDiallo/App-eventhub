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

// Toutes les routes nécessitent une authentification
router.use(requireAuth);

// S'inscrire à un événement externe
router.post('/register', registerForExternalEvent);

// Annuler l'inscription à un événement externe
router.delete('/:externalEventId/register', cancelExternalEventRegistration);

// Obtenir les participants d'un événement externe
router.get('/:externalEventId/participants', getExternalEventParticipants);

// Obtenir mes inscriptions aux événements externes
router.get('/my-registrations', getMyExternalRegistrations);

// Vérifier si je suis inscrit à un événement externe
router.get('/:externalEventId/check-registration', checkExternalEventRegistration);

export default router;
