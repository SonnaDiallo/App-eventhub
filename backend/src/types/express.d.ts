/**
 * @module types/express.d.ts
 * @description Augmentation du type Request d'Express pour y injecter l'utilisateur authentifié.
 *
 * Ce fichier de déclaration globale (ambient module) étend l'interface Request
 * d'Express avec la propriété `user`. Cela permet aux contrôleurs et middlewares
 * en aval d'accéder à req.user de manière typée après passage par le middleware
 * requireAuth, sans avoir à caster manuellement.
 *
 * @see ../middleware/requireAuth - Middleware qui peuple req.user
 */
import type { AuthUser } from '../middleware/requireAuth';

declare global {
  namespace Express {
    interface Request {
      /** Utilisateur authentifié, peuplé par le middleware requireAuth */
      user?: AuthUser;
    }
  }
}

export {};
