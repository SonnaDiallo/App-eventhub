import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { firebaseDb } from '../config/firebaseAdmin';
import { EventCategory, isValidCategory } from '../types/categories';
import { getCategoryDefaultImage, detectCategoryFromTitle } from '../services/categoryService';
import { fetchTicketmasterEvents } from '../services/externalEventsService';
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

    // Vérifier que l'id est un ObjectId MongoDB valide (24 caractères hex)
    if (!mongoose.Types.ObjectId.isValid(eventId) || String(eventId).length !== 24) {
      return res.status(404).json({
        message: 'Event not found',
        error: 'Invalid event id format. Participants are only available for events created on the platform (MongoDB).',
      });
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
        id: user?._id?.toString() || participation._id.toString(),
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
  } catch (error: any) {
    console.error('Get participants error:', error?.message || error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error?.message || 'Unknown error',
    });
  }
};

// Récupérer tous les événements avec pagination et filtres
export const getEvents = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      category,
      isFree,
      location,
      search,
      organizerId,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Construire la requête MongoDB
    const query: any = {};

    if (category && isValidCategory(category as string)) {
      query.category = category;
    }

    if (isFree !== undefined) {
      query.isFree = isFree === 'true';
    }

    if (location) {
      query.location = { $regex: location as string, $options: 'i' };
    }

    if (organizerId) {
      query.organizerId = new mongoose.Types.ObjectId(organizerId as string);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search as string, $options: 'i' } },
        { description: { $regex: search as string, $options: 'i' } },
        { location: { $regex: search as string, $options: 'i' } },
      ];
    }

    // Filtrer les événements passés (optionnel, peut être ajouté via query param)
    if (req.query.upcoming === 'true') {
      query.startDate = { $gte: new Date() };
    }

    // Récupérer les événements depuis MongoDB
    const events = await Event.find(query)
      .populate('organizerId', 'name email firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Event.countDocuments(query);

    const eventsData = events.map((event: any) => ({
      id: event._id.toString(),
      title: event.title,
      coverImage: event.coverImage,
      category: event.category,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      description: event.description,
      isFree: event.isFree,
      price: event.price,
      capacity: event.capacity,
      organizerName: event.organizerName,
      organizer: event.organizerId
        ? {
            id: event.organizerId._id.toString(),
            name: event.organizerId.name || `${event.organizerId.firstName || ''} ${event.organizerId.lastName || ''}`.trim(),
            email: event.organizerId.email,
          }
        : null,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      source: 'local',
    }));

    // Inclure les événements externes si demandé
    let externalEvents: any[] = [];
    if (req.query.includeExternal === 'true' && process.env.TICKETMASTER_API_KEY) {
      try {
        const externalLocation = (location as string) || 'Paris,France';
        const externalCategory = category as string | undefined;
        const externalSearch = search as string | undefined;
        
        const ticketmasterEvents = await fetchTicketmasterEvents(externalLocation, externalCategory);
        
        // Filtrer par recherche si fourni
        let filteredExternal = ticketmasterEvents;
        if (externalSearch) {
          const searchLower = externalSearch.toLowerCase();
          filteredExternal = ticketmasterEvents.filter(event =>
            event.title.toLowerCase().includes(searchLower) ||
            event.description?.toLowerCase().includes(searchLower) ||
            event.location.toLowerCase().includes(searchLower)
          );
        }

        externalEvents = filteredExternal.slice(0, limitNum).map(event => ({
          id: `external_${event.id}`,
          title: event.title,
          coverImage: event.coverImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
          category: event.category,
          startDate: event.startDate,
          endDate: event.endDate,
          location: event.location,
          description: event.description?.substring(0, 300),
          isFree: event.isFree,
          price: event.price,
          organizerName: event.venueName || 'Organisateur externe',
          organizer: null,
          source: 'ticketmaster',
          externalId: event.id,
        }));
      } catch (error: any) {
        console.error('Error fetching external events:', error.message);
        // Continuer même si les événements externes échouent
      }
    }

    // Combiner les événements (locaux en premier)
    const allEvents = [...eventsData, ...externalEvents];

    return res.status(200).json({
      events: allEvents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total + externalEvents.length,
        pages: Math.ceil((total + externalEvents.length) / limitNum),
      },
      sources: {
        local: eventsData.length,
        external: externalEvents.length,
      },
    });
  } catch (error: any) {
    console.error('Get events error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Récupérer un événement spécifique
export const getEventById = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;

    if (!eventId) {
      return res.status(400).json({ message: 'Invalid event id' });
    }

    // Récupérer l'événement depuis MongoDB
    const event = await Event.findById(eventId).populate('organizerId', 'name email firstName lastName');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Récupérer le nombre de participants
    const participantsCount = await EventParticipation.countDocuments({
      event: event._id,
      status: 'confirmed',
    });

    const eventData: any = {
      id: event._id.toString(),
      title: event.title,
      coverImage: event.coverImage,
      category: event.category,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      description: event.description,
      isFree: event.isFree,
      price: event.price,
      capacity: event.capacity,
      organizerName: event.organizerName,
      organizer: event.organizerId
        ? {
            id: event.organizerId._id.toString(),
            name: event.organizerId.name || `${event.organizerId.firstName || ''} ${event.organizerId.lastName || ''}`.trim(),
            email: event.organizerId.email,
          }
        : null,
      participantsCount,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };

    return res.status(200).json({ event: eventData });
  } catch (error: any) {
    console.error('Get event by id error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Mettre à jour un événement
export const updateEvent = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Récupérer l'événement depuis MongoDB
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Vérifier que l'utilisateur est l'organisateur
    const mongoUser = await getUserByFirebaseUid(userId);
    if (!mongoUser || event.organizerId.toString() !== mongoUser._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You are not the organizer of this event' });
    }

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

    // Valider la catégorie si fournie
    let eventCategory: string | undefined;
    if (category) {
      if (isValidCategory(category)) {
        eventCategory = category;
      } else {
        return res.status(400).json({
          message: 'Catégorie invalide',
          error: 'Invalid category',
          validCategories: Object.values(EventCategory),
        });
      }
    }

    // Construire l'objet de mise à jour
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (location !== undefined) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    if (isFree !== undefined) updateData.isFree = isFree;
    if (price !== undefined) updateData.price = price;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (organizerName !== undefined) updateData.organizerName = organizerName;
    if (eventCategory !== undefined) updateData.category = eventCategory;

    updateData.updatedAt = new Date();

    // Mettre à jour dans MongoDB
    const updatedEvent = await Event.findByIdAndUpdate(eventId, updateData, { new: true });

    // Synchroniser avec Firestore
    try {
      await firebaseDb.collection('events').doc(eventId).update({
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (firestoreError) {
      console.error('⚠️ Failed to sync event update to Firestore (continuing anyway):', firestoreError);
    }

    return res.status(200).json({
      event: {
        id: updatedEvent!._id.toString(),
        ...updateData,
        createdAt: updatedEvent!.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Update event error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Supprimer un événement
export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Récupérer l'événement depuis MongoDB
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Vérifier que l'utilisateur est l'organisateur
    const mongoUser = await getUserByFirebaseUid(userId);
    if (!mongoUser || event.organizerId.toString() !== mongoUser._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You are not the organizer of this event' });
    }

    // Supprimer les participations associées
    await EventParticipation.deleteMany({ event: event._id });

    // Supprimer les tickets associés
    await Ticket.deleteMany({ eventId: eventId });

    // Supprimer l'événement de MongoDB
    await Event.findByIdAndDelete(eventId);

    // Supprimer de Firestore
    try {
      await firebaseDb.collection('events').doc(eventId).delete();
    } catch (firestoreError) {
      console.error('⚠️ Failed to delete event from Firestore (continuing anyway):', firestoreError);
    }

    return res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('Delete event error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Récupérer les événements de l'organisateur connecté
export const getMyEvents = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const mongoUser = await getUserByFirebaseUid(userId);
    if (!mongoUser) {
      return res.status(404).json({ message: 'User not found in database' });
    }

    const {
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Récupérer les événements de l'organisateur
    const events = await Event.find({ organizerId: mongoUser._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Event.countDocuments({ organizerId: mongoUser._id });

    // Pour chaque événement, récupérer le nombre de participants
    const eventsWithStats = await Promise.all(
      events.map(async (event: any) => {
        const participantsCount = await EventParticipation.countDocuments({
          event: event._id,
          status: 'confirmed',
        });

        return {
          id: event._id.toString(),
          title: event.title,
          coverImage: event.coverImage,
          category: event.category,
          startDate: event.startDate,
          endDate: event.endDate,
          location: event.location,
          description: event.description,
          isFree: event.isFree,
          price: event.price,
          capacity: event.capacity,
          organizerName: event.organizerName,
          participantsCount,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        };
      })
    );

    return res.status(200).json({
      events: eventsWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get my events error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
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

