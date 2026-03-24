/**
 * useNotifications.web.ts - Stub du hook notifications pour la plateforme web.
 * 
 * Sur web, expo-notifications n'est pas disponible.
 * Ce fichier retourne des valeurs par défaut (undefined) pour éviter
 * les erreurs d'import et maintenir la compatibilité cross-platform.
 */
export const useNotifications = () => ({
  expoPushToken: undefined as string | undefined,
  notification: undefined,
});
