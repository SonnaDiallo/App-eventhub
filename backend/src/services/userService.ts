/**
 * @module userService
 * @description Service de gestion des utilisateurs dans Firestore.
 *
 * Encapsule toutes les opérations CRUD sur la collection `users` de Firestore.
 * Le service a été conçu lors de la migration MongoDB → Firestore : les noms
 * de fonctions (`syncUserToMongoDB`, `updateUserInMongoDB`) conservent
 * volontairement l'ancienne nomenclature afin d'éviter un refactoring massif
 * des contrôleurs et middlewares existants.
 *
 * Chaque utilisateur est identifié par son `firebaseUid` (= ID du document
 * Firestore), ce qui simplifie la liaison avec Firebase Auth. Le champ `_id`
 * est un alias vers `firebaseUid` pour rester compatible avec le code mobile
 * qui attendait un `_id` MongoDB.
 *
 * @datasource Firestore — collection `users`
 * @dependencies firebase-admin (accès Firestore et timestamps serveur)
 *
 * @exports FirestoreUser              — interface de l'utilisateur normalisé
 * @exports syncUserToMongoDB          — création / mise à jour (upsert) d'un utilisateur
 * @exports getUserByFirebaseUid       — recherche par UID Firebase
 * @exports getUserByEmail             — recherche par email (indexé)
 * @exports updateUserInMongoDB        — mise à jour partielle
 * @exports syncAllUsersFromFirestore  — no-op conservé pour compatibilité
 */
import { firebaseDb } from '../config/firebaseAdmin';
import admin from 'firebase-admin';

/**
 * Type utilisateur normalisé retourné par toutes les fonctions du service.
 * Le champ `_id` est un alias vers `firebaseUid` pour maintenir la compatibilité
 * avec le code mobile et les contrôleurs écrits à l'époque de MongoDB.
 */
export interface FirestoreUser {
  _id: string;
  firebaseUid?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  avatar?: string;
  canScanTickets?: boolean;
  themeMode?: string;
  language?: string;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
}

/**
 * Crée ou met à jour un utilisateur dans Firestore (upsert).
 *
 * Fusionne les données fournies avec celles déjà existantes via `set({ merge: true })`,
 * ce qui permet d'appeler cette fonction aussi bien à l'inscription qu'à la connexion
 * (mise à jour du profil partiel). Les champs absents de `userData` conservent leur
 * valeur précédente. Le `createdAt` n'est posé que lors de la première écriture.
 *
 * Le nom de la fonction conserve "MongoDB" par rétrocompatibilité avec les contrôleurs existants.
 *
 * @param {string} firebaseUid — UID Firebase Auth de l'utilisateur (= ID du document Firestore)
 * @param {any}    userData    — données partielles à fusionner
 * @returns {Promise<FirestoreUser>} L'utilisateur mis à jour
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
 * Récupère un utilisateur par son UID Firebase (= ID du document Firestore).
 *
 * C'est la méthode de recherche la plus performante car elle effectue un accès
 * direct par clé primaire, sans requête. Utilisée systématiquement par le
 * middleware d'authentification pour résoudre l'utilisateur courant.
 *
 * @param {string} firebaseUid — UID Firebase Auth
 * @returns {Promise<FirestoreUser | null>} L'utilisateur, ou `null` si inexistant
 */
export const getUserByFirebaseUid = async (firebaseUid: string): Promise<FirestoreUser | null> => {
  const snap = await firebaseDb.collection('users').doc(firebaseUid).get();
  if (!snap.exists) return null;
  return docToUser(snap.id, snap.data()!);
};

/**
 * Recherche un utilisateur par son adresse email (normalisée en minuscules).
 *
 * Utilise une requête `where` avec `limit(1)` car l'email est unique mais
 * n'est pas la clé primaire du document. Cette fonction est principalement
 * appelée lors de l'invitation d'amis ou de la recherche d'utilisateurs.
 *
 * @param {string} email — adresse email à rechercher (insensible à la casse)
 * @returns {Promise<FirestoreUser | null>} L'utilisateur correspondant, ou `null`
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
 * Met à jour partiellement un utilisateur dans Firestore.
 *
 * Contrairement à `syncUserToMongoDB` qui fait un upsert complet, cette fonction
 * utilise `update()` et échoue si le document n'existe pas. Elle est destinée aux
 * modifications de profil (nom, avatar, thème, langue…) depuis l'écran de paramètres.
 * Le timestamp `updatedAt` est systématiquement mis à jour côté serveur.
 *
 * @param {string} firebaseUid — UID Firebase Auth de l'utilisateur
 * @param {Record<string, unknown>} updates — champs à mettre à jour
 * @returns {Promise<FirestoreUser | null>} L'utilisateur après mise à jour, ou `null` si inexistant
 */
export const updateUserInMongoDB = async (firebaseUid: string, updates: Record<string, unknown>) => {
  const ref = firebaseDb.collection('users').doc(firebaseUid);
  const safe = { ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
  await ref.update(safe);
  const snap = await ref.get();
  return snap.exists ? docToUser(snap.id, snap.data()!) : null;
};

/**
 * No-op conservé pour rétrocompatibilité.
 *
 * À l'époque de la double source MongoDB + Firestore, cette fonction synchronisait
 * tous les utilisateurs Firestore vers MongoDB. En mode Firestore seul, elle ne
 * fait rien mais reste exportée pour ne pas casser les imports existants.
 *
 * @returns {{ synced: number, errors: number }} Toujours `{ synced: 0, errors: 0 }`
 */
export const syncAllUsersFromFirestore = async () => {
  console.log('ℹ️ syncAllUsersFromFirestore: no-op (Firestore-only mode)');
  return { synced: 0, errors: 0 };
};

/**
 * Transforme un document Firestore brut en objet `FirestoreUser` normalisé.
 * Assure des valeurs par défaut cohérentes (email vide, rôle "user")
 * et mappe l'ID du document vers les champs `_id` et `firebaseUid`.
 */
function docToUser(id: string, data: admin.firestore.DocumentData): FirestoreUser {
  return {
    _id: id,
    firebaseUid: id,
    name: data.name,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email ?? '',
    role: data.role ?? 'user',
    avatar: data.avatar,
    canScanTickets: data.canScanTickets,
    themeMode: data.themeMode,
    language: data.language,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}
