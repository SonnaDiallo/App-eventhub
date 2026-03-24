/**
 * @fileoverview Middlewares de validation des données entrantes.
 * @description Fournit des fonctions de validation et des middlewares Express
 * pour vérifier les données des requêtes avant leur traitement par les contrôleurs.
 * Comprend :
 * - Validation d'email et de mot de passe (fonctions utilitaires)
 * - Validation d'inscription (`validateRegistration`) : vérifie email, password, name
 * - Validation de connexion (`validateLogin`) : vérifie email, password
 * - Validation de création d'événement (`createEventValidators`) : vérifie title, location, date
 * - Validation du paramètre ID d'événement (`eventIdParam`)
 * En cas d'échec, renvoie HTTP 400 avec un message d'erreur descriptif.
 * @module middleware/validators
 */
import { Request, Response, NextFunction } from 'express';

/**
 * Valide le format d'une adresse email via une expression régulière.
 * @param email - L'adresse email à valider
 * @returns `true` si l'email est au format valide, `false` sinon
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valide qu'un mot de passe respecte la longueur minimale requise (6 caractères).
 * @param password - Le mot de passe à valider
 * @returns `true` si le mot de passe contient au moins 6 caractères, `false` sinon
 */
export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

/**
 * Middleware de validation des données d'inscription.
 * Vérifie la présence et le format de l'email, du mot de passe et du nom.
 * En cas d'échec, renvoie HTTP 400 avec le détail de l'erreur.
 * @param req - La requête Express contenant `email`, `password`, `name` dans le body
 * @param res - La réponse Express
 * @param next - La fonction next d'Express
 */
export const validateRegistration = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      message: 'Email, password, and name are required',
    });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format',
    });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long',
    });
  }

  next();
};

/**
 * Middleware de validation des données de connexion.
 * Vérifie la présence et le format de l'email et du mot de passe.
 * En cas d'échec, renvoie HTTP 400 avec le détail de l'erreur.
 * @param req - La requête Express contenant `email`, `password` dans le body
 * @param res - La réponse Express
 * @param next - La fonction next d'Express
 */
export const validateLogin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required',
    });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format',
    });
  }

  next();
};

/** Tableau de middlewares de validation pour la route d'inscription. */
export const registerValidators = [validateRegistration];
/** Tableau de middlewares de validation pour la route de connexion. */
export const loginValidators = [validateLogin];

/**
 * Tableau de middlewares de validation pour la création d'un événement.
 * Vérifie que le titre, la localisation et la date sont présents dans le body.
 */
export const createEventValidators = [
  // Validation basique pour la création d'événement
  (req: Request, res: Response, next: NextFunction) => {
    const { title, location, startDate, date } = req.body;

    if (!title || !location || (!startDate && !date)) {
      return res.status(400).json({
        success: false,
        message: 'Title, location, and date are required',
      });
    }

    next();
  }
];

/**
 * Middleware de validation du paramètre `id` d'événement dans l'URL.
 * Vérifie que le paramètre est présent. En cas d'absence, renvoie HTTP 400.
 * @param req - La requête Express contenant `id` dans les paramètres d'URL
 * @param res - La réponse Express
 * @param next - La fonction next d'Express
 */
export const eventIdParam = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Event ID is required',
    });
  }

  next();
};

/**
 * Middleware de gestion des erreurs de validation.
 * Emplacement réservé pouvant être étendu avec express-validator si nécessaire.
 * @param req - La requête Express
 * @param res - La réponse Express
 * @param next - La fonction next d'Express
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  // Placeholder pour gérer les erreurs de validation
  // Peut être étendu avec express-validator si nécessaire
  next();
};
