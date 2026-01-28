import type { AuthUser } from '../middleware/requireAuth';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
