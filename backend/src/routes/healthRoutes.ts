// backend/src/routes/healthRoutes.ts
import { Router, Request, Response } from 'express';
import { firebaseDb } from '../config/firebaseAdmin';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    // Test Firestore connection
    await firebaseDb.collection('users').limit(1).get();
    
    return res.status(200).json({
      status: 'ok',
      firestore: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (err: any) {
    console.error('Health check failed:', err);
    return res.status(500).json({
      status: 'error',
      firestore: 'disconnected',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
