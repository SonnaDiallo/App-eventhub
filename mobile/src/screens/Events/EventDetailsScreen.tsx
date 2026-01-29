// mobile/src/screens/Events/EventDetailsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
  Share,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { isFavorite, toggleFavorite } from '../../services/favoritesService';
import { joinEvent } from '../../services/eventsService';
import { useTheme } from '../../theme/ThemeContext';

const { width } = Dimensions.get('window');

type EventDetailsRouteProp = RouteProp<AuthStackParamList, 'EventDetails'>;

const defaultEvent = {
  id: '000000000000000000000001',
  title: 'Festival de Musique Électronique',
  coverImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
  date: 'Mardi 28 Octobre, 2024',
  time: '19:00 - 02:00',
  location: 'Grand Palais Éphémère',
  address: 'Paris, France',
  organizer: 'Urban Beats Prod.',
  description: 'Plongez au cœur de la scène électronique avec les plus grands DJs du moment. Une expérience immersive avec des visuels époustouflants et un sound system de pointe.',
  price: 49.99,
  isFree: false,
};

// Génère un code unique pour le billet
const generateTicketCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const EventDetailsScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<EventDetailsRouteProp>();
  const [isLiked, setIsLiked] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);
  const [checkingTicket, setCheckingTicket] = useState(true);
  const [checkingFavorite, setCheckingFavorite] = useState(true);

  // Récupérer les données de l'événement depuis les paramètres ou utiliser les valeurs par défaut
  const event = route.params?.event || defaultEvent;
  const user = auth.currentUser;

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

  // Partager l'événement
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

  // Ouvrir l'adresse dans l'application Cartes (Google Maps / Apple Maps)
  const openAddressInMaps = () => {
    const address = event.location || event.address;
    if (!address || !address.trim()) {
      Alert.alert('Adresse', 'Aucune adresse disponible pour cet événement.');
      return;
    }
    const encoded = encodeURIComponent(address.trim());
    // URL universelle : ouvre Google Maps (ou l'app Maps par défaut sur iOS)
    const url = Platform.select({
      ios: `maps:0,0?q=${encoded}`,
      android: `geo:0,0?q=${encoded}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    });
    Linking.openURL(url).catch(() => {
      // Fallback : ouvrir la recherche Google Maps dans le navigateur
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`).catch(() => {
        Alert.alert('Erreur', 'Impossible d\'ouvrir la carte.');
      });
    });
  };

  // Ajouter au calendrier
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
          startDate.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0);
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

  // Inscription à l'événement et génération du billet
  const handleGetTicket = async () => {
    if (!user) {
      Alert.alert('Connexion requise', 'Tu dois être connecté pour obtenir un billet.');
      return;
    }

    if (hasTicket) {
      Alert.alert('Déjà inscrit', 'Tu as déjà un billet pour cet événement. Consulte "Mes billets".');
      return;
    }

    Alert.alert(
      'Confirmer l\'inscription',
      `Veux-tu t'inscrire à "${event.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setIsRegistering(true);
            try {
              // Si l'événement est dans la base backend (MongoDB), enregistrer la participation
              const isMongoId = /^[a-f0-9]{24}$/i.test(event.id);
              if (isMongoId) {
                try {
                  await joinEvent(event.id);
                } catch (apiErr: any) {
                  if (apiErr?.response?.status !== 404) {
                    console.warn('Join event API error:', apiErr?.message);
                  }
                }
              }

              const ticketCode = generateTicketCode();

              // Créer le billet dans Firestore (pour "Mes billets")
              await addDoc(collection(db, 'tickets'), {
                code: ticketCode,
                eventId: event.id,
                eventTitle: event.title,
                eventDate: event.date,
                eventTime: event.time,
                eventLocation: event.location,
                userId: user.uid,
                participantName: user.displayName || 'Participant',
                participantEmail: user.email,
                ticketType: event.isFree ? 'Gratuit' : 'Standard',
                price: event.price,
                checkedIn: false,
                checkedInAt: null,
                purchasedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
              });

              setHasTicket(true);
              Alert.alert(
                'Inscription réussie ! 🎉',
                `Ton billet (${ticketCode}) a été généré. Tu recevras un email avec ton billet. Tu peux aussi le retrouver dans "Mes billets".`,
                [{ text: 'OK' }]
              );
            } catch (error: any) {
              console.error('Registration error:', error);
              Alert.alert('Erreur', 'Impossible de créer le billet. Réessaie.');
            } finally {
              setIsRegistering(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header avec image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: event.coverImage }}
          style={styles.coverImage}
          resizeMode="cover"
        />
        
        {/* Overlay gradient */}
        <View style={styles.imageOverlay} />
        
        {/* Header buttons */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Détails de l'Événement</Text>
          
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={async () => {
                if (!user) {
                  Alert.alert('Connexion requise', 'Connectez-vous pour ajouter aux favoris');
                  return;
                }
                try {
                  const newFavoriteState = await toggleFavorite(event.id);
                  setIsLiked(newFavoriteState);
                } catch (error: any) {
                  Alert.alert('Erreur', 'Impossible de modifier les favoris');
                }
              }}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={22}
                color={isLiked ? '#FF4F8B' : '#FFFFFF'}
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerButton, { marginLeft: 8 }]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Contenu scrollable */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Titre */}
        <Text style={styles.title}>{event.title}</Text>

        {/* Date et heure */}
        <View style={styles.infoRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="calendar" size={18} color="#7B5CFF" />
          </View>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>{event.date}</Text>
            <Text style={styles.infoSubtitle}>{event.time}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="location" size={18} color="#7B5CFF" />
          </View>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>{event.location}</Text>
            <Text style={styles.infoSubtitle}>{event.address}</Text>
          </View>
        </View>

        {/* Organisateur */}
        <View style={styles.organizerContainer}>
          <View style={styles.organizerAvatar}>
            <Ionicons name="person" size={20} color="#7B5CFF" />
          </View>
          <View style={styles.organizerInfo}>
            <Text style={styles.organizerLabel}>Organisé par</Text>
            <Text style={styles.organizerName}>{event.organizer}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.calendarButton}
          onPress={() => navigation.navigate('Participants', { eventId: event.id })}
        >
          <Ionicons name="people-outline" size={20} color="#7B5CFF" />
          <Text style={styles.calendarButtonText}>Voir les participants</Text>
        </TouchableOpacity>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>À propos de l'événement</Text>
          <Text style={styles.description}>
            {event.description}
            <Text style={styles.readMore}> Lire la suite</Text>
          </Text>
        </View>

        {/* Ajouter au calendrier */}
        <TouchableOpacity 
          style={styles.calendarButton}
          onPress={handleAddToCalendar}
        >
          <Ionicons name="calendar-outline" size={20} color="#7B5CFF" />
          <Text style={styles.calendarButtonText}>Ajouter au calendrier</Text>
        </TouchableOpacity>

        {/* Carte interactive (cliquable → ouvre l'app Cartes) */}
        <View style={styles.section}>
          {(event.location || event.address) ? (
            <TouchableOpacity
              style={styles.mapContainer}
              onPress={openAddressInMaps}
              activeOpacity={0.9}
            >
              <View style={styles.mapPlaceholder}>
                <Ionicons name="map" size={40} color="#7B5CFF" />
                <Text style={styles.mapPlaceholderText}>Carte interactive</Text>
                <Text style={styles.mapPlaceholderAddress} numberOfLines={2}>
                  {event.location || event.address}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.mapContainer}>
              <View style={styles.mapPlaceholder}>
                <Ionicons name="map" size={40} color="#7B5CFF" />
                <Text style={styles.mapPlaceholderText}>Adresse à préciser</Text>
              </View>
            </View>
          )}
        </View>

        {/* Espace pour le footer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer fixe avec prix et bouton */}
      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Billets à partir de</Text>
          <Text style={styles.price}>
            {event.isFree ? 'Gratuit' : `${event.price.toFixed(2)} €`}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.buyButton, (hasTicket || isRegistering) && styles.buyButtonDisabled]}
          onPress={handleGetTicket}
          disabled={isRegistering || checkingTicket}
        >
          {isRegistering || checkingTicket ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.buyButtonText}>
              {hasTicket ? 'Déjà inscrit ✓' : 'Obtenir un billet'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050016',
  },
  imageContainer: {
    height: 280,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 0, 22, 0.3)',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    marginTop: -30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#050016',
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    lineHeight: 32,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(123, 92, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  infoSubtitle: {
    fontSize: 13,
    color: '#A0A0C0',
  },
  organizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F23',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    marginBottom: 24,
  },
  organizerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(123, 92, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  organizerInfo: {
    flex: 1,
  },
  organizerLabel: {
    fontSize: 12,
    color: '#A0A0C0',
    marginBottom: 2,
  },
  organizerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#B0B0D0',
    lineHeight: 22,
  },
  readMore: {
    color: '#7B5CFF',
    fontWeight: '500',
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#7B5CFF',
    borderRadius: 12,
  },
  calendarButtonText: {
    color: '#7B5CFF',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F23',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1A1A3A',
  },
  locationCardIcon: {
    marginRight: 12,
  },
  locationCardText: {
    flex: 1,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 13,
    color: '#A0A0C0',
  },
  locationHint: {
    fontSize: 12,
    color: '#7B5CFF',
    marginTop: 6,
  },
  mapContainer: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0F0F23',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A1E',
    padding: 16,
  },
  mapPlaceholderText: {
    color: '#A0A0C0',
    fontSize: 14,
    marginTop: 8,
  },
  mapPlaceholderAddress: {
    color: '#7B5CFF',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: '#0A0A1E',
    borderTopWidth: 1,
    borderTopColor: '#1A1A3A',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#A0A0C0',
    marginBottom: 2,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buyButton: {
    backgroundColor: '#7B5CFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginLeft: 16,
    minWidth: 140,
    alignItems: 'center',
  },
  buyButtonDisabled: {
    backgroundColor: '#4A3A8A',
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default EventDetailsScreen;
