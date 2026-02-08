import { Router } from 'express';
import { uploadEventImage } from '../controllers/uploadController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.post('/event-image', requireAuth, requireRole(['organizer', 'admin']), uploadEventImage);

export default router;
