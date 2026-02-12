import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Configuration du comportement des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Enregistre le token de notification push pour l'utilisateur
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Permission de notification refusée');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);

    // Sauvegarder le token dans Firestore
    const user = auth.currentUser;
    if (user && token) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          pushToken: token,
          pushTokenUpdatedAt: new Date(),
        });
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du token:', error);
      }
    }
  } else {
    console.log('Les notifications push nécessitent un appareil physique');
  }

  return token;
}

/**
 * Planifie une notification locale
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: any,
  trigger?: Notifications.NotificationTriggerInput
) {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: trigger || null, // null = immédiat
    });
    return id;
  } catch (error) {
    console.error('Erreur lors de la planification de la notification:', error);
    throw error;
  }
}

/**
 * Planifie un rappel avant un événement
 */
export async function scheduleEventReminder(
  eventId: string,
  eventTitle: string,
  eventDate: Date,
  reminderMinutes: number = 60 // Par défaut 1h avant
) {
  const reminderDate = new Date(eventDate.getTime() - reminderMinutes * 60 * 1000);
  const now = new Date();

  // Ne pas planifier si la date est déjà passée
  if (reminderDate <= now) {
    console.log('Date de rappel déjà passée');
    return;
  }

  const trigger: Notifications.NotificationTriggerInput = {
    date: reminderDate,
  };

  return await scheduleLocalNotification(
    `Rappel: ${eventTitle}`,
    `Votre événement commence dans ${reminderMinutes} minutes !`,
    { eventId, type: 'event_reminder' },
    trigger
  );
}

/**
 * Annule une notification planifiée
 */
export async function cancelNotification(notificationId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Erreur lors de l\'annulation de la notification:', error);
  }
}

/**
 * Annule toutes les notifications planifiées
 */
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Erreur lors de l\'annulation des notifications:', error);
  }
}

/**
 * Obtient toutes les notifications planifiées
 */
export async function getScheduledNotifications() {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    return [];
  }
}

/**
 * Types de notifications
 */
export enum NotificationType {
  EVENT_REMINDER = 'event_reminder',
  NEW_EVENT = 'new_event',
  FRIEND_JOINED = 'friend_joined',
  TICKET_CONFIRMED = 'ticket_confirmed',
  EVENT_UPDATE = 'event_update',
  EVENT_CANCELLED = 'event_cancelled',
}

/**
 * Envoie une notification immédiate
 */
export async function sendImmediateNotification(
  title: string,
  body: string,
  data?: any
) {
  return await scheduleLocalNotification(title, body, data, null);
}
