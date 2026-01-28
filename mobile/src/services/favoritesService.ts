// mobile/src/services/favoritesService.ts
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './firebase';

/**
 * Ajoute un événement aux favoris de l'utilisateur
 */
export const addToFavorites = async (eventId: string): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const favoriteRef = doc(db, 'users', user.uid, 'favorites', eventId);
    await setDoc(favoriteRef, {
      eventId,
      addedAt: new Date(),
    });

    return true;
  } catch (error: any) {
    console.error('Error adding to favorites:', error);
    throw error;
  }
};

/**
 * Retire un événement des favoris de l'utilisateur
 */
export const removeFromFavorites = async (eventId: string): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const favoriteRef = doc(db, 'users', user.uid, 'favorites', eventId);
    await deleteDoc(favoriteRef);

    return true;
  } catch (error: any) {
    console.error('Error removing from favorites:', error);
    throw error;
  }
};

/**
 * Vérifie si un événement est dans les favoris
 */
export const isFavorite = async (eventId: string): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return false;
    }

    const favoriteRef = doc(db, 'users', user.uid, 'favorites', eventId);
    const favoriteDoc = await getDoc(favoriteRef);
    
    return favoriteDoc.exists();
  } catch (error: any) {
    console.error('Error checking favorite:', error);
    return false;
  }
};

/**
 * Toggle favoris (ajoute si absent, retire si présent)
 */
export const toggleFavorite = async (eventId: string): Promise<boolean> => {
  try {
    const isFav = await isFavorite(eventId);
    if (isFav) {
      await removeFromFavorites(eventId);
      return false;
    } else {
      await addToFavorites(eventId);
      return true;
    }
  } catch (error: any) {
    console.error('Error toggling favorite:', error);
    throw error;
  }
};
