/**
 * @file Persistance du jeton d'authentification Firebase.
 *
 * Encapsule le stockage local (AsyncStorage) du token JWT utilisé
 * pour authentifier les requêtes API. Le token est sauvegardé après
 * chaque rafraîchissement et supprimé à la déconnexion.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'eventhub_token';

/** Sauvegarde le token JWT dans le stockage local. */
export const saveToken = async (token: string) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

/** Récupère le token JWT depuis le stockage local, ou `null` s'il est absent. */
export const getToken = async () => {
  return AsyncStorage.getItem(TOKEN_KEY);
};

/** Supprime le token JWT du stockage local (utilisé lors de la déconnexion). */
export const clearToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};
