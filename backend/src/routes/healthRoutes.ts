/**
 * @fileoverview Route de vérification de l'état de santé du serveur (health check).
 * @description Route publique qui teste la connectivité avec Firestore et retourne
 * l'état du service. Utilisée pour le monitoring et les vérifications de disponibilité.
 *
 * Endpoints enregistrés :
 * - GET /api/health → État du serveur et de la connexion Firestore
 *   - HTTP 200 : Serveur opérationnel, Firestore connecté
 *   - HTTP 500 : Erreur de connexion à Firestore
 * @module routes/healthRoutes
 */
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
