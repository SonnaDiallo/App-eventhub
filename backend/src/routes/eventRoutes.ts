import { Router } from 'express';
import { 
  createEvent, 
  getEvents, 
  getEventById, 
  updateEvent, 
  deleteEvent,
  getMyEvents,
  getParticipants, 
  joinEvent, 
  verifyToken 
} from '../controllers/eventController';
import { syncExternalEvents, deleteParisOpenDataEvents, debugEvents, getTicketmasterEventsByCategory, getExternalEvents } from '../controllers/externalEventsController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { validateImage } from '../middleware/imageValidation';

const router = Router();

// Routes publiques
router.get('/', getEvents); // GET /api/events?page=1&limit=20&category=music&search=concert
router.get('/external', getExternalEvents); // GET /api/events/external?location=Paris,France&category=music&page=1&limit=20&search=concert
router.get('/organizer/my', requireAuth, requireRole(['organizer', 'admin']), getMyEvents); // GET /api/events/organizer/my
router.get('/:id', getEventById); // GET /api/events/:id
router.get('/:id/participants', getParticipants); // GET /api/events/:id/participants

// Routes protégées
// Permettre aux organisateurs ET aux admins de créer/modifier/supprimer des événements
router.post('/', requireAuth, requireRole(['organizer', 'admin']), validateImage, createEvent); // POST /api/events
router.put('/:id', requireAuth, requireRole(['organizer', 'admin']), updateEvent); // PUT /api/events/:id
router.delete('/:id', requireAuth, requireRole(['organizer', 'admin']), deleteEvent); // DELETE /api/events/:id
router.post('/:id/join', requireAuth, joinEvent); // POST /api/events/:id/join

// Vérifier le token JWT de l'utilisateur
router.get('/verify-token', requireAuth, verifyToken);

// Debug: Vérifier la configuration et les événements en base
router.get('/debug', debugEvents);

// Importer / synchroniser des événements externes depuis Ticketmaster API
// Nécessite TICKETMASTER_API_KEY dans le fichier .env
// Les images sont récupérées depuis Ticketmaster ou Unsplash (si UNSPLASH_ACCESS_KEY est configuré)
// Query params optionnels: 
//   ?location=Paris,France (par défaut: Paris,France)
//   &category=music (catégorie: music, sports, arts, etc.)
router.post('/sync/external', requireAuth, requireRole('organizer'), syncExternalEvents);

// Supprimer les anciens événements de Paris Open Data
router.delete('/cleanup/paris-opendata', requireAuth, requireRole('organizer'), deleteParisOpenDataEvents);

// Récupérer les événements Ticketmaster par catégorie (sans les sauvegarder)
// GET /api/events/ticketmaster/:category?location=Paris,France
// Exemples: /api/events/ticketmaster/music, /api/events/ticketmaster/sports
// Note: Route publique pour faciliter les tests (pas de requireAuth)
router.get('/ticketmaster/:category', getTicketmasterEventsByCategory);

export default router;
