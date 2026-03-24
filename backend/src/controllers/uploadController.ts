/**
 * @module uploadController
 * @description Contrôleur d'upload d'images pour les événements.
 *
 * Reçoit une image encodée en base64, la valide (format autorisé,
 * taille maximale), la décode et la sauvegarde sur le système de
 * fichiers local dans public/images/events/. Retourne l'URL publique
 * de l'image pour stockage dans le document événement.
 *
 * Ce choix de stockage local (vs cloud storage) est volontaire pour
 * simplifier le déploiement en développement. En production, il
 * faudrait migrer vers un bucket S3/GCS avec CDN.
 *
 * Routes gérées :
 * - POST /upload/event-image → uploadEventImage
 */
import type { Request, Response } from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import { MAX_IMAGE_SIZE, ALLOWED_IMAGE_FORMATS } from '../types/categories';

/** Correspondance MIME → extension de fichier pour le nommage sur disque. */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * POST /upload/event-image
 * Upload d'une image d'événement en base64. Valide le format MIME
 * (jpeg, png, webp uniquement), la taille (MAX_IMAGE_SIZE), puis
 * sauvegarde le fichier avec un nom unique (timestamp + UUID) dans
 * le répertoire public. Retourne l'URL absolue de l'image.
 *
 * @body {string} base64   - Image encodée en base64
 * @body {string} mimeType - Type MIME de l'image (image/jpeg, image/png, image/webp)
 * @returns {Object} url   - URL publique de l'image uploadée
 */
export const uploadEventImage = async (req: Request, res: Response) => {
  try {
    const { base64, mimeType } = req.body as { base64?: string; mimeType?: string };

    if (!base64 || typeof base64 !== 'string') {
      return res.status(400).json({ message: 'base64 is required' });
    }

    if (!mimeType || typeof mimeType !== 'string') {
      return res.status(400).json({ message: 'mimeType is required' });
    }

    if (!ALLOWED_IMAGE_FORMATS.includes(mimeType)) {
      return res.status(400).json({
        message: `Format d'image non autorisé. Formats acceptés: ${ALLOWED_IMAGE_FORMATS.join(', ')}`,
        error: 'Invalid image format',
        allowedFormats: ALLOWED_IMAGE_FORMATS,
      });
    }

    const ext = MIME_TO_EXT[mimeType] || 'jpg';

    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64, 'base64');
    } catch {
      return res.status(400).json({ message: 'Invalid base64' });
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ message: 'Invalid base64' });
    }

    if (buffer.length > MAX_IMAGE_SIZE) {
      const maxSizeMB = MAX_IMAGE_SIZE / (1024 * 1024);
      return res.status(400).json({
        message: `L'image est trop lourde. Taille maximale: ${maxSizeMB} MB`,
        error: 'Image too large',
        maxSize: MAX_IMAGE_SIZE,
        currentSize: buffer.length,
      });
    }

    const publicDir = path.join(__dirname, '../../public');
    const eventsDir = path.join(publicDir, 'images', 'events');
    await fs.mkdir(eventsDir, { recursive: true });

    const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const filePath = path.join(eventsDir, filename);

    await fs.writeFile(filePath, buffer);

    const protocol = req.protocol;
    const host = req.get('host');
    const url = `${protocol}://${host}/images/events/${filename}`;

    return res.status(201).json({ url });
  } catch (error: any) {
    console.error('Upload event image error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error?.message });
  }
};
