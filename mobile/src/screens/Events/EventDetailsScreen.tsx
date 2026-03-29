/**
 * @file EventDetailsScreen.tsx
 * @description Écran de détail d'un événement. Affiche l'image de couverture,
 * les informations clés (date, lieu, organisateur, catégorie, prix), la liste
 * des participants, les avis et un bouton de réservation.
 *
 * Fonctionnalités principales :
 * - Ajout/suppression des favoris (Firestore sub-collection)
 * - Partage natif (Share API)
 * - Réservation de billet avec génération de QR code
 * - Inscription/désinscription aux événements externes (Ticketmaster)
 * - Envoi de demande de suivi à l'organisateur ou aux participants
 * - Ouverture de l'adresse dans Google Maps
 * - Ajout au calendrier Google
 * - Suppression de l'événement (organisateur uniquement)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
  Share,
  Linking,
  Modal,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, deleteDoc, getDoc } from 'firebase/firestore';
import QRCode from 'react-native-qrcode-svg';
import { auth, db } from '../../services/firebase';
import type { AuthStackParamList, EventData } from '../../navigation/AuthNavigator';
import { isFavorite, toggleFavorite } from '../../services/favoritesService';
import { normalizeImageUrl } from '../../config/constants';
import { 
  registerForExternalEvent, 
  cancelExternalEventRegistration, 
  checkExternalEventRegistration,
  type ExternalRegistration 
} from '../../services/externalRegistrationService';
import { sendFriendRequest } from '../../services/friendsService';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { createStyles } from './EventDetailsScreen.styles';
import { getEventReviews, getEventReviewStats, Review, ReviewStats } from '../../services/reviewService';
import { ReviewCard } from '../../components/ReviewCard';
import { scheduleEventReminder } from '../../services/notificationService';
import { getMyWaitlistEntry, joinWaitlist, leaveWaitlist, WaitlistEntry } from '../../services/waitlistService';

const { width } = Dimensions.get('window');

type EventDetailsRouteProp = RouteProp<AuthStackParamList, 'EventDetails'>;

/** Événement par défaut utilisé comme fallback si les paramètres de navigation sont absents (ex. deep link invalide). */
const defaultEvent: EventData = {
  id: '000000000000000000000001',
  title: 'Festival de Musique Électronique',
  coverImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
  date: 'Mardi 28 Octobre, 2024',
  time: '19:00 - 02:00',
  location: 'Grand Palais Éphémère',
  address: 'Paris, France',
  organizer: 'Urban Beats Prod.',
  organizerName: 'Urban Beats Prod.',
  organizerId: '',
  category: 'music',
  description: 'Plongez au cœur de la scène électronique avec les plus grands DJs du moment. Une expérience immersive avec des visuels époustouflants et un sound system de pointe.',
  price: 49.99,
  isFree: false,
};

/** Génère un code alphanumérique aléatoire de 8 caractères (sans ambiguïté visuelle : pas de 0/O/1/I). */
const generateTicketCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Parse une date d'événement (ISO, texte libre, etc.) et la normalise au format DD/MM/YYYY.
 * En cas d'échec du parsing, retourne une date future à J+7 comme fallback.
 */
const parseEventDate = (dateStr: string): string => {
  try {
    // Si la date est déjà au format DD/MM/YYYY, la retourner telle quelle
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Essayer de parser la date
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    
    // Si le parsing échoue, retourner une date future (7 jours)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const day = String(futureDate.getDate()).padStart(2, '0');
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const year = futureDate.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    // En cas d'erreur, retourner une date future
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const day = String(futureDate.getDate()).padStart(2, '0');
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const year = futureDate.getFullYear();
    return `${day}/${month}/${year}`;
  }
};

const EventDetailsScreen = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<EventDetailsRouteProp>();
  const [isLiked, setIsLiked] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);
  const [checkingTicket, setCheckingTicket] = useState(true);
  const [checkingFavorite, setCheckingFavorite] = useState(true);
  const [isExternalRegistered, setIsExternalRegistered] = useState(false);
  const [checkingExternalRegistration, setCheckingExternalRegistration] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [ticketCodeModal, setTicketCodeModal] = useState<string | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [followRequestSent, setFollowRequestSent] = useState(false);
  const [sendingFollowRequest, setSendingFollowRequest] = useState(false);
  const [eventFull, setEventFull] = useState(false);
  const [waitlistEntry, setWaitlistEntry] = useState<WaitlistEntry | null>(null);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [loadedEventData, setLoadedEventData] = useState<Partial<EventData> | null>(null);

  // Récupérer les données de l'événement depuis les paramètres ou utiliser les valeurs par défaut
  const eventParams = route.params?.event || defaultEvent;
  const event: EventData = { ...eventParams, ...loadedEventData } as EventData;

  // Charger les données complètes depuis Firestore si coverImage est absent
  useEffect(() => {
    if (eventParams.coverImage || !eventParams.id) return;
    getDoc(doc(db, 'events', eventParams.id)).then(snap => {
      if (snap.exists()) setLoadedEventData(snap.data() as Partial<EventData>);
    }).catch(() => {});
  }, [eventParams.id]);

  const organizerDisplayName =
    event.organizerName ||
    event.organizer ||
    'Organisateur';
  const user = auth.currentUser;
  const isOwner = user?.uid === event.organizerId;

  /** Supprime l'événement de Firestore après confirmation. Réservé à l'organisateur propriétaire (vérifié par isOwner). */
  const handleDeleteEvent = async () => {
    const doDelete = async () => {
      try {
        await deleteDoc(doc(db, 'events', event.id));
        if (Platform.OS === 'web') {
          window.alert('Événement supprimé !');
        } else {
          Alert.alert('Succès', 'Événement supprimé !');
        }
        navigation.goBack();
      } catch (error: any) {
        console.error('Delete event error:', error);
        const msg = error?.message || 'Impossible de supprimer l\'événement';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Erreur', msg);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Es-tu sûr(e) de vouloir supprimer cet événement ? Cette action est irréversible.')) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'Supprimer l\'événement',
        'Es-tu sûr(e) de vouloir supprimer cet événement ? Cette action est irréversible.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  // Charger les participants qui ont réservé
  useEffect(() => {
    const loadParticipants = async () => {
      try {
        const ticketsRef = collection(db, 'tickets');
        const q = query(ticketsRef, where('eventId', '==', event.id));
        const snapshot = await getDocs(q);
        
        const participantsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        setParticipants(participantsList);

        if (event.capacity && event.capacity > 0) {
          const confirmed = participantsList.filter((p: any) => p.status === 'confirmed').length;
          setEventFull(confirmed >= event.capacity);
        }
      } catch (error) {
        console.error('Error loading participants:', error);
      } finally {
        setLoadingParticipants(false);
      }
    };
    loadParticipants();
  }, [event.id]);

  useEffect(() => {
    if (!user || !event.id) return;
    getMyWaitlistEntry(event.id).then(setWaitlistEntry).catch(() => {});
  }, [user, event.id]);

  // Charger les avis
  useEffect(() => {
    const loadReviews = async () => {
      try {
        const [reviewsData, statsData] = await Promise.all([
          getEventReviews(event.id, 1, 5),
          getEventReviewStats(event.id),
        ]);
        setReviews(reviewsData.reviews);
        setReviewStats(statsData);
      } catch (error) {
        console.error('Error loading reviews:', error);
      } finally {
        setLoadingReviews(false);
      }
    };
    loadReviews();
  }, [event.id]);

  // Vérifier si l'événement est dans les favoris
  useEffect(() => {
    const checkFavorite = async () => {
      if (!user) {
        setCheckingFavorite(false);
        return;
      }
      try {
        const favorite = await isFavorite(event.id);
        setIsLiked(favorite);
      } catch (error) {
        console.error('Error checking favorite:', error);
      } finally {
        setCheckingFavorite(false);
      }
    };
    checkFavorite();
  }, [user, event.id]);

  // Vérifier l'inscription aux événements externes
  useEffect(() => {
    const checkExternalRegistration = async () => {
      if (!user || !event.id.startsWith('external_')) {
        setCheckingExternalRegistration(false);
        return;
      }
      try {
        const result = await checkExternalEventRegistration(event.id);
        setIsExternalRegistered(result.isRegistered);
      } catch (error) {
        console.error('Error checking external registration:', error);
      } finally {
        setCheckingExternalRegistration(false);
      }
    };
    checkExternalRegistration();
  }, [user, event.id]);

  // Vérifier si l'utilisateur a déjà un billet pour cet événement
  useEffect(() => {
    const checkExistingTicket = async () => {
      if (!user) {
        setCheckingTicket(false);
        return;
      }
      try {
        const ticketsRef = collection(db, 'tickets');
        const q = query(
          ticketsRef,
          where('userId', '==', user.uid),
          where('eventId', '==', event.id)
        );
        const snapshot = await getDocs(q);
        setHasTicket(!snapshot.empty);
      } catch (error) {
        console.error('Error checking ticket:', error);
      } finally {
        setCheckingTicket(false);
      }
    };
    checkExistingTicket();
  }, [user, event.id]);

  /** Partage l'événement via la Share API native. Le message est formaté avec emojis pour un rendu attractif sur les réseaux sociaux. */
  const handleShare = async () => {
    try {
      const message = `🎉 ${event.title}\n\n📅 ${event.date}${event.time ? ` à ${event.time}` : ''}\n📍 ${event.location}\n\nDécouvrez cet événement sur EventHub !`;
      const result = await Share.share({
        message: message,
        title: event.title,
      });
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de partager l\'événement');
    }
  };

  /** Gère l'inscription/désinscription pour les événements externes (Ticketmaster). Toggle l'état et synchronise avec le backend. */
  const handleExternalRegistration = async () => {
    if (!user) {
      Alert.alert('Connexion requise', 'Connecte-toi pour t\'inscrire à cet événement.');
      return;
    }

    setIsRegistering(true);
    try {
      if (isExternalRegistered) {
        // Annuler l'inscription
        await cancelExternalEventRegistration(event.id);
        setIsExternalRegistered(false);
        Alert.alert('Inscription annulée', 'Tu n\'es plus inscrit à cet événement.');
      } else {
        // S'inscrire
        await registerForExternalEvent({
          externalEventId: event.id,
          eventTitle: event.title,
          eventDate: event.date || '',
          eventLocation: event.location,
        });
        setIsExternalRegistered(true);
        Alert.alert('Inscription réussie !', 'Tu es maintenant inscrit à cet événement. Tu peux voir les autres participants.');
      }
    } catch (error: any) {
      console.error('External registration error:', error);
      const message = error?.response?.data?.message || error?.message || 'Une erreur est survenue';
      Alert.alert('Erreur', message);
    } finally {
      setIsRegistering(false);
    }
  };

  /** Ouvre l'adresse dans Google Maps via une URL web universelle (fonctionne sur iOS et Android sans distinction de schéma). */
  const openAddressInMaps = () => {
    const address = (event.location || event.address || '').trim();
    if (!address) {
      Alert.alert('Adresse', 'Aucune adresse disponible pour cet événement.');
      return;
    }
    const encoded = encodeURIComponent(address);
    const url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url).catch(() => {
          Alert.alert('Erreur', 'Impossible d\'ouvrir la carte.');
        });
      } else {
        Linking.openURL(url).catch(() => {
          Alert.alert('Erreur', 'Impossible d\'ouvrir la carte.');
        });
      }
    }).catch(() => Linking.openURL(url));
  };

  /** Ouvre Google Calendar avec les informations de l'événement pré-remplies (titre, date, lieu). */
  const handleAddToCalendar = () => {
    // Extraire la date de l'événement
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    try {
      // Essayer de parser la date depuis le format français
      const dateStr = event.date;
      if (dateStr) {
        startDate = new Date(dateStr);
        if (isNaN(startDate.getTime())) {
          // Si le parsing échoue, utiliser la date actuelle + 7 jours comme placeholder
          startDate = new Date();
          startDate.setDate(startDate.getDate() + 7);
        }
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() + 7);
      }
      
      // Parser l'heure si disponible
      if (event.time) {
        const timeMatch = event.time.match(/(\d{2}):(\d{2})/);
        if (timeMatch) {
          startDate.setHours(parseInt(timeMatch[1] ?? '0'), parseInt(timeMatch[2] ?? '0'), 0);
          endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 2); // Durée par défaut de 2h
        }
      } else {
        startDate.setHours(19, 0, 0); // 19h par défaut
        endDate = new Date(startDate);
        endDate.setHours(21, 0, 0);
      }
    } catch (error) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);
      startDate.setHours(19, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(21, 0, 0);
    }

    // Format pour les URLs de calendrier
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-/g, '').replace(/:/g, '').split('.')[0] + 'Z';
    };

    const start = formatDate(startDate);
    const end = endDate ? formatDate(endDate) : formatDate(new Date(startDate.getTime() + 2 * 60 * 60 * 1000));
    
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description || '');
    const location = encodeURIComponent(event.location || '');
    
    // Créer l'URL pour Google Calendar
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
    
    // Ouvrir le calendrier
    Linking.openURL(googleCalendarUrl).catch(() => {
      Alert.alert(
        'Ajouter au calendrier',
        `Pour ajouter cet événement à votre calendrier, copiez ces informations :\n\n${event.title}\n${event.date}${event.time ? ` à ${event.time}` : ''}\n${event.location}`,
        [{ text: 'OK' }]
      );
    });
  };

  /**
   * Gère la réservation d'un billet. Crée un document ticket dans Firestore avec
   * un code unique et un QR code. Affiche une modale de confirmation avec le code.
   */
  const handleJoinWaitlist = async () => {
    if (!user) {
      Alert.alert('Connexion requise', 'Connecte-toi pour rejoindre la liste d\'attente.');
      return;
    }
    setJoiningWaitlist(true);
    try {
      if (waitlistEntry) {
        await leaveWaitlist(event.id);
        setWaitlistEntry(null);
        Alert.alert('Retiré', 'Tu as quitté la liste d\'attente.');
      } else {
        const entry = await joinWaitlist(event.id, event.title);
        setWaitlistEntry(entry);
        Alert.alert('Liste d\'attente', `Tu es en position ${entry.position}. Tu seras notifié(e) si une place se libère !`);
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de rejoindre la liste d\'attente.');
    } finally {
      setJoiningWaitlist(false);
    }
  };

  const doRegister = async () => {
    setIsRegistering(true);
    try {
      const ticketCode = generateTicketCode();
      const formattedDate = parseEventDate(event.date || '');
      
      await addDoc(collection(db, 'tickets'), {
        code: ticketCode,
        eventId: event.id || '',
        eventTitle: event.title || '',
        eventDate: formattedDate,
        eventTime: event.time || '',
        eventLocation: event.location || '',
        userId: user!.uid,
        participantName: user!.displayName || 'Participant',
        participantEmail: user!.email || '',
        ticketType: 'Gratuit',
        price: 0,
        status: 'confirmed',
        checkedIn: false,
        checkedInAt: null,
        purchasedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      for (let i = 1; i < quantity; i++) {
        const extraCode = generateTicketCode();
        await addDoc(collection(db, 'tickets'), {
          code: extraCode,
          eventId: event.id || '',
          eventTitle: event.title || '',
          eventDate: formattedDate,
          eventTime: event.time || '',
          eventLocation: event.location || '',
          userId: user!.uid,
          participantName: user!.displayName || 'Participant',
          participantEmail: user!.email || '',
          ticketType: 'Gratuit',
          price: 0,
          status: 'confirmed',
          checkedIn: false,
          checkedInAt: null,
          purchasedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setHasTicket(true);
      setTicketCodeModal(ticketCode);

      if (Platform.OS !== 'web') {
        try {
          const dateStr = event.date || '';
          const eventDateObj = new Date(dateStr);
          if (!isNaN(eventDateObj.getTime())) {
            if (event.time) {
              const tm = event.time.match(/(\d{2}):(\d{2})/);
              if (tm) eventDateObj.setHours(parseInt(tm[1] ?? '0'), parseInt(tm[2] ?? '0'), 0);
            }
            await scheduleEventReminder(event.id || '', event.title || '', eventDateObj, 1440);
          }
        } catch (_) {}
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      if (Platform.OS === 'web') {
        window.alert('Impossible de réserver. Réessaie.');
      } else {
        Alert.alert('Erreur', 'Impossible de réserver. Réessaie.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const doRegisterPaid = async () => {
    setIsRegistering(true);
    try {
      const ticketCode = generateTicketCode();
      const formattedDate = parseEventDate(event.date || '');

      const ticketRef = await addDoc(collection(db, 'tickets'), {
        code: ticketCode,
        eventId: event.id || '',
        eventTitle: event.title || '',
        eventDate: formattedDate,
        eventTime: event.time || '',
        eventLocation: event.location || '',
        userId: user!.uid,
        participantName: user!.displayName || 'Participant',
        participantEmail: user!.email || '',
        ticketType: 'Standard',
        price: event.price ?? 0,
        status: 'pending_payment',
        checkedIn: false,
        checkedInAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      navigation.navigate('Payment', {
        eventId: event.id || '',
        eventTitle: event.title || '',
        amount: (event.price || 0) * quantity,
        ticketId: ticketRef.id,
        eventDate: event.date || '',
        eventTime: event.time || '',
        quantity,
      });
    } catch (error: any) {
      console.error('Paid registration error:', error);
      if (Platform.OS === 'web') {
        window.alert('Impossible de réserver. Réessaie.');
      } else {
        Alert.alert('Erreur', 'Impossible de réserver. Réessaie.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleGetTicket = async () => {
    if (!user) {
      if (Platform.OS === 'web') {
        window.alert('Tu dois être connecté pour obtenir un billet.');
      } else {
        Alert.alert('Connexion requise', 'Tu dois être connecté pour obtenir un billet.');
      }
      return;
    }

    if (hasTicket) {
      if (Platform.OS === 'web') {
        window.alert('Tu as déjà un billet pour cet événement. Consulte "Mes billets".');
      } else {
        Alert.alert('Déjà inscrit', 'Tu as déjà un billet pour cet événement. Consulte "Mes billets".');
      }
      return;
    }

    const isPaid = !event.isFree && event.price && event.price > 0;

    if (Platform.OS === 'web') {
      const msg = isPaid
        ? `Confirmes-tu la réservation de "${event.title}" pour ${event.price?.toFixed(2)} € ?`
        : `Veux-tu t'inscrire à "${event.title}" ?`;
      const confirmed = window.confirm(msg);
      if (confirmed) {
        isPaid ? await doRegisterPaid() : await doRegister();
      }
    } else if (isPaid) {
      Alert.alert(
        'Confirmer la réservation',
        `Confirmes-tu la réservation de "${event.title}" pour ${event.price?.toFixed(2)} € ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: `Payer ${event.price?.toFixed(2)} €`, onPress: doRegisterPaid },
        ]
      );
    } else {
      Alert.alert(
        'Confirmer l\'inscription',
        `Veux-tu t'inscrire à "${event.title}" ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', onPress: doRegister },
        ]
      );
    }
  };


  /** Retourne le nom d'icône Ionicons correspondant à la catégorie de l'événement, avec un fallback calendrier générique. */
  const getCategoryIcon = () => {
    const category = event.category?.toLowerCase() || '';
    if (category.includes('music') || category.includes('musique')) return 'musical-notes';
    if (category.includes('sport')) return 'football';
    if (category.includes('tech')) return 'laptop';
    if (category.includes('art')) return 'color-palette';
    if (category.includes('food') || category.includes('cuisine')) return 'restaurant';
    return 'calendar';
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Grande image de l'événement avec gradient overlay */}
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: normalizeImageUrl(event.coverImage) }}
          style={{ width: '100%', height: 320 }}
          resizeMode="cover"
        />
        
        {/* Gradient overlay pour meilleure lisibilité */}
        <LinearGradient
          colors={[
            'rgba(0, 0, 0, 0.3)',
            'transparent',
            'rgba(0, 0, 0, 0.7)',
          ]}
          locations={[0, 0.5, 1]}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        
        {/* Boutons header avec glassmorphism */}
        <View style={{
          position: 'absolute',
          top: Platform.OS === 'ios' ? 50 : 20,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
        }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={async () => {
                try {
                  const favorite = await toggleFavorite(event.id, event);
                  setIsLiked(favorite);
                } catch (error) {
                  console.error('Error toggling favorite:', error);
                }
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={24} 
                color={isLiked ? "#FF6B6B" : "#000000"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleShare}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Ionicons name="share-outline" size={24} color="#000000" />
            </TouchableOpacity>

            {isOwner ? (
              <TouchableOpacity
                onPress={handleDeleteEvent}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(255, 70, 70, 0.95)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      {/* Contenu scrollable */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={{ padding: 20 }}>
          {/* Badge catégorie avec gradient */}
          <View
            style={{
              alignSelf: 'flex-start',
              marginBottom: 16,
              borderRadius: 20,
              overflow: 'hidden',
              shadowColor: '#7B5CFF',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <LinearGradient
              colors={['#7B5CFF', '#9B7FFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}
            >
              <Ionicons name={getCategoryIcon()} size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={{
                fontSize: 13,
                fontWeight: '700',
                color: '#FFFFFF',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                {event.category || 'Musique'}
              </Text>
            </LinearGradient>
          </View>

          {/* Titre */}
          <Text style={{
            fontSize: 24,
            fontWeight: '700',
            color: theme.text,
            marginBottom: 16,
            lineHeight: 32,
          }}>
            {event.title}
          </Text>

          {/* Organisateur avec bouton Suivre */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.primaryLight + '20',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '700',
                color: '#7B5CFF',
              }}>
                {(organizerDisplayName || 'O').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 12,
                color: theme.textSecondary,
              }}>
                Par
              </Text>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: theme.text,
              }}>
                {organizerDisplayName}
              </Text>
            </View>
            {event.organizerId && !isOwner ? (
              <TouchableOpacity
                onPress={async () => {
                  if (sendingFollowRequest || followRequestSent) return;
                  setSendingFollowRequest(true);
                  try {
                    await sendFriendRequest(event.organizerId!);
                    setFollowRequestSent(true);
                    const successMsg = `Demande de suivi envoyée à ${organizerDisplayName}. Vous pourrez discuter une fois qu'elle sera acceptée.`;
                    if (Platform.OS === 'web') {
                      window.alert(successMsg);
                    } else {
                      Alert.alert('Demande envoyée', successMsg);
                    }
                  } catch (error: any) {
                    const code = error?.code || '';
                    const msg = error?.message || error?.response?.data?.message || '';
                    const isAlreadyExists = code.includes('already-exists') || msg.includes('déjà amis') || msg.includes('already-exists');
                    const isPending = msg.includes('déjà en cours') || msg.includes('en cours');
                    if (isAlreadyExists || isPending) {
                      setFollowRequestSent(true);
                      const infoMsg = isAlreadyExists && !isPending
                        ? 'Vous êtes déjà amis avec cet organisateur'
                        : 'Une demande est déjà en attente';
                      if (Platform.OS === 'web') {
                        window.alert(infoMsg);
                      } else {
                        Alert.alert('Info', infoMsg);
                      }
                    } else {
                      const errMsg = msg || "Impossible d'envoyer la demande de suivi";
                      if (Platform.OS === 'web') {
                        window.alert(errMsg);
                      } else {
                        Alert.alert('Erreur', errMsg);
                      }
                    }
                  } finally {
                    setSendingFollowRequest(false);
                  }
                }}
                disabled={sendingFollowRequest || followRequestSent}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: followRequestSent ? theme.textMuted : '#7B5CFF',
                  opacity: sendingFollowRequest ? 0.6 : 1,
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: followRequestSent ? theme.textMuted : '#7B5CFF',
                }}>
                  {followRequestSent ? 'Demande envoyée' : sendingFollowRequest ? 'Envoi…' : 'Suivre'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Date et heure */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: 16,
          }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: theme.primaryLight + '20',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="calendar" size={20} color="#7B5CFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.text,
                marginBottom: 4,
              }}>
                {event.date}
              </Text>
              <Text style={{
                fontSize: 14,
                color: theme.textSecondary,
              }}>
                {event.time || '20:00 - 23:30'}
              </Text>
            </View>
          </View>

          {/* Lieu */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: 16,
          }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: theme.primaryLight + '20',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="location" size={20} color="#7B5CFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.text,
                marginBottom: 4,
              }}>
                {event.location}
              </Text>
              <TouchableOpacity onPress={openAddressInMaps}>
                <Text style={{
                  fontSize: 14,
                  color: '#7B5CFF',
                  fontWeight: '600',
                }}>
                  Voir sur la carte
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Nombre de personnes inscrites */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: theme.primaryLight + '20',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="people" size={20} color="#7B5CFF" />
            </View>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: theme.text,
            }}>
              {participants.length} {t('participants')}
            </Text>
          </View>

          {/* Section À propos */}
          <Text style={{
            fontSize: 18,
            fontWeight: '700',
            color: theme.text,
            marginBottom: 12,
          }}>
            À propos
          </Text>
          <Text style={{
            fontSize: 14,
            color: theme.textSecondary,
            lineHeight: 22,
            marginBottom: 8,
          }}>
            {(() => {
              const desc = event.description || '';
              const maxCollapsed = 150;
              const shouldTruncate = desc.length > maxCollapsed;
              const text = shouldTruncate && !descriptionExpanded
                ? desc.slice(0, maxCollapsed).trim() + '...'
                : desc;
              return (
                <>
                  {text}
                  {shouldTruncate && (
                    <Text
                      style={{ color: '#7B5CFF', fontWeight: '600' }}
                      onPress={() => setDescriptionExpanded((v) => !v)}
                    >
                      {' '}{descriptionExpanded ? t('seeLess') : t('seeMore')}
                    </Text>
                  )}
                </>
              );
            })()}
          </Text>

          {/* Carte */}
          <TouchableOpacity
            onPress={openAddressInMaps}
            activeOpacity={0.8}
            style={{
              width: '100%',
              height: 150,
              borderRadius: 16,
              backgroundColor: theme.surface,
              marginBottom: 24,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: theme.border || 'rgba(0,0,0,0.08)',
            }}
          >
            <Ionicons name="map" size={40} color="#7B5CFF" />
            <Text style={{
              fontSize: 14,
              color: theme.textSecondary,
              marginTop: 8,
            }}>
              Voir sur la carte
            </Text>
            {(event.location || event.address) ? (
              <Text style={{
                fontSize: 12,
                color: theme.textSecondary,
                marginTop: 4,
                paddingHorizontal: 16,
                textAlign: 'center',
              }} numberOfLines={2}>
                {event.location || event.address}
              </Text>
            ) : null}
          </TouchableOpacity>

          {/* Section Qui y va ? */}
          {participants.length > 0 ? (
            <View style={{ marginTop: 24 }}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: theme.text,
                }}>
                  Qui y va ?
                </Text>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: theme.textSecondary,
                }}>
                  {participants.length} {t('participants')}
                </Text>
              </View>
              
              {/* Liste des participants avec boutons d'ajout */}
              <View style={{ gap: 12 }}>
                {participants.slice(0, 3).map((participant) => (
                  <View
                    key={participant.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.card,
                      padding: 12,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    {/* Avatar */}
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: '#7B5CFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}>
                      <Text style={{
                        fontSize: 18,
                        fontWeight: '700',
                        color: '#FFFFFF',
                      }}>
                        {(participant.participantName || 'P').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    
                    {/* Infos participant */}
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: theme.text,
                        marginBottom: 2,
                      }}>
                        {participant.participantName || 'Participant'}
                      </Text>
                      <Text style={{
                        fontSize: 13,
                        color: theme.textSecondary,
                      }}>
                        Participe à l'événement
                      </Text>
                    </View>
                    
                    {/* Bouton ajouter ami */}
                    {participant.userId !== user?.uid ? (
                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            const { sendFriendRequest } = await import('../../services/friendsService');
                            await sendFriendRequest(participant.userId);
                            if (Platform.OS === 'web') {
                              window.alert(`Demande d'ami envoyée à ${participant.participantName}`);
                            } else {
                              Alert.alert('Demande envoyée', `Demande d'ami envoyée à ${participant.participantName}`);
                            }
                          } catch (error: any) {
                            const code = error?.code || '';
                            const msg = error?.message || '';
                            const isConflict = code.includes('already-exists') || msg.includes('déjà amis') || msg.includes('en cours');
                            const infoMsg = isConflict ? 'Vous êtes déjà amis ou une demande est en attente' : 'Impossible d\'envoyer la demande';
                            if (Platform.OS === 'web') {
                              window.alert(infoMsg);
                            } else {
                              Alert.alert(isConflict ? 'Info' : 'Erreur', infoMsg);
                            }
                          }
                        }}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: '#7B5CFF',
                          backgroundColor: `${theme.primary}10`,
                        }}
                      >
                        <Ionicons name="person-add" size={18} color="#7B5CFF" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
                
                {/* Bouton "Voir tous les participants" */}
                {participants.length > 3 ? (
                  <TouchableOpacity
                    style={{
                      paddingVertical: 12,
                      alignItems: 'center',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.card,
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: theme.primary,
                    }}>
                      {t('seeAll')} ({participants.length})
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Section Avis */}
          <View style={{ marginTop: 24 }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: theme.text,
              }}>
                {t('reviews')}
              </Text>
              {reviewStats && reviewStats.totalReviews > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: theme.text,
                    marginLeft: 4,
                  }}>
                    {reviewStats.averageRating.toFixed(1)} ({reviewStats.totalReviews})
                  </Text>
                </View>
              ) : null}
            </View>

            {loadingReviews ? (
              <ActivityIndicator color={theme.primary} />
            ) : reviews.length > 0 ? (
              <View>
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} theme={theme} />
                ))}
                {reviewStats && reviewStats.totalReviews > reviews.length ? (
                  <TouchableOpacity
                    style={{
                      paddingVertical: 12,
                      alignItems: 'center',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.card,
                      marginTop: 8,
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: theme.primary,
                    }}>
                      {t('seeAll')} ({reviewStats.totalReviews})
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <View style={{
                padding: 20,
                alignItems: 'center',
                backgroundColor: theme.card,
                borderRadius: 12,
              }}>
                <Ionicons name="chatbubble-outline" size={32} color={theme.textSecondary} />
                <Text style={{
                  fontSize: 14,
                  color: theme.textSecondary,
                  marginTop: 8,
                }}>
                  {t('noReviews')}
                </Text>
              </View>
            )}

            {hasTicket ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('AddReview', { eventId: event.id, eventTitle: event.title })}
                style={{
                  marginTop: 16,
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  backgroundColor: theme.primary,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="star" size={20} color="#FFFFFF" />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#FFFFFF',
                  marginLeft: 8,
                }}>
                  {t('addReview')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Footer fixe avec prix et bouton gradient */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.surface,
        paddingHorizontal: 20,
        paddingVertical: 20,
        paddingBottom: Platform.OS === 'ios' ? 36 : 20,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
      }}>
        <View>
          <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 6, fontWeight: '600', letterSpacing: 1 }}>PRIX</Text>
          <Text style={{ fontSize: 28, fontWeight: '900', color: theme.text }}>
            {event.isFree ? 'Gratuit' : `${((event.price || 0) * quantity).toFixed(2)} €`}
          </Text>
          {!event.isFree && quantity > 1 && (
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
              {quantity} × {(event.price || 0).toFixed(2)} €
            </Text>
          )}
          {!hasTicket && !eventFull && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 }}>
              <TouchableOpacity
                onPress={() => setQuantity(q => Math.max(1, q - 1))}
                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: theme.border, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 18, color: theme.text, lineHeight: 22 }}>-</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, minWidth: 20, textAlign: 'center' }}>{quantity}</Text>
              <TouchableOpacity
                onPress={() => {
                  const maxQty = event.capacity ? Math.max(1, event.capacity - participants.filter((p: any) => p.status === 'confirmed').length) : 10;
                  setQuantity(q => Math.min(maxQty, q + 1));
                }}
                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 18, color: '#fff', lineHeight: 22 }}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <View
          style={{
            borderRadius: 24,
            overflow: 'hidden',
            shadowColor: hasTicket ? '#9CA3AF' : '#7B5CFF',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          {eventFull && !hasTicket ? (
            <TouchableOpacity
              onPress={handleJoinWaitlist}
              disabled={joiningWaitlist}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={waitlistEntry ? ['#F59E0B', '#FBBF24'] : ['#6B7280', '#9CA3AF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingHorizontal: 32,
                  paddingVertical: 16,
                  minWidth: 180,
                  alignItems: 'center',
                  borderRadius: 0,
                }}
              >
                {joiningWaitlist ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                      {waitlistEntry ? `Liste d'attente — pos. ${waitlistEntry.position}` : 'Rejoindre la liste d\'attente'}
                    </Text>
                    {waitlistEntry && (
                      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                        Appuie pour quitter la liste
                      </Text>
                    )}
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleGetTicket}
              disabled={isRegistering || checkingTicket || hasTicket}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={hasTicket ? ['#9CA3AF', '#9CA3AF'] : ['#7B5CFF', '#9B7FFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingHorizontal: 32,
                  paddingVertical: 16,
                  minWidth: 180,
                  alignItems: 'center',
                }}
              >
                {isRegistering || checkingTicket ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                    {hasTicket
                      ? t('alreadyRegistered')
                      : (!event.isFree && event.price && event.price > 0)
                        ? `Payer ${event.price.toFixed(2)} €`
                        : t('bookMySpot')}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal
        visible={!!ticketCodeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setTicketCodeModal(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setTicketCodeModal(null)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={{
            backgroundColor: theme.surface,
            borderRadius: 20,
            padding: 24,
            alignItems: 'center',
            width: '100%',
            maxWidth: 320,
          }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, marginBottom: 8 }}>Ton billet 🎫</Text>
            <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 16, textAlign: 'center' }}>
              Présente ce code ou le QR à l'entrée. Retrouve-le dans "Mes billets".
            </Text>
            {ticketCodeModal && (
              <View style={{ marginBottom: 20 }}>
                <QRCode value={ticketCodeModal} size={160} />
              </View>
            )}
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#7B5CFF', letterSpacing: 2, marginBottom: 24 }}>
              {ticketCodeModal}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => { setTicketCodeModal(null); navigation.navigate('MyTickets'); }}
                style={{ backgroundColor: '#7B5CFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Mes billets</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTicketCodeModal(null)}
                style={{ backgroundColor: theme.border, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}
              >
                <Text style={{ color: theme.text, fontWeight: '600' }}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};


export default EventDetailsScreen;
