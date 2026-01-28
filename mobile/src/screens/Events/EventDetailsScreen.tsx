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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { isFavorite, toggleFavorite } from '../../services/favoritesService';
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
              const ticketCode = generateTicketCode();
              
              // Créer le billet dans Firestore
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
                `Ton billet (${ticketCode}) a été généré. Tu peux le retrouver dans "Mes billets".`,
                [{ text: 'OK' }]
              );

              // TODO: Envoyer email avec le billet via backend
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
            <TouchableOpacity style={[styles.headerButton, { marginLeft: 8 }]}>
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

        {/* Lieu */}
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
        <TouchableOpacity style={styles.calendarButton}>
          <Ionicons name="calendar-outline" size={20} color="#7B5CFF" />
          <Text style={styles.calendarButtonText}>Ajouter au calendrier</Text>
        </TouchableOpacity>

        {/* Carte */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lieu</Text>
          <View style={styles.mapContainer}>
            <Image
              source={{ uri: 'https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/2.3522,48.8566,13,0/400x200?access_token=pk.placeholder' }}
              style={styles.map}
              resizeMode="cover"
            />
            {/* Placeholder pour la carte */}
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map" size={40} color="#7B5CFF" />
              <Text style={styles.mapPlaceholderText}>Carte interactive</Text>
            </View>
          </View>
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
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A1E',
  },
  mapPlaceholderText: {
    color: '#A0A0C0',
    fontSize: 14,
    marginTop: 8,
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
