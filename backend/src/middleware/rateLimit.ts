/**
 * @fileoverview Middleware de limitation du débit des requêtes (rate limiting).
 * @description Protège l'API contre les abus en limitant le nombre de requêtes
 * qu'une même adresse IP peut effectuer dans une fenêtre de temps donnée.
 * Deux limiteurs sont définis :
 * - `apiLimiter` : limite générale pour toutes les routes API (100 req / 15 min)
 * - `authLimiter` : limite stricte pour les routes d'authentification (5 req / 15 min)
 * En cas de dépassement, une réponse HTTP 429 est renvoyée automatiquement.
 * @module middleware/rateLimit
 */
import rateLimit from 'express-rate-limit';

/**
 * Limiteur de débit général pour les routes API.
 * Autorise un maximum de 100 requêtes par IP sur une fenêtre de 15 minutes.
 * En cas de dépassement, retourne HTTP 429 avec un message d'erreur.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Limiteur de débit pour les routes d'authentification (login/register).
 * Autorise un maximum de 5 tentatives par IP sur une fenêtre de 15 minutes.
 * En cas de dépassement, retourne HTTP 429 avec un message d'erreur.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: 'Too many login attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
