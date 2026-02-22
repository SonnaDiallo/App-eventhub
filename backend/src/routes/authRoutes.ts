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
