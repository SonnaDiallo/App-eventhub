// mobile/src/screens/Events/EventDetailsScreen.tsx
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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import QRCode from 'react-native-qrcode-svg';
import { auth, db } from '../../services/firebase';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { isFavorite, toggleFavorite } from '../../services/favoritesService';
import { joinEvent } from '../../services/eventsService';
import { 
  registerForExternalEvent, 
  cancelExternalEventRegistration, 
  checkExternalEventRegistration,
  type ExternalRegistration 
} from '../../services/externalRegistrationService';
import { useTheme } from '../../theme/ThemeContext';
import { createStyles } from './EventDetailsScreen.styles';

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

  // Récupérer les données de l'événement depuis les paramètres ou utiliser les valeurs par défaut
  const event = route.params?.event || defaultEvent;
  const organizerDisplayName =
    (event.organizer && typeof event.organizer === 'object' ? event.organizer?.name : event.organizer) ||
    event.organizerName ||
    'Organisateur';
  const user = auth.currentUser;

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
      } catch (error) {
        console.error('Error loading participants:', error);
      } finally {
        setLoadingParticipants(false);
      }
    };
    loadParticipants();
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

  // S'inscrire/annuler l'inscription à un événement externe
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
          eventDate: event.date,
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

  // Ouvrir l'adresse dans Google Maps (URL unique fiable sur iOS et Android)
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

  // Inscription à l'événement : API backend (billet créé côté serveur) ou Firestore pour événements externes
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
              const isExternalEvent = typeof event.id === 'string' && event.id.startsWith('external_');

              if (isExternalEvent) {
                const ticketCode = generateTicketCode();
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
                setTicketCodeModal(ticketCode);
                return;
              }

              const response = await joinEvent(event.id);
              setHasTicket(true);
              setTicketCodeModal(response.participation.ticketCode);
            } catch (error: any) {
              const status = error?.response?.status;
              const msg = error?.response?.data?.message || error?.message;
              if (status === 404) {
                Alert.alert('Événement introuvable', 'Cet événement n\'est plus disponible ou l\'inscription a échoué.');
              } else {
                console.error('Registration error:', error);
                Alert.alert('Erreur', msg || 'Impossible de réserver. Réessaie.');
              }
            } finally {
              setIsRegistering(false);
            }
          },
        },
      ]
    );
  };


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
      {/* Grande image de l'événement */}
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: event.coverImage }}
          style={{ width: '100%', height: 300 }}
          resizeMode="cover"
        />
        
        {/* Boutons header */}
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
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#000000" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleShare}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="share-outline" size={22} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Contenu scrollable */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={{ padding: 20 }}>
          {/* Badge catégorie */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.primaryLight + '20',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            alignSelf: 'flex-start',
            marginBottom: 12,
          }}>
            <Ionicons name={getCategoryIcon()} size={14} color="#7B5CFF" style={{ marginRight: 6 }} />
            <Text style={{
              fontSize: 12,
              fontWeight: '600',
              color: '#7B5CFF',
            }}>
              {event.category || 'Musique'}
            </Text>
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
            <TouchableOpacity
              style={{
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#7B5CFF',
              }}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#7B5CFF',
              }}>
                Suivre
              </Text>
            </TouchableOpacity>
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
              {participants.length} {participants.length > 1 ? 'personnes inscrites' : 'personne inscrite'}
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
                      {' '}{descriptionExpanded ? 'Voir moins' : 'Lire la suite'}
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
                numberOfLines: 2,
              }} numberOfLines={2}>
                {event.location || event.address}
              </Text>
            ) : null}
          </TouchableOpacity>

          {/* Section Qui y va ? */}
          {participants.length > 0 && (
            <View>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: theme.text,
                marginBottom: 16,
              }}>
                Qui y va ?
              </Text>
              
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                {/* Avatars des participants (max 5 visibles) */}
                {participants.slice(0, 5).map((participant, index) => (
                  <View
                    key={participant.id}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#7B5CFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: theme.background,
                      marginLeft: index > 0 ? -12 : 0,
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: '#FFFFFF',
                    }}>
                      {(participant.participantName || 'P').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                ))}
                
                {/* Compteur "+X autres" */}
                {participants.length > 5 && (
                  <View style={{
                    marginLeft: 12,
                  }}>
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: theme.textSecondary,
                    }}>
                      +{participants.length - 5} autres
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer fixe avec prix et bouton */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.surface,
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <View>
          <Text style={{
            fontSize: 12,
            color: theme.textSecondary,
            marginBottom: 4,
          }}>
            PRIX
          </Text>
          <Text style={{
            fontSize: 24,
            fontWeight: '700',
            color: theme.text,
          }}>
            {event.isFree ? 'Gratuit' : `${(event.price || 0).toFixed(2)} €`}
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={handleGetTicket}
          disabled={isRegistering || checkingTicket || hasTicket}
          style={{
            backgroundColor: hasTicket ? '#9CA3AF' : '#7B5CFF',
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 999,
            minWidth: 180,
            alignItems: 'center',
          }}
        >
          {isRegistering || checkingTicket ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={{
              fontSize: 16,
              fontWeight: '700',
              color: '#FFFFFF',
            }}>
              {hasTicket ? 'Déjà inscrit ✓' : 'Réserver ma place'}
            </Text>
          )}
        </TouchableOpacity>
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
