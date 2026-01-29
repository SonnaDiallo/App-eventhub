import type { Request, Response, NextFunction } from 'express';

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
