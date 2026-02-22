// backend/src/middleware/validators.ts
import { Request, Response, NextFunction } from 'express';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

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

// Export as arrays for use in routes
export const registerValidators = [validateRegistration];
export const loginValidators = [validateLogin];

export const createEventValidators = [
  // Validation basique pour la création d'événement
  (req: Request, res: Response, next: NextFunction) => {
    const { title, location, date } = req.body;

    if (!title || !location || !date) {
      return res.status(400).json({
        success: false,
        message: 'Title, location, and date are required',
      });
    }

    next();
  }
];

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

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  // Placeholder pour gérer les erreurs de validation
  // Peut être étendu avec express-validator si nécessaire
  next();
};
