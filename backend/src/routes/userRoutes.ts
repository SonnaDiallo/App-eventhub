/**
 * @fileoverview Routes de gestion des utilisateurs (administration).
 * @description Toutes les routes nécessitent une authentification et le rôle `admin`.
 * Permet de consulter, modifier le rôle et supprimer des utilisateurs.
 *
 * Endpoints enregistrés :
 * - GET    /api/users              → Lister tous les utilisateurs
 * - PATCH  /api/users/:id/role     → Modifier le rôle d'un utilisateur
 * - DELETE /api/users/:id          → Supprimer un utilisateur
 * @module routes/userRoutes
 */
import { Router } from 'express';
import { getAllUsers, updateUserRole, deleteUser } from '../controllers/userController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();
router.get('/', requireAuth, requireRole(['admin']), getAllUsers);
router.patch('/:id/role', requireAuth, requireRole(['admin']), updateUserRole);
router.delete('/:id', requireAuth, requireRole(['admin']), deleteUser);

export default router;
