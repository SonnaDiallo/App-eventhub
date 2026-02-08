import type { Request, Response } from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import { MAX_IMAGE_SIZE, ALLOWED_IMAGE_FORMATS } from '../types/categories';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

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
