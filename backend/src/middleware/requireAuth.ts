/**
 * @fileoverview Middleware d'authentification par token Firebase.
 * @description Vérifie la présence et la validité d'un token JWT Firebase
 * dans l'en-tête `Authorization: Bearer <token>`. Si le token est valide,
 * les informations de l'utilisateur (userId et rôle depuis Firestore) sont
 * ajoutées à `req.user`. En cas d'échec :
 * - Token manquant ou mal formaté → HTTP 401 (Missing Authorization header)
 * - Token trop court ou incomplet → HTTP 401 (Token appears incomplete)
 * - Token invalide ou expiré → HTTP 401 (Invalid token)
 * @module middleware/requireAuth
 */
import type { Request, Response, NextFunction } from 'express';
import { firebaseAuth, firebaseDb } from '../config/firebaseAdmin';

/**
 * Type représentant l'utilisateur authentifié attaché à la requête.
 * @property userId - L'identifiant Firebase de l'utilisateur
 * @property role - Le rôle de l'utilisateur récupéré depuis Firestore (optionnel)
 */
export type AuthUser = {
  userId: string;
  role?: string;
};

/**
 * Middleware d'authentification Firebase.
 * Extrait et vérifie le token Bearer de l'en-tête Authorization,
 * puis récupère le rôle de l'utilisateur depuis Firestore et l'attache à `req.user`.
 * @param req - La requête Express entrante
 * @param res - La réponse Express
 * @param next - La fonction next d'Express
 * @returns Appelle `next()` si authentifié, sinon renvoie HTTP 401
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing Authorization header' });
  }

  const token = header.slice('Bearer '.length).trim();
  
  // Debug: vérifier que le token est complet
  if (!token || token.length < 100) {
    console.error('Token seems too short:', token?.length, 'chars');
    return res.status(401).json({ message: 'Token appears incomplete' });
  }

  try {
    const decoded = await firebaseAuth.verifyIdToken(token, true);
    const firebaseUid = decoded.uid;

    const profileSnap = await firebaseDb.collection('users').doc(firebaseUid).get();
    const profileData = profileSnap.exists ? profileSnap.data() : undefined;
    const roleFromFirestore =
      profileData && typeof profileData.role === 'string' ? profileData.role : undefined;

    (req as Request & { user?: AuthUser }).user = {
      userId: firebaseUid,
      role: roleFromFirestore,
    };

    return next();
  } catch (error: any) {
    console.error('Auth error:', error?.message);
    console.error('Token length:', token?.length);
    console.error('Token starts with:', token?.substring(0, 50));
    return res.status(401).json({ message: 'Invalid token', details: error?.message });
  }
};
