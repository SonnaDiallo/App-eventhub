/**
 * @module eventController
 * @description Contrôleur principal des événements de la plateforme EventHub.
 *
 * Gère le cycle de vie complet d'un événement local : création,
 * consultation (liste paginée, détail, mes événements), modification,
 * suppression, inscription/désinscription de participants, et
 * vérification de token.
 *
 * La liste publique peut fusionner les événements locaux avec ceux
 * provenant de Ticketmaster (si includeExternal=true), offrant ainsi
 * un catalogue enrichi sans duplication dans la base de données.
 *
 * Lors de l'inscription (joinEvent), un billet avec code unique est
 * automatiquement généré. Le code est garanti unique par jusqu'à 10
 * tentatives aléatoires + fallback horodaté.
 *
 * Routes gérées :
 * - POST   /events                  → createEvent
 * - GET    /events                  → getEvents
 * - GET    /events/my               → getMyEvents
 * - GET    /events/:id              → getEventById
 * - PUT    /events/:id              → updateEvent
 * - DELETE /events/:id              → deleteEvent
 * - POST   /events/:id/join         → joinEvent
 * - DELETE /events/:id/leave        → leaveEvent
 * - GET    /events/:id/participants → getParticipants
 * - GET    /events/verify-token     → verifyToken
 */
import { Request, Response } from 'express';
import crypto from 'crypto';
import admin from 'firebase-admin';
import { firebaseDb } from '../config/firebaseAdmin';
import { EventCategory, isValidCategory } from '../types/categories';
import { getCategoryDefaultImage, detectCategoryFromTitle } from '../services/categoryService';
import { fetchTicketmasterEvents } from '../services/externalEventsService';
import { getUserByFirebaseUid } from '../services/userService';

function generateTicketCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function ensureUniqueTicketCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateTicketCode();
    const snap = await firebaseDb.collection('tickets').where('code', '==', code).limit(1).get();
    if (snap.empty) return code;
  }
  return generateTicketCode() + Date.now().toString(36).slice(-4).toUpperCase();
}

const toDate = (v: admin.firestore.Timestamp | Date | undefined): Date | undefined =>
  !v ? undefined : v instanceof Date ? v : (v as admin.firestore.Timestamp).toDate?.() ?? undefined;

/**
 * Transforme un document Firestore brut en objet événement normalisé pour l'API.
 * Résout le nom de l'organisateur en privilégiant le vrai nom depuis la collection
 * users plutôt que la valeur par défaut « Organisateur » stockée dans le document.
 */
function eventDocToResponse(
  id: string,
  data: admin.firestore.DocumentData,
  organizer?: { id: string; name?: string; email?: string } | null,
  participantsCount?: number
) {
  const rawOrganizerName =
    typeof data.organizerName === 'string' ? data.organizerName.trim() : '';

  // Si organizerName est vide ou vaut seulement "Organisateur" (valeur par défaut),
  // on privilégie toujours le vrai nom de l'organisateur issu de la collection users.
  const resolvedOrganizerName =
    (!rawOrganizerName || rawOrganizerName === 'Organisateur')
      ? organizer?.name || organizer?.email || rawOrganizerName || 'Organisateur'
      : rawOrganizerName;

  return {
    id,
    title: data.title,
    coverImage: data.coverImage,
    category: data.category,
    startDate: toDate(data.startDate as admin.firestore.Timestamp),
    endDate: toDate(data.endDate as admin.firestore.Timestamp),
    location: data.location,
    description: data.description,
    isFree: data.isFree ?? true,
    price: data.price,
    capacity: data.capacity,
    organizerName: resolvedOrganizerName,
    organizerId: data.organizerId,
    organizer,
    ...(participantsCount !== undefined && { participantsCount }),
    createdAt: toDate(data.createdAt as admin.firestore.Timestamp),
    updatedAt: toDate(data.updatedAt as admin.firestore.Timestamp),
    source: 'local',
  };
}

/**
 * POST /events
 * Crée un nouvel événement. La catégorie est soit fournie explicitement,
 * soit détectée automatiquement à partir du titre. L'image de couverture
 * est celle fournie ou une image par défaut selon la catégorie.
 * Le nom de l'organisateur est résolu depuis le profil MongoDB de l'utilisateur
 * pour éviter les valeurs génériques.
 *
 * @body {string} title       - Titre de l'événement (obligatoire)
 * @body {string} [category]  - Catégorie (auto-détectée si absente)
 * @body {string} [coverImage]- URL de l'image de couverture
 * @body {string} [startDate] - Date de début ISO
 * @body {string} [endDate]   - Date de fin ISO
 * @body {boolean} [isFree]   - Événement gratuit (défaut true)
 * @body {number} [price]     - Prix en euros
 * @body {number} [capacity]  - Nombre max de participants
 */
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

    if (!title) return res.status(400).json({ message: 'Title is required' });

    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

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
      eventCategory = detectCategoryFromTitle(title);
    }

    const finalCoverImage = getCategoryDefaultImage(eventCategory, coverImage);
    const user = await getUserByFirebaseUid(userId);
    if (!user) return res.status(404).json({ message: 'User not found in database' });

    const organizerNameValue =
      (typeof organizerName === 'string' && organizerName.trim()) ||
      user.name ||
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      'Organisateur';

    const payload: Record<string, unknown> = {
      title,
      coverImage: finalCoverImage,
      category: eventCategory,
      organizerId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Ajouter les champs optionnels seulement s'ils sont définis
    if (startDate) payload.startDate = new Date(startDate);
    if (endDate) payload.endDate = new Date(endDate);
    if (typeof location === 'string') payload.location = location;
    if (typeof description === 'string') payload.description = description;
    if (typeof isFree === 'boolean') payload.isFree = isFree;
    if (typeof price === 'number') payload.price = price;
    if (typeof capacity === 'number') payload.capacity = capacity;
    payload.organizerName = organizerNameValue;

    const ref = await firebaseDb.collection('events').add(payload);
    const snap = await ref.get();
    const data = snap.data()!;
    const created = eventDocToResponse(ref.id, data, {
      id: user._id,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
    });

    return res.status(201).json({
      event: { ...created, createdAt: toDate(data.createdAt as admin.firestore.Timestamp), updatedAt: toDate(data.updatedAt as admin.firestore.Timestamp) },
    });
  } catch (error: any) {
    console.error('Create event error:', error?.message || error);
    console.error('Stack:', error?.stack);
    return res.status(500).json({ message: 'Internal server error', details: error?.message });
  }
};

/**
 * POST /events/:id/join
 * Inscrit l'utilisateur connecté à un événement. Si l'événement est
 * gratuit, le statut est directement « confirmed » ; sinon il est
 * « pending_payment » en attendant le règlement via Stripe.
 * Génère automatiquement un billet avec un code unique de 8 caractères
 * hexadécimaux, et pré-remplit les informations de l'événement sur
 * le billet pour faciliter l'affichage offline.
 *
 * @param {string} id - Identifiant Firestore de l'événement
 */
export const joinEvent = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!eventId) return res.status(400).json({ message: 'Invalid event id' });
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const eventSnap = await firebaseDb.collection('events').doc(eventId).get();
    if (!eventSnap.exists) return res.status(404).json({ message: 'Event not found' });

    const user = await getUserByFirebaseUid(userId);
    if (!user) return res.status(404).json({ message: 'User not found in database' });

    const eventData = eventSnap.data()!;
    const isFree = eventData.isFree !== false;
    const status = isFree ? 'confirmed' : 'pending_payment';

    await firebaseDb
      .collection('events')
      .doc(eventId)
      .collection('participants')
      .doc(userId)
      .set(
        {
          status,
          userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    const code = await ensureUniqueTicketCode();
    const participantName = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Participant';
    const startDate = toDate(eventData.startDate as admin.firestore.Timestamp);
    const eventDate = startDate ? startDate.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const eventTime = startDate ? startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
    await firebaseDb.collection('tickets').add({
      code,
      eventId,
      userId,
      participantName,
      participantEmail: user.email || undefined,
      ticketType: eventData.isFree === false ? 'Standard' : 'Gratuit',
      price: eventData.price ?? undefined,
      checkedIn: false,
      eventTitle: eventData.title || '',
      eventLocation: eventData.location || '',
      eventDate,
      eventTime,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      participation: { eventId, userId, status, id: `${eventId}_${userId}`, ticketCode: code },
    });
  } catch (error: any) {
    console.error('Join event error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * DELETE /events/:id/leave
 * Désinscrit l'utilisateur connecté d'un événement. Supprime le
 * document participant ET tous les billets associés à cette
 * participation pour éviter les billets orphelins.
 *
 * @param {string} id - Identifiant Firestore de l'événement
 */
export const leaveEvent = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!eventId) return res.status(400).json({ message: 'Invalid event id' });
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const eventRef = firebaseDb.collection('events').doc(eventId);
    const partRef = eventRef.collection('participants').doc(userId);
    const partSnap = await partRef.get();
    if (!partSnap.exists) return res.status(404).json({ message: 'Participation not found' });

    await partRef.delete();
    const ticketsSnap = await firebaseDb.collection('tickets').where('eventId', '==', eventId).where('userId', '==', userId).get();
    const batch = firebaseDb.batch();
    ticketsSnap.docs.forEach((d) => batch.delete(d.ref));
    if (!ticketsSnap.empty) await batch.commit();
    return res.status(200).json({ message: 'Participation cancelled successfully' });
  } catch (error: any) {
    console.error('Leave event error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /events/:id/participants
 * Liste les participants d'un événement avec leur profil utilisateur.
 * Peut être filtré par statut (confirmed / pending_payment).
 * Retourne aussi les compteurs agrégés pour l'affichage du tableau
 * de bord organisateur.
 *
 * @param {string} id       - Identifiant Firestore de l'événement
 * @query {string} [status] - Filtre sur le statut de participation
 */
export const getParticipants = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const { status } = req.query;
    if (!eventId) return res.status(400).json({ message: 'Invalid event id' });

    const eventSnap = await firebaseDb.collection('events').doc(eventId).get();
    if (!eventSnap.exists) return res.status(404).json({ message: 'Event not found' });

    let participantsSnap = await firebaseDb.collection('events').doc(eventId).collection('participants').get();
    let participants = participantsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (typeof status === 'string' && (status === 'confirmed' || status === 'pending_payment')) {
      participants = participants.filter((p: any) => p.status === status);
    }

    participants.sort((a: any, b: any) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });

    const userIds = [...new Set(participants.map((p: any) => p.userId).filter(Boolean))];
    const userSnaps = await Promise.all(userIds.map((uid) => firebaseDb.collection('users').doc(uid).get()));
    const userMap: Record<string, any> = {};
    userSnaps.forEach((s, i) => {
      if (s.exists && userIds[i]) userMap[userIds[i]] = s.data();
    });

    const result = participants.map((p: any) => {
      const u = userMap[p.userId];
      return {
        id: p.userId || p.id,
        status: p.status,
        user: u
          ? {
              id: p.userId,
              name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' ').trim(),
              firstName: u.firstName,
              lastName: u.lastName,
              email: u.email,
              role: u.role,
            }
          : null,
        createdAt: toDate(p.createdAt),
      };
    });

    const confirmed = result.filter((r) => r.status === 'confirmed').length;
    const pending_payment = result.filter((r) => r.status === 'pending_payment').length;

    return res.status(200).json({
      counts: { confirmed, pending_payment, total: result.length },
      participants: result,
    });
  } catch (error: any) {
    console.error('Get participants error:', error?.message || error);
    return res.status(500).json({ message: 'Internal server error', error: error?.message });
  }
};

/**
 * GET /events
 * Liste les événements avec filtres multiples, pagination et
 * intégration optionnelle des événements Ticketmaster.
 * Les filtres (catégorie, gratuité, localisation, recherche texte,
 * upcoming) sont combinables. Les événements externes sont dédupliqués
 * par clé composite source+id.
 *
 * @query {string}  [category]        - Filtre par catégorie
 * @query {string}  [isFree]          - « true » ou « false »
 * @query {string}  [location]        - Recherche partielle sur le lieu
 * @query {string}  [search]          - Recherche texte (titre, description, lieu)
 * @query {string}  [organizerId]     - Filtre par organisateur
 * @query {string}  [upcoming]        - « true » pour les événements futurs uniquement
 * @query {string}  [includeExternal] - « true » pour inclure Ticketmaster
 * @query {number}  [page=1]          - Numéro de page
 * @query {number}  [limit=20]        - Éléments par page
 */
export const getEvents = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', category, isFree, location, search, organizerId, upcoming } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Toujours utiliser la catégorie en minuscules pour la requête (Firestore est sensible à la casse)
    const categoryParam = typeof category === 'string' ? category.trim().toLowerCase() : undefined;

    let eventsSnap: admin.firestore.QuerySnapshot;
    let query: admin.firestore.Query = firebaseDb.collection('events');
    if (categoryParam && isValidCategory(categoryParam)) {
      query = query.where('category', '==', categoryParam);
    }
    if (organizerId) {
      query = query.where('organizerId', '==', organizerId);
    }
    eventsSnap = await query.get();

    let list = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

    if (isFree !== undefined) {
      const free = isFree === 'true';
      list = list.filter((e) => (e.isFree === true) === free);
    }
    if (location) {
      const loc = (location as string).toLowerCase();
      list = list.filter((e) => e.location?.toLowerCase?.().includes(loc));
    }
    if (search) {
      const s = (search as string).toLowerCase();
      list = list.filter(
        (e) =>
          e.title?.toLowerCase?.().includes(s) ||
          e.description?.toLowerCase?.().includes(s) ||
          e.location?.toLowerCase?.().includes(s)
      );
    }
    if (upcoming === 'true') {
      const now = new Date();
      list = list.filter((e) => {
        const end = toDate(e.endDate);
        const start = toDate(e.startDate);
        if (end) return end >= now;
        if (start) return start >= now;
        return true;
      });
    }

    list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? a.createdAt?.getTime?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? b.createdAt?.getTime?.() ?? 0;
      return tb - ta;
    });

    const total = list.length;
    list = list.slice(skip, skip + limitNum);

    const organizerIds = [...new Set(list.map((e) => e.organizerId).filter(Boolean))];
    const organizerSnaps = await Promise.all(organizerIds.map((uid) => firebaseDb.collection('users').doc(uid).get()));
    const organizerMap: Record<string, any> = {};
    organizerIds.forEach((uid, i) => {
      const s = organizerSnaps[i];
      if (s?.exists && uid) organizerMap[uid] = s.data();
    });

    const eventsData = list.map((e) => {
      const org = e.organizerId ? organizerMap[e.organizerId] : null;
      return eventDocToResponse(e.id, e, org
        ? { id: e.organizerId, name: org.name || [org.firstName, org.lastName].filter(Boolean).join(' ').trim(), email: org.email }
        : null);
    });

    let externalEvents: any[] = [];
    if (req.query.includeExternal === 'true' && process.env.TICKETMASTER_API_KEY) {
      const externalLocation = (location as string) || 'Paris,France';
      const externalCategory = categoryParam ?? (category as string | undefined);
      const externalSearch = search as string | undefined;
      try {
        let allExternal = await fetchTicketmasterEvents(externalLocation, externalCategory);
        if (externalSearch) {
          const sl = externalSearch.toLowerCase();
          allExternal = allExternal.filter(
            (ev) =>
              ev.title?.toLowerCase?.().includes(sl) ||
              ev.description?.toLowerCase?.().includes(sl) ||
              ev.location?.toLowerCase?.().includes(sl)
          );
        }
        const byId = new Map<string, any>();
        allExternal.forEach((ev) => {
          const k = `${ev.source}_${ev.id}`;
          if (!byId.has(k)) byId.set(k, ev);
        });
        externalEvents = Array.from(byId.values()).slice(0, limitNum).map((event) => {
          const name = event.promoterName || event.venueName || 'Organisateur externe';
          return {
        id: `external_${event.source}_${event.id}`,
        title: event.title,
        coverImage: event.coverImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
        category: event.category,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        description: event.description?.substring?.(0, 300),
        isFree: event.isFree,
        price: event.price,
        organizerName: name,
        organizer: name,
        source: event.source,
        externalId: event.id,
        externalUrl: event.externalUrl,
      };
        });
      } catch (err: any) {
        console.error('Ticketmaster error:', err?.message);
      }
    }

    const allEvents = [...eventsData, ...externalEvents];
    return res.status(200).json({
      events: allEvents,
      pagination: { page: pageNum, limit: limitNum, total: total + externalEvents.length, pages: Math.ceil((total + externalEvents.length) / limitNum) },
      sources: { local: eventsData.length, external: externalEvents.length },
    });
  } catch (error: any) {
    console.error('Get events error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /events/:id
 * Retourne le détail complet d'un événement, enrichi du nombre de
 * participants confirmés et du profil de l'organisateur. Utilisé
 * par l'écran de détail sur le mobile.
 *
 * @param {string} id - Identifiant Firestore de l'événement
 */
export const getEventById = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    if (!eventId) return res.status(400).json({ message: 'Invalid event id' });

    const eventSnap = await firebaseDb.collection('events').doc(eventId).get();
    if (!eventSnap.exists) return res.status(404).json({ message: 'Event not found' });

    const data = eventSnap.data()!;
    const confirmedSnap = await firebaseDb.collection('events').doc(eventId).collection('participants').where('status', '==', 'confirmed').get();
    const participantsCount = confirmedSnap.size;

    let organizer = null;
    if (data.organizerId) {
      const userSnap = await firebaseDb.collection('users').doc(data.organizerId).get();
      if (userSnap.exists) {
        const u = userSnap.data()!;
        organizer = {
          id: data.organizerId,
          name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' ').trim(),
          email: u.email,
        };
      }
    }

    const eventData = eventDocToResponse(eventId, data, organizer, participantsCount);
    return res.status(200).json({ event: eventData });
  } catch (error: any) {
    console.error('Get event by id error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * PUT /events/:id
 * Met à jour un événement existant. Seul l'organisateur qui a créé
 * l'événement peut le modifier (vérification organizerId).
 * Seuls les champs fournis dans le body sont mis à jour (merge partiel).
 *
 * @param {string} id - Identifiant Firestore de l'événement
 */
export const updateEvent = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const eventRef = firebaseDb.collection('events').doc(eventId);
    const eventSnap = await eventRef.get();
    if (!eventSnap.exists) return res.status(404).json({ message: 'Event not found' });

    const data = eventSnap.data()!;
    if (data.organizerId !== userId) return res.status(403).json({ message: 'Forbidden: You are not the organizer of this event' });

    const { title, coverImage, startDate, endDate, location, description, isFree, price, capacity, organizerName, category } = req.body;
    let eventCategory: string | undefined;
    if (category) {
      if (!isValidCategory(category)) {
        return res.status(400).json({ message: 'Catégorie invalide', validCategories: Object.values(EventCategory) });
      }
      eventCategory = category;
    }

    const updateData: Record<string, unknown> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
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

    await eventRef.update(updateData);
    const updated = await eventRef.get();
    const updatedData = updated.data()!;
    return res.status(200).json({
      event: {
        id: eventId,
        ...updateData,
        createdAt: toDate(updatedData.createdAt as admin.firestore.Timestamp),
      },
    });
  } catch (error: any) {
    console.error('Update event error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * DELETE /events/:id
 * Supprime un événement et ses données associées (participants, billets).
 * Seul l'organisateur créateur peut supprimer. La suppression est
 * en cascade : participants d'abord (batch), puis le document événement,
 * puis les billets liés.
 *
 * @param {string} id - Identifiant Firestore de l'événement
 */
export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const eventRef = firebaseDb.collection('events').doc(eventId);
    const eventSnap = await eventRef.get();
    if (!eventSnap.exists) return res.status(404).json({ message: 'Event not found' });

    const data = eventSnap.data()!;
    if (data.organizerId !== userId) return res.status(403).json({ message: 'Forbidden: You are not the organizer of this event' });

    const participants = await eventRef.collection('participants').get();
    const batch = firebaseDb.batch();
    participants.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    await eventRef.delete();

    const ticketsSnap = await firebaseDb.collection('tickets').where('eventId', '==', eventId).get();
    const ticketBatch = firebaseDb.batch();
    ticketsSnap.docs.forEach((d) => ticketBatch.delete(d.ref));
    if (!ticketsSnap.empty) await ticketBatch.commit();

    return res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('Delete event error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /events/my
 * Retourne les événements créés par l'organisateur connecté,
 * avec le nombre de participants confirmés pour chaque événement.
 * Paginé et trié par date de création décroissante.
 *
 * @query {number} [page=1]  - Numéro de page
 * @query {number} [limit=20]- Éléments par page
 */
export const getMyEvents = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await getUserByFirebaseUid(userId);
    if (!user) return res.status(404).json({ message: 'User not found in database' });

    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const eventsSnap = await firebaseDb.collection('events').where('organizerId', '==', userId).get();
    let list = eventsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
    const total = list.length;
    list = list.slice(skip, skip + limitNum);

    const eventsWithStats = await Promise.all(
      list.map(async (e: any) => {
        const partSnap = await firebaseDb.collection('events').doc(e.id).collection('participants').where('status', '==', 'confirmed').get();
        return {
          id: e.id,
          title: e.title,
          coverImage: e.coverImage,
          category: e.category,
          startDate: toDate(e.startDate),
          endDate: toDate(e.endDate),
          location: e.location,
          description: e.description,
          isFree: e.isFree,
          price: e.price,
          capacity: e.capacity,
          organizerName: e.organizerName,
          participantsCount: partSnap.size,
          createdAt: toDate(e.createdAt),
          updatedAt: toDate(e.updatedAt),
        };
      })
    );

    return res.status(200).json({
      events: eventsWithStats,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    console.error('Get my events error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /events/verify-token
 * Vérifie la validité du token JWT et retourne le profil utilisateur
 * ainsi que ses permissions (création d'événements, sync, etc.).
 * Utilisé par le mobile au lancement pour déterminer si la session
 * est encore valide sans ré-authentification.
 */
export const verifyToken = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    const role = (req as Request & { user?: { role?: string } }).user?.role;
    if (!userId) return res.status(401).json({ message: 'Token invalide ou expiré', valid: false });

    const user = await getUserByFirebaseUid(userId);
    const userData = user
      ? {
          id: user._id,
          email: user.email,
          name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          canScanTickets: user.canScanTickets,
        }
      : (await firebaseDb.collection('users').doc(userId).get()).data() ?? null;

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
        canScanTickets: userData?.canScanTickets ?? false,
      },
      permissions: { canSyncEvents: role === 'organizer', canCreateEvents: role === 'organizer', canViewEvents: true },
    });
  } catch (error: any) {
    return res.status(401).json({ message: 'Token invalide', valid: false, error: error?.message });
  }
};
