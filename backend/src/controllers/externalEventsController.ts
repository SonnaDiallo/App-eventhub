import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { firebaseDb } from '../config/firebaseAdmin';
import { fetchTicketmasterEvents } from '../services/externalEventsService';
import { getImageFromUnsplash, getImageSearchQuery } from '../services/imageService';
import { UnifiedEvent } from '../types/externalEvents';
import { EventCategory } from '../types/categories';

/**
 * Synchronise les événements depuis Ticketmaster API
 */
export const syncExternalEvents = async (req: Request, res: Response) => {
  try {
    // Vérifier que Ticketmaster est configuré
    const hasTicketmaster = !!process.env.TICKETMASTER_API_KEY;
    
    if (!hasTicketmaster) {
      return res.status(400).json({ 
        message: 'TICKETMASTER_API_KEY est requise. Configurez-la dans votre fichier .env',
        error: 'Missing API key',
        ticketmaster: 'https://developer.ticketmaster.com/',
      });
    }
    
    const location = req.query.location as string || 'Paris,France';
    const category = req.query.category as string || '';
    
    console.log(`🔍 Recherche d'événements Ticketmaster à ${location}...`);
    
    // Récupérer les événements depuis Ticketmaster
    const allEvents = await fetchTicketmasterEvents(location, category);

    if (!allEvents.length) {
      return res.status(200).json({ 
        message: 'Aucun événement Ticketmaster trouvé', 
        imported: 0,
        source: 'ticketmaster',
      });
    }

    // Traiter et sauvegarder les événements
    const batch = firebaseDb.batch();
    let importedCount = 0;
    const now = new Date();
    const eventCounts: { [key: string]: number } = {};

    for (const event of allEvents) {
      // Dates - convertir en Timestamp Firestore
      let startDate: admin.firestore.Timestamp | undefined;
      let endDate: admin.firestore.Timestamp | undefined;
      
      if (event.startDate) {
        const start = new Date(event.startDate);
        // Filtrer seulement les événements futurs
        if (start >= now) {
          startDate = admin.firestore.Timestamp.fromDate(start);
        } else {
          continue; // Ignorer les événements passés
        }
      } else {
        continue; // Pas de date de début = skip
      }
      
      if (event.endDate) {
        endDate = admin.firestore.Timestamp.fromDate(new Date(event.endDate));
      }

      // Image : Priorité 1 = Image de l'API, Priorité 2 = Unsplash API, Priorité 3 = Image par défaut
      let coverImage: string | undefined = event.coverImage;
      
      // Si pas d'image, utiliser Unsplash API
      if (!coverImage) {
        const searchQuery = getImageSearchQuery(event.title);
        const unsplashImage = await getImageFromUnsplash(searchQuery);
        if (unsplashImage) {
          coverImage = unsplashImage;
        }
      }
      
      // Fallback vers une image par défaut
      if (!coverImage) {
        coverImage = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop';
      }

      // Nettoyer la description
      let description = event.description || '';
      if (description) {
        description = description
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&apos;/g, "'")
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 500);
      }

      // ID stable basé sur l'ID de l'événement et la source
      const externalId = `${event.source}_${event.id}`;
      const docRef = firebaseDb.collection('events').doc(externalId);

      // Construire l'objet
      const eventData: any = {
        title: event.title,
        location: event.location || 'Paris, France',
        description,
        isFree: typeof event.isFree === 'boolean' ? event.isFree : true,
        organizerName: event.venueName || 'Organisateur externe',
        organizerUid: null,
        source: event.source,
        externalRecordId: event.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Ajouter les champs optionnels
      if (coverImage) eventData.coverImage = coverImage;
      if (startDate) eventData.startDate = startDate;
      if (endDate) eventData.endDate = endDate;
      if (event.price !== undefined) eventData.price = event.price;
      // Ajouter la catégorie si elle a été détectée
      if (event.category) {
        eventData.category = event.category;
      }

      batch.set(docRef, eventData, { merge: true });
      importedCount += 1;
    }

    await batch.commit();

    return res.status(200).json({
      message: `Événements synchronisés avec succès depuis Ticketmaster`,
      imported: importedCount,
      source: 'ticketmaster',
    });
  } catch (error: any) {
    console.error('Sync external events error:', error?.message || error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      response: error?.response?.data,
      stack: error?.stack?.split('\n').slice(0, 5),
    });
    return res.status(500).json({ 
      message: 'Failed to sync external events',
      error: error?.message || 'Unknown error',
    });
  }
};

/**
 * Route de debug pour vérifier la configuration et les événements
 */
export const debugEvents = async (req: Request, res: Response) => {
  try {
    // Vérifier la clé API configurée
    const hasTicketmaster = !!process.env.TICKETMASTER_API_KEY;
    
    // Compter les événements dans Firestore
    const eventsSnapshot = await firebaseDb.collection('events').get();
    const totalEvents = eventsSnapshot.size;
    
    // Compter par source
    const eventsBySource: { [key: string]: number } = {};
    eventsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const source = data.source || 'unknown';
      eventsBySource[source] = (eventsBySource[source] || 0) + 1;
    });
    
    // Compter les événements futurs
    const now = new Date();
    let futureEvents = 0;
    eventsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.startDate) {
        const startDate = data.startDate.toDate();
        if (startDate >= now) {
          futureEvents++;
        }
      }
    });
    
    return res.status(200).json({
      api_configured: {
        ticketmaster: hasTicketmaster,
      },
      events_in_database: {
        total: totalEvents,
        by_source: eventsBySource,
        future_events: futureEvents,
      },
      message: hasTicketmaster 
        ? 'Ticketmaster API configurée. Utilisez POST /api/events/sync/external pour synchroniser.'
        : 'TICKETMASTER_API_KEY non configurée. Configurez-la dans .env',
    });
  } catch (error: any) {
    return res.status(500).json({ 
      message: 'Error checking configuration',
      error: error?.message || 'Unknown error',
    });
  }
};

/**
 * Récupère les événements externes depuis Ticketmaster (sans les sauvegarder)
 * Route publique pour récupérer les événements disponibles
 */
export const getExternalEvents = async (req: Request, res: Response) => {
  try {
    const ticketmasterApiKey = process.env.TICKETMASTER_API_KEY;
    
    if (!ticketmasterApiKey) {
      return res.status(400).json({
        message: 'TICKETMASTER_API_KEY non configurée dans .env',
        error: 'Missing API key',
        hint: 'Configurez TICKETMASTER_API_KEY dans votre fichier .env. Obtenez une clé sur https://developer.ticketmaster.com/',
      });
    }

    const {
      location = 'Paris,France',
      category,
      page = '1',
      limit = '20',
      search,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    console.log(`🔍 Recherche d'événements Ticketmaster à ${location}...`);

    // Récupérer les événements depuis Ticketmaster API
    const allEvents = await fetchTicketmasterEvents(
      location as string,
      category as string | undefined
    );

    // Si aucun événement trouvé, retourner un message informatif
    if (allEvents.length === 0) {
      return res.status(200).json({
        events: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          pages: 0,
        },
        filters: {
          location,
          category: category || 'all',
          search: search || null,
        },
        message: `Aucun événement trouvé pour ${location}. Essayez une autre localisation ou catégorie.`,
      });
    }

    // Filtrer par recherche si fourni
    let filteredEvents = allEvents;
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredEvents = allEvents.filter(event =>
        event.title.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower) ||
        event.location?.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

    return res.status(200).json({
      events: paginatedEvents.map(event => ({
        id: `external_${event.id}`,
        title: event.title,
        description: event.description?.substring(0, 300),
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        venueName: event.venueName,
        coverImage: event.coverImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
        isFree: event.isFree,
        price: event.price,
        category: event.category,
        source: 'ticketmaster',
        organizerName: event.venueName || 'Organisateur externe',
        externalId: event.id,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredEvents.length,
        pages: Math.ceil(filteredEvents.length / limitNum),
      },
      filters: {
        location,
        category: category || 'all',
        search: search || null,
      },
      message: `${filteredEvents.length} événement(s) trouvé(s)`,
    });
  } catch (error: any) {
    console.error('Get external events error:', error?.message || error);
    return res.status(500).json({
      message: 'Erreur lors de la récupération des événements',
      error: error?.message || 'Unknown error',
      hint: 'Vérifiez que TICKETMASTER_API_KEY est correcte et que l\'API Ticketmaster est accessible.',
    });
  }
};

/**
 * Récupère les événements Ticketmaster par catégorie (sans les sauvegarder)
 * Utile pour prévisualiser les événements disponibles
 */
export const getTicketmasterEventsByCategory = async (req: Request, res: Response) => {
  try {
    const category = req.params.category as EventCategory;
    const location = (req.query.location as string) || 'Paris,France';
    
    // Vérifier que la catégorie est valide
    if (!category || !Object.values(EventCategory).includes(category)) {
      return res.status(400).json({
        message: 'Catégorie invalide',
        validCategories: Object.values(EventCategory),
      });
    }

    const ticketmasterApiKey = process.env.TICKETMASTER_API_KEY;
    if (!ticketmasterApiKey) {
      return res.status(400).json({
        message: 'TICKETMASTER_API_KEY non configurée dans .env',
        error: 'Missing API key',
      });
    }

    console.log(`🔍 Recherche d'événements Ticketmaster pour la catégorie: ${category} à ${location}`);

    // Récupérer les événements depuis Ticketmaster avec la catégorie
    const events = await fetchTicketmasterEvents(location, category);

    // Si aucun événement, essayer sans catégorie pour voir s'il y a des événements à cette localisation
    let eventsWithoutCategory: UnifiedEvent[] = [];
    if (events.length === 0) {
      console.log(`⚠️ Aucun événement trouvé avec la catégorie ${category}, test sans catégorie...`);
      eventsWithoutCategory = await fetchTicketmasterEvents(location);
    }

    return res.status(200).json({
      message: events.length > 0 
        ? `Événements Ticketmaster trouvés pour la catégorie ${category}`
        : eventsWithoutCategory.length > 0
          ? `Aucun événement dans la catégorie ${category}, mais ${eventsWithoutCategory.length} événements trouvés sans filtre de catégorie`
          : `Aucun événement Ticketmaster trouvé pour ${location}`,
      category,
      location,
      count: events.length,
      events: events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description?.substring(0, 200),
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        venueName: event.venueName,
        coverImage: event.coverImage,
        isFree: event.isFree,
        price: event.price,
        category: event.category,
        source: event.source,
      })),
      // Informations de debug si aucun événement
      ...(events.length === 0 && {
        debug: {
          suggestion: eventsWithoutCategory.length > 0
            ? `Il y a ${eventsWithoutCategory.length} événements à ${location}, mais peut-être pas dans la catégorie ${category}. Essayez sans spécifier de catégorie.`
            : `Aucun événement trouvé pour ${location}. Le code a testé 3 méthodes : 1) city+countryCode, 2) geoPoint (coordonnées GPS), 3) sans filtre de date ni catégorie. Regardez la console du serveur pour voir la réponse complète de Ticketmaster.`,
          testWithoutCategory: eventsWithoutCategory.length,
          note: '⚠️ IMPORTANT : Regardez la console du serveur (où tourne npm run dev) pour voir :\n' +
                '- Les paramètres envoyés à Ticketmaster\n' +
                '- Le nombre d\'événements trouvés par chaque méthode\n' +
                '- La réponse complète avec totalElements, errors, etc.\n' +
                'Cela nous aidera à comprendre pourquoi aucun événement n\'est retourné.',
        },
      }),
    });
  } catch (error: any) {
    console.error('Get Ticketmaster events by category error:', error?.message || error);
    return res.status(500).json({
      message: 'Failed to fetch Ticketmaster events',
      error: error?.message || 'Unknown error',
    });
  }
};

/**
 * Supprime les anciens événements de Paris Open Data
 */
export const deleteParisOpenDataEvents = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('🗑️ Suppression des événements Paris Open Data...');
    
    // Récupérer tous les événements avec source 'paris_opendata'
    const eventsRef = firebaseDb.collection('events');
    const snapshot = await eventsRef.where('source', '==', 'paris_opendata').get();
    
    if (snapshot.empty) {
      return res.status(200).json({ 
        message: 'Aucun événement Paris Open Data trouvé',
        deleted: 0,
      });
    }

    const batch = firebaseDb.batch();
    let deletedCount = 0;

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    await batch.commit();

    console.log(`✅ ${deletedCount} événements Paris Open Data supprimés`);

    return res.status(200).json({
      message: `Événements Paris Open Data supprimés avec succès`,
      deleted: deletedCount,
    });
  } catch (error: any) {
    console.error('Delete Paris Open Data events error:', error?.message || error);
    return res.status(500).json({ 
      message: 'Failed to delete Paris Open Data events',
      error: error?.message || 'Unknown error',
    });
  }
};
