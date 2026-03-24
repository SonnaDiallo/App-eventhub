/**
 * @fileoverview Middleware de vérification des rôles utilisateur.
 * @description Vérifie que l'utilisateur authentifié (via `req.user.role`)
 * possède l'un des rôles autorisés. Doit être utilisé après le middleware
 * `requireAuth` qui peuple `req.user`. En cas d'échec :
 * - Rôle absent ou non autorisé → HTTP 403 (Forbidden) avec les rôles requis
 * @module middleware/requireRole
 */
import type { Request, Response, NextFunction } from 'express';

/**
 * Fabrique un middleware qui vérifie si l'utilisateur possède le rôle requis.
 * @param roles - Un rôle ou un tableau de rôles autorisés (ex: 'admin', ['organizer', 'admin'])
 * @returns Middleware Express qui appelle `next()` si le rôle correspond,
 *          sinon renvoie HTTP 403 avec les détails des rôles requis
 */
export const requireRole = (roles: string | string[]) => {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req as Request & { user?: { role?: string } }).user?.role;
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ 
        message: 'Forbidden',
        error: 'Insufficient permissions',
        requiredRoles: allowed,
        currentRole: role || 'none',
        hint: 'Vous devez avoir le rôle ' + allowed.join(' ou ') + ' pour effectuer cette action.'
      });
    }

    return next();
  };
};
