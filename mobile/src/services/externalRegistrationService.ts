import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  doc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';

export interface ExternalRegistrationData {
  externalEventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
}

export interface ExternalRegistration {
  id: string;
  userId: string;
  externalEventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  status: 'registered' | 'cancelled';
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalParticipant {
  id: string;
  user: {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  status: string;
  registeredAt: string;
}

/**
 * S'inscrire à un événement externe (Ticketmaster)
 */
export const registerForExternalEvent = async (data: ExternalRegistrationData): Promise<{
  message: string;
  registration: ExternalRegistration;
}> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Non authentifié');

  // Vérifier si déjà inscrit
  const existing = await checkExternalEventRegistration(data.externalEventId);
  if (existing.isRegistered) {
    throw new Error('Vous êtes déjà inscrit à cet événement');
  }

  const registrationData = {
    userId,
    externalEventId: data.externalEventId,
    eventTitle: data.eventTitle,
    eventDate: data.eventDate,
    eventLocation: data.eventLocation,
    status: 'registered',
    registeredAt: new Date().toISOString(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'externalRegistrations'), registrationData);

  return {
    message: 'Inscription réussie',
    registration: {
      id: docRef.id,
      ...registrationData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ExternalRegistration,
  };
};

/**
 * Annuler l'inscription à un événement externe
 */
export const cancelExternalEventRegistration = async (externalEventId: string): Promise<{
  message: string;
  registration: ExternalRegistration;
}> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Non authentifié');

  const registrationsRef = collection(db, 'externalRegistrations');
  const q = query(
    registrationsRef,
    where('userId', '==', userId),
    where('externalEventId', '==', externalEventId),
    where('status', '==', 'registered')
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Inscription non trouvée');
  }

  const docSnap = snap.docs[0];
  await updateDoc(docSnap.ref, {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });

  const data = docSnap.data();
  return {
    message: 'Inscription annulée',
    registration: {
      id: docSnap.id,
      ...data,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    } as ExternalRegistration,
  };
};

/**
 * Obtenir les participants d'un événement externe
 */
export const getExternalEventParticipants = async (externalEventId: string): Promise<{
  participants: ExternalParticipant[];
  total: number;
}> => {
  const registrationsRef = collection(db, 'externalRegistrations');
  const q = query(
    registrationsRef,
    where('externalEventId', '==', externalEventId),
    where('status', '==', 'registered')
  );
  const snap = await getDocs(q);

  const participants: ExternalParticipant[] = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    // Récupérer les infos utilisateur
    const userSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', data.userId)));
    let user: ExternalParticipant['user'] = { id: data.userId, name: 'Utilisateur' };
    
    if (!userSnap.empty) {
      const userData = userSnap.docs[0].data();
      user = {
        id: data.userId,
        name: userData.name || [userData.firstName, userData.lastName].filter(Boolean).join(' ') || 'Utilisateur',
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
      };
    }

    participants.push({
      id: docSnap.id,
      user,
      status: data.status,
      registeredAt: data.registeredAt,
    });
  }

  return { participants, total: participants.length };
};

/**
 * Obtenir mes inscriptions aux événements externes
 */
export const getMyExternalRegistrations = async (): Promise<{
  registrations: ExternalRegistration[];
  total: number;
}> => {
  const userId = auth.currentUser?.uid;
  if (!userId) return { registrations: [], total: 0 };

  const registrationsRef = collection(db, 'externalRegistrations');
  const q = query(
    registrationsRef,
    where('userId', '==', userId),
    where('status', '==', 'registered')
  );
  const snap = await getDocs(q);

  const registrations = snap.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId,
      externalEventId: data.externalEventId,
      eventTitle: data.eventTitle,
      eventDate: data.eventDate,
      eventLocation: data.eventLocation,
      status: data.status,
      registeredAt: data.registeredAt,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    } as ExternalRegistration;
  });

  return { registrations, total: registrations.length };
};

/**
 * Vérifier si je suis inscrit à un événement externe
 */
export const checkExternalEventRegistration = async (externalEventId: string): Promise<{
  isRegistered: boolean;
  registration?: ExternalRegistration;
}> => {
  const userId = auth.currentUser?.uid;
  if (!userId) return { isRegistered: false };

  const registrationsRef = collection(db, 'externalRegistrations');
  const q = query(
    registrationsRef,
    where('userId', '==', userId),
    where('externalEventId', '==', externalEventId),
    where('status', '==', 'registered')
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    return { isRegistered: false };
  }

  const docSnap = snap.docs[0];
  const data = docSnap.data();

  return {
    isRegistered: true,
    registration: {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    } as ExternalRegistration,
  };
};
