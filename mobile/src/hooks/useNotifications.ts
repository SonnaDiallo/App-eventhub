/**
 * useNotifications.ts - Hook pour les notifications push (plateformes natives).
 * 
 * Au montage :
 * 1. Enregistre l'appareil pour recevoir des push notifications (via Expo)
 * 2. Écoute les notifications reçues (app au premier plan)
 * 3. Écoute les interactions utilisateur (clic sur une notification)
 * 
 * Retourne le token Expo Push et la dernière notification reçue.
 * Note : sur web, le fichier .web.ts est utilisé (stub sans push).
 */

import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../services/notificationService';

export const useNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

  useEffect(() => {
    // Enregistrer pour les notifications push
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    // Écouter les notifications reçues
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification reçue:', notification);
      setNotification(notification);
    });

    // Écouter les interactions avec les notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification cliquée:', response);
      
      const data = response.notification.request.content.data;
      
      // Log pour debug - la navigation sera gérée dans les écrans individuels si nécessaire
      console.log('Type de notification:', data?.type);
      console.log('Event ID:', data?.eventId);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
  };
};
