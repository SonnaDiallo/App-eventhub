import { Request, Response, NextFunction } from 'express';
import { MAX_IMAGE_SIZE, ALLOWED_IMAGE_FORMATS } from '../types/categories';

/**
 * Middleware pour valider la taille et le format d'une image
 * Vérifie si l'image est fournie via:
 * - req.body.coverImage (URL string)
 * - req.file (upload direct via multer)
 * - req.files (multiple files)
 */
export const validateImage = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Si l'image est fournie via URL (string)
    if (req.body.coverImage) {
      const imageUrl = req.body.coverImage;
      
      // Vérifier que c'est bien une URL valide
      if (typeof imageUrl !== 'string') {
        return res.status(400).json({
          message: 'L\'image doit être une URL valide',
          error: 'Invalid image format',
        });
      }

      // Vérifier que l'URL est valide
      try {
        new URL(imageUrl);
      } catch {
        return res.status(400).json({
          message: 'L\'URL de l\'image n\'est pas valide',
          error: 'Invalid image URL',
        });
      }

      // Pour les URLs, on ne peut pas vérifier la taille côté serveur
      // On fait confiance au client ou on peut ajouter une validation côté client
      return next();
    }

    // Si l'image est fournie via upload (multer)
    const file = (req as any).file || ((req as any).files && (req as any).files[0]);
    
    if (file) {
      // Vérifier le format
      if (!ALLOWED_IMAGE_FORMATS.includes(file.mimetype)) {
        return res.status(400).json({
          message: `Format d'image non autorisé. Formats acceptés: ${ALLOWED_IMAGE_FORMATS.join(', ')}`,
          error: 'Invalid image format',
          allowedFormats: ALLOWED_IMAGE_FORMATS,
        });
      }

      // Vérifier la taille
      if (file.size > MAX_IMAGE_SIZE) {
        const maxSizeMB = MAX_IMAGE_SIZE / (1024 * 1024);
        return res.status(400).json({
          message: `L'image est trop lourde. Taille maximale: ${maxSizeMB} MB`,
          error: 'Image too large',
          maxSize: MAX_IMAGE_SIZE,
          currentSize: file.size,
        });
      }
    }

    next();
  } catch (error: any) {
    return res.status(500).json({
      message: 'Erreur lors de la validation de l\'image',
      error: error?.message || 'Unknown error',
    });
  }
};

/**
 * Middleware pour valider une image URL (vérifie la taille via fetch)
 * Optionnel: peut être utilisé pour valider la taille d'une image distante
 */
export const validateImageUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const imageUrl = req.body.coverImage;
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      return next(); // Pas d'image fournie, on continue
    }

    try {
      // Faire une requête HEAD pour obtenir les headers sans télécharger l'image
      const response = await fetch(imageUrl, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');

      if (contentType && !ALLOWED_IMAGE_FORMATS.some(format => contentType.includes(format.split('/')[1]))) {
        return res.status(400).json({
          message: `Format d'image non autorisé. Formats acceptés: ${ALLOWED_IMAGE_FORMATS.join(', ')}`,
          error: 'Invalid image format',
        });
      }

      if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE) {
        const maxSizeMB = MAX_IMAGE_SIZE / (1024 * 1024);
        return res.status(400).json({
          message: `L'image est trop lourde. Taille maximale: ${maxSizeMB} MB`,
          error: 'Image too large',
          maxSize: MAX_IMAGE_SIZE,
          currentSize: parseInt(contentLength),
        });
      }
    } catch (fetchError) {
      // Si on ne peut pas vérifier (CORS, etc.), on accepte quand même
      // mais on log l'erreur
      console.warn('Impossible de valider la taille de l\'image URL:', fetchError);
    }

    next();
  } catch (error: any) {
    return res.status(500).json({
      message: 'Erreur lors de la validation de l\'image',
      error: error?.message || 'Unknown error',
    });
  }
};
