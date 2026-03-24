/**
 * @file Service d'upload d'images vers Firebase Storage.
 *
 * Gère la conversion base64 → Blob et l'envoi vers Firebase Storage
 * pour les images d'événements et les photos de profil. Les chemins
 * de stockage respectent les règles de sécurité Firebase
 * (`profiles/{uid}/...` pour les profils utilisateur).
 */

import * as FileSystem from 'expo-file-system';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from './firebase';

/**
 * Upload une image vers Firebase Storage.
 * @param base64 - Image en base64 (sans le préfixe data:image/...)
 * @param mimeType - Type MIME de l'image (image/jpeg, image/png, etc.)
 * @param folder - Dossier de destination (ex: 'events', 'profiles')
 * @returns URL publique de l'image uploadée
 */
export async function uploadImage(
  base64: string,
  mimeType: string,
  folder: string = 'events'
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Utilisateur non authentifié');
  }

  // Convertir base64 en blob
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  // Générer un nom de fichier unique (profiles/:uid/:file pour respecter storage.rules)
  const extension = mimeType.split('/')[1] || 'jpg';
  const filename =
    folder === 'profiles'
      ? `${folder}/${user.uid}/${Date.now()}.${extension}`
      : `${folder}/${Date.now()}-${user.uid}.${extension}`;
  
  // Créer la référence et uploader
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, blob, {
    contentType: mimeType,
  });

  // Récupérer l'URL publique
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

/**
 * Upload une image d'événement vers Firebase Storage
 */
export async function uploadEventImage(
  base64: string,
  mimeType: string
): Promise<string> {
  return uploadImage(base64, mimeType, 'events');
}

/**
 * Upload une photo de profil depuis une URI locale (ex: ImagePicker) vers Firebase Storage.
 * Retourne l'URL publique à enregistrer dans Firestore.
 */
export async function uploadProfileImageFromUri(localUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const mimeType = localUri.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';
  return uploadImage(base64, mimeType, 'profiles');
}
