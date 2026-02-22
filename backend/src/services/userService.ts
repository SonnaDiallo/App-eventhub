import { firebaseDb } from '../config/firebaseAdmin';
import admin from 'firebase-admin';

/** Type utilisateur retourné (compatible avec l’ancien mongoUser._id) */
export interface FirestoreUser {
  _id: string;
  firebaseUid?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  canScanTickets?: boolean;
  themeMode?: string;
  language?: string;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
}

/**
 * Synchronise un utilisateur vers Firestore (écriture seule)
 */
export const syncUserToMongoDB = async (firebaseUid: string, userData: any) => {
  const ref = firebaseDb.collection('users').doc(firebaseUid);
  const existing = await ref.get();
  const data: Record<string, unknown> = {
    name: userData.name ?? existing.data()?.name,
    firstName: userData.firstName ?? existing.data()?.firstName,
    lastName: userData.lastName ?? existing.data()?.lastName,
    email: (userData.email ?? existing.data()?.email)?.toLowerCase?.() ?? existing.data()?.email,
    role: userData.role ?? existing.data()?.role ?? 'user',
    canScanTickets: userData.canScanTickets ?? existing.data()?.canScanTickets ?? false,
    themeMode: userData.themeMode ?? existing.data()?.themeMode,
    language: userData.language ?? existing.data()?.language ?? 'fr',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (!existing.exists) {
    (data as any).createdAt = admin.firestore.FieldValue.serverTimestamp();
  }
  await ref.set(data, { merge: true });
  return docToUser(ref.id, (await ref.get()).data()!);
};

/**
 * Récupère un utilisateur par Firebase UID (Firestore)
 */
export const getUserByFirebaseUid = async (firebaseUid: string): Promise<FirestoreUser | null> => {
  const snap = await firebaseDb.collection('users').doc(firebaseUid).get();
  if (!snap.exists) return null;
  return docToUser(snap.id, snap.data()!);
};

/**
 * Récupère un utilisateur par email (Firestore)
 */
export const getUserByEmail = async (email: string): Promise<FirestoreUser | null> => {
  const snap = await firebaseDb
    .collection('users')
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return docToUser(doc.id, doc.data());
};

/**
 * Met à jour un utilisateur dans Firestore
 */
export const updateUserInMongoDB = async (firebaseUid: string, updates: Record<string, unknown>) => {
  const ref = firebaseDb.collection('users').doc(firebaseUid);
  const safe = { ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
  await ref.update(safe);
  const snap = await ref.get();
  return snap.exists ? docToUser(snap.id, snap.data()!) : null;
};

/**
 * Synchronise tous les utilisateurs Firestore → Firestore (no-op en mode Firestore seul)
 */
export const syncAllUsersFromFirestore = async () => {
  console.log('ℹ️ syncAllUsersFromFirestore: no-op (Firestore-only mode)');
  return { synced: 0, errors: 0 };
};

function docToUser(id: string, data: admin.firestore.DocumentData): FirestoreUser {
  return {
    _id: id,
    firebaseUid: id,
    name: data.name,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email ?? '',
    role: data.role ?? 'user',
    canScanTickets: data.canScanTickets,
    themeMode: data.themeMode,
    language: data.language,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}
