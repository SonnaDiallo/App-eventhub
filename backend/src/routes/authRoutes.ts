/**
 * @fileoverview Routes d'authentification des utilisateurs.
 * @description Gère l'inscription, la connexion et la récupération du profil
 * de l'utilisateur courant. Les routes d'inscription et de connexion sont
 * protégées par un limiteur de débit (`authLimiter`) et des validateurs.
 *
 * Endpoints enregistrés :
 * - POST /api/auth/register  → Inscription (avec rate limit + validation)
 * - POST /api/auth/login     → Connexion (avec rate limit + validation)
 * - GET  /api/auth/me        → Profil de l'utilisateur authentifié
 * @module routes/authRoutes
 */
import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { requireAuth } from '../middleware/requireAuth';
import { authLimiter } from '../middleware/rateLimit';
import { registerValidators, loginValidators, handleValidationErrors } from '../middleware/validators';

const router = Router();

router.post('/register', authLimiter, registerValidators, handleValidationErrors, register);
router.post('/login', authLimiter, loginValidators, handleValidationErrors, login);
router.get('/me', requireAuth, getMe);

export default router;
