import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ExternalRegistration from '../models/ExternalRegistration';
import User from '../models/User';
import { getUserByFirebaseUid } from '../services/userService';

type AuthRequest = Request & { user?: { userId?: string } };

const getMongoUserId = (req: AuthRequest): string | null => {
  return (req as any).user?.userId ?? null;
};

/**
 * POST /api/external-events/register - S'inscrire à un événement externe
 */
export const registerForExternalEvent = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getMongoUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const mongoUser = await getUserByFirebaseUid(firebaseUid);
    if (!mongoUser) return res.status(404).json({ message: 'User not found in database' });

    const { externalEventId, eventTitle, eventDate, eventLocation } = req.body;

    if (!externalEventId || !eventTitle || !eventDate || !eventLocation) {
      return res.status(400).json({ 
        message: 'Missing required fields: externalEventId, eventTitle, eventDate, eventLocation' 
      });
    }

    // Vérifier si déjà inscrit
    const existing = await ExternalRegistration.findOne({
      userId: mongoUser._id,
      externalEventId,
      status: 'registered',
    });

    if (existing) {
      return res.status(409).json({ 
        message: 'Already registered for this event',
        registration: existing,
      });
    }

    // Créer l'inscription
    const registration = await ExternalRegistration.create({
      userId: mongoUser._id,
      externalEventId,
      eventTitle,
      eventDate,
      eventLocation,
      status: 'registered',
    });

    await registration.populate('userId', 'name firstName lastName email');

    return res.status(201).json({
      message: 'Successfully registered for external event',
      registration,
    });
  } catch (error: any) {
    console.error('registerForExternalEvent error:', error?.message);
    
    // Gérer les erreurs de doublon MongoDB
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: 'Already registered for this event' 
      });
    }
    
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * DELETE /api/external-events/:externalEventId/register - Annuler l'inscription
 */
export const cancelExternalEventRegistration = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getMongoUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const mongoUser = await getUserByFirebaseUid(firebaseUid);
    if (!mongoUser) return res.status(404).json({ message: 'User not found in database' });

    const { externalEventId } = req.params;

    const registration = await ExternalRegistration.findOneAndUpdate(
      {
        userId: mongoUser._id,
        externalEventId,
        status: 'registered',
      },
      {
        status: 'cancelled',
      },
      { new: true }
    );

    if (!registration) {
      return res.status(404).json({ 
        message: 'Registration not found or already cancelled' 
      });
    }

    return res.status(200).json({
      message: 'Registration cancelled successfully',
      registration,
    });
  } catch (error: any) {
    console.error('cancelExternalEventRegistration error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/external-events/:externalEventId/participants - Obtenir les participants d'un événement externe
 */
export const getExternalEventParticipants = async (req: Request, res: Response) => {
  try {
    const { externalEventId } = req.params;

    const participants = await ExternalRegistration.find({
      externalEventId,
      status: 'registered',
    })
      .populate('userId', 'name firstName lastName email')
      .sort({ registeredAt: -1 });

    const formattedParticipants = participants.map((p) => ({
      id: p._id.toString(),
      user: p.userId,
      status: 'confirmed',
      registeredAt: p.registeredAt,
    }));

    return res.status(200).json({
      participants: formattedParticipants,
      total: formattedParticipants.length,
    });
  } catch (error: any) {
    console.error('getExternalEventParticipants error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/external-events/my-registrations - Obtenir mes inscriptions aux événements externes
 */
export const getMyExternalRegistrations = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getMongoUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const mongoUser = await getUserByFirebaseUid(firebaseUid);
    if (!mongoUser) return res.status(404).json({ message: 'User not found in database' });

    const registrations = await ExternalRegistration.find({
      userId: mongoUser._id,
      status: 'registered',
    })
      .sort({ registeredAt: -1 });

    return res.status(200).json({
      registrations,
      total: registrations.length,
    });
  } catch (error: any) {
    console.error('getMyExternalRegistrations error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/external-events/:externalEventId/check-registration - Vérifier si l'utilisateur est inscrit
 */
export const checkExternalEventRegistration = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getMongoUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const mongoUser = await getUserByFirebaseUid(firebaseUid);
    if (!mongoUser) return res.status(404).json({ message: 'User not found in database' });

    const { externalEventId } = req.params;

    const registration = await ExternalRegistration.findOne({
      userId: mongoUser._id,
      externalEventId,
      status: 'registered',
    });

    return res.status(200).json({
      isRegistered: !!registration,
      registration,
    });
  } catch (error: any) {
    console.error('checkExternalEventRegistration error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
