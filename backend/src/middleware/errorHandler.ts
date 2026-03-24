/**
 * @fileoverview Middleware de gestion centralisée des erreurs.
 * @description Intercepte toutes les erreurs non gérées dans l'application Express.
 * En cas d'erreur, renvoie une réponse JSON avec le code de statut approprié
 * et le message d'erreur. En mode développement, la pile d'appels (stack trace)
 * est également incluse dans la réponse.
 * @module middleware/errorHandler
 */
import { Request, Response, NextFunction } from 'express';

/**
 * Gestionnaire d'erreurs Express.
 * Capture les erreurs propagées via `next(err)` et retourne une réponse JSON structurée.
 * @param err - L'objet erreur contenant éventuellement `statusCode` et `message`
 * @param req - La requête Express entrante
 * @param res - La réponse Express
 * @param next - La fonction next d'Express
 * @returns Réponse JSON avec `success: false`, le message d'erreur, et le stack en dev
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
