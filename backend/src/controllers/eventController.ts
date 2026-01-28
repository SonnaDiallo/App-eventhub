import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { firebaseDb } from '../config/firebaseAdmin';
import { EventCategory, isValidCategory } from '../types/categories';
import { getCategoryDefaultImage, detectCategoryFromTitle } from '../services/categoryService';
import Event from '../models/Event';
import Ticket from '../models/Ticket';
import EventParticipation from '../models/EventParticipation';
import { getUserByFirebaseUid } from '../services/userService';
import mongoose from 'mongoose';

export const createEvent = async (req: Request, res: Response) => {
  try {
    const {
      title,
      coverImage,
      startDate,
      endDate,
      location,
      description,
      isFree,
      price,
      capacity,
      organizerName,
      category,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Valider la catégorie si fournie, sinon détecter depuis le titre
    let eventCategory: string;
    if (category && isValidCategory(category)) {
      eventCategory = category;
    } else if (category) {
      return res.status(400).json({ 
        message: 'Catégorie invalide',
        error: 'Invalid category',
        validCategories: Object.values(EventCategory),
      });
    } else {
      // Détecter automatiquement la catégorie depuis le titre
      eventCategory = detectCategoryFromTitle(title);
    }

    // Utiliser l'image fournie ou l'image par défaut de la catégorie
    const finalCoverImage = getCategoryDefaultImage(eventCategory, coverImage);

    // Récupérer l'utilisateur depuis MongoDB pour obtenir l'ObjectId
    const mongoUser = await getUserByFirebaseUid(userId);
    if (!mongoUser) {
      return res.status(404).json({ message: 'User not found in database' });
    }

    const payload = {
      title,
      coverImage: finalCoverImage,
      category: eventCategory,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      location: typeof location === 'string' ? location : undefined,
      description: typeof description === 'string' ? description : undefined,
      isFree: typeof isFree === 'boolean' ? isFree : true,
      price: typeof price === 'number' ? price : undefined,
      capacity: typeof capacity === 'number' ? capacity : undefined,
      organizerName: typeof organizerName === 'string' ? organizerName : undefined,
      organizerId: mongoUser._id,
    };

    // Sauvegarder dans MongoDB
    const event = new Event(payload);
    await event.save();

    // Synchroniser avec Firestore (pour compatibilité)
    try {
      await firebaseDb.collection('events').doc(event._id.toString()).set({
        ...payload,
        organizerUid: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (firestoreError) {
      console.error('⚠️ Failed to sync event to Firestore (continuing anyway):', firestoreError);
    }

    return res.status(201).json({ 
      event: { 
        id: event._id.toString(), 
        ...payload,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      } 
    });
  } catch (error) {
    console.error('Create event error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const joinEvent = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;

    if (!eventId) {
      return res.status(400).json({ message: 'Invalid event id' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Récupérer l'événement depuis MongoDB
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Récupérer l'utilisateur depuis MongoDB
    const mongoUser = await getUserByFirebaseUid(userId);
    if (!mongoUser) {
      return res.status(404).json({ message: 'User not found in database' });
    }

    const isFree = typeof event.isFree === 'boolean' ? event.isFree : true;
    const status = isFree ? 'confirmed' : 'pending_payment';

    // Créer ou mettre à jour la participation dans MongoDB
    const participation = await EventParticipation.findOneAndUpdate(
      { event: event._id, user: mongoUser._id },
      { status },
      { upsert: true, new: true }
    );

    // Synchroniser avec Firestore (pour compatibilité)
    try {
      const eventRef = firebaseDb.collection('events').doc(eventId);
      await eventRef.collection('participants').doc(userId).set(
        {
          status,
          userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (firestoreError) {
      console.error('⚠️ Failed to sync participation to Firestore (continuing anyway):', firestoreError);
    }

    return res.status(200).json({ 
      participation: { 
        eventId, 
        userId, 
        status,
        id: participation._id.toString(),
      } 
    });
  } catch (error: any) {
    console.error('Join event error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getParticipants = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const { status } = req.query;

    if (!eventId) {
      return res.status(400).json({ message: 'Invalid event id' });
    }

    // Récupérer l'événement depuis MongoDB
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Construire la requête MongoDB
    const query: any = { event: event._id };
    if (typeof status === 'string' && (status === 'confirmed' || status === 'pending_payment')) {
      query.status = status;
    }

    // Récupérer les participations depuis MongoDB
    const participations = await EventParticipation.find(query)
      .populate('user', 'name email role firstName lastName')
      .sort({ createdAt: -1 });

    const participants = participations.map((participation: any) => {
      const user = participation.user;
      return {
        id: participation.user._id.toString(),
        status: participation.status,
        user: user
          ? {
              id: user._id.toString(),
              name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: user.role,
            }
          : null,
        createdAt: participation.createdAt,
      };
    });

    const confirmed = participants.filter((p) => p.status === 'confirmed').length;
    const pending_payment = participants.filter((p) => p.status === 'pending_payment').length;

    return res.status(200).json({
      counts: {
        confirmed,
        pending_payment,
        total: confirmed + pending_payment,
      },
      participants,
    });
  } catch (error) {
    console.error('Get participants error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Vérifier le token JWT de l'utilisateur
export const verifyToken = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    const role = (req as Request & { user?: { role?: string } }).user?.role;
    
    if (!userId) {
      return res.status(401).json({ 
        message: 'Token invalide ou expiré',
        valid: false,
      });
    }

    // Récupérer les infos utilisateur depuis MongoDB (priorité) ou Firestore (fallback)
    let userData: any = null;
    try {
      const mongoUser = await getUserByFirebaseUid(userId);
      if (mongoUser) {
        userData = {
          id: mongoUser._id.toString(),
          email: mongoUser.email,
          name: mongoUser.name || `${mongoUser.firstName || ''} ${mongoUser.lastName || ''}`.trim(),
          firstName: mongoUser.firstName,
          lastName: mongoUser.lastName,
          role: mongoUser.role,
          canScanTickets: mongoUser.canScanTickets,
        };
      }
    } catch (mongoError) {
      console.error('⚠️ Failed to get user from MongoDB, falling back to Firestore:', mongoError);
    }

    // Fallback vers Firestore
    if (!userData) {
      const userSnap = await firebaseDb.collection('users').doc(userId).get();
      userData = userSnap.exists ? userSnap.data() : null;
    }

    return res.status(200).json({
      message: 'Token valide',
      valid: true,
      user: {
        id: userId,
        email: userData?.email,
        name: userData?.name,
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        role: role || userData?.role || 'participant',
        canScanTickets: userData?.canScanTickets || false,
      },
      permissions: {
        canSyncEvents: role === 'organizer',
        canCreateEvents: role === 'organizer',
        canViewEvents: true,
      },
    });
  } catch (error: any) {
    return res.status(401).json({ 
      message: 'Token invalide',
      valid: false,
      error: error?.message || 'Unknown error',
    });
  }
};

