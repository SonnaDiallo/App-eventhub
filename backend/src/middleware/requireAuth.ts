import type { Request, Response, NextFunction } from 'express';
import { firebaseAuth, firebaseDb } from '../config/firebaseAdmin';

export type AuthUser = {
  userId: string;
  role?: string;
};

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
