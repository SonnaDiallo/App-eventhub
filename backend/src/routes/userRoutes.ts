import { Router } from 'express';
import { getAllUsers, updateUserRole, deleteUser } from '../controllers/userController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// Toutes les routes sont protégées : admin uniquement
router.get('/', requireAuth, requireRole(['admin']), getAllUsers);
router.patch('/:id/role', requireAuth, requireRole(['admin']), updateUserRole);
router.delete('/:id', requireAuth, requireRole(['admin']), deleteUser);

export default router;
