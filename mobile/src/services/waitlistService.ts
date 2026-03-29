/**
 * @file Service de liste d'attente.
 *
 * Gère l'inscription/désinscription à la liste d'attente d'un événement,
 * la consultation de la position et la récupération des entrées de l'utilisateur.
 *
 * Collection Firestore : `waitlist/{waitlistId}`
 *  - eventId, eventTitle, userId, userName, userEmail
 *  - position, status ('waiting' | 'notified')
 *  - createdAt, updatedAt
 */

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  orderBy,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore';
import { db, auth } from './firebase';

export interface WaitlistEntry {
  id: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  position: number;
  status: 'waiting' | 'notified';
  createdAt: any;
}

/**
 * Vérifie si l'événement est complet (tickets confirmés >= capacité).
 */
export async function isEventFull(eventId: string, capacity: number): Promise<boolean> {
  if (!capacity || capacity <= 0) return false;
  const snap = await getDocs(
    query(
      collection(db, 'tickets'),
      where('eventId', '==', eventId),
      where('status', '==', 'confirmed')
    )
  );
  return snap.size >= capacity;
}

/**
 * Retourne le nombre de tickets confirmés pour un événement.
 */
export async function getConfirmedTicketCount(eventId: string): Promise<number> {
  const snap = await getDocs(
    query(
      collection(db, 'tickets'),
      where('eventId', '==', eventId),
      where('status', '==', 'confirmed')
    )
  );
  return snap.size;
}

/**
 * Vérifie si l'utilisateur connecté est sur la liste d'attente.
 * Retourne l'entrée ou null.
 */
export async function getMyWaitlistEntry(eventId: string): Promise<WaitlistEntry | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const snap = await getDocs(
    query(
      collection(db, 'waitlist'),
      where('eventId', '==', eventId),
      where('userId', '==', user.uid)
    )
  );

  if (snap.empty || !snap.docs[0]) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as WaitlistEntry;
}

/**
 * Retourne la position de l'utilisateur dans la liste (1-indexé).
 */
export async function getWaitlistPosition(eventId: string): Promise<number> {
  const entry = await getMyWaitlistEntry(eventId);
  if (!entry) return 0;
  return entry.position;
}

/**
 * Retourne le nombre total de personnes sur la liste d'attente.
 */
export async function getWaitlistCount(eventId: string): Promise<number> {
  const snap = await getDocs(
    query(collection(db, 'waitlist'), where('eventId', '==', eventId))
  );
  return snap.size;
}

/**
 * Ajoute l'utilisateur connecté à la liste d'attente.
 */
export async function joinWaitlist(eventId: string, eventTitle: string): Promise<WaitlistEntry> {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentification requise');

  const existing = await getMyWaitlistEntry(eventId);
  if (existing) return existing;

  const count = await getWaitlistCount(eventId);
  const position = count + 1;

  const docRef = await addDoc(collection(db, 'waitlist'), {
    eventId,
    eventTitle,
    userId: user.uid,
    userName: user.displayName || 'Participant',
    userEmail: user.email || '',
    position,
    status: 'waiting',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    eventId,
    eventTitle,
    userId: user.uid,
    userName: user.displayName || 'Participant',
    userEmail: user.email || '',
    position,
    status: 'waiting',
    createdAt: new Date(),
  };
}

/**
 * Retire l'utilisateur connecté de la liste d'attente.
 */
export async function leaveWaitlist(eventId: string): Promise<void> {
  const entry = await getMyWaitlistEntry(eventId);
  if (!entry) return;
  await deleteDoc(doc(db, 'waitlist', entry.id));
}

/**
 * Récupère toutes les entrées de liste d'attente de l'utilisateur connecté.
 */
export async function getMyWaitlistEntries(): Promise<WaitlistEntry[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const snap = await getDocs(
    query(
      collection(db, 'waitlist'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )
  );

  return snap.docs.map(d => ({ id: d.id, ...d.data() } as WaitlistEntry));
}
