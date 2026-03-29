/**
 * @file FavoritesScreen.tsx
 * @description Écran affichant la liste des événements favoris de l'utilisateur.
 * Écoute en temps réel la sous-collection Firestore `users/{uid}/favorites`
 * pour synchroniser automatiquement l'ajout/suppression de favoris.
 * Chaque événement est récupéré individuellement depuis la collection `events`
 * et affiché sous forme de carte cliquable menant vers les détails.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeImageUrl } from '../../config/constants';
import type { AuthStackParamList, EventData } from '../../navigation/AuthNavigator';

const FavoritesScreen = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const [favoriteEventIds, setFavoriteEventIds] = useState<string[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      navigation.goBack();
      return;
    }

    // Écouter les favoris de l'utilisateur
    const favoritesRef = collection(db, 'users', user.uid, 'favorites');
    const unsubscribeFavorites = onSnapshot(
      favoritesRef,
      (snapshot) => {
        const ids = snapshot.docs.map((doc) => doc.id);
        setFavoriteEventIds(ids);
        loadFavoriteEvents(ids);
      },
      (error) => {
        console.error('Error loading favorites:', error);
        setLoading(false);
      }
    );

    return () => unsubscribeFavorites();
  }, [user]);

  /** Charge les documents d'événements depuis Firestore à partir des IDs favoris. Les événements supprimés sont silencieusement ignorés. */
  const loadFavoriteEvents = async (eventIds: string[]) => {
    if (eventIds.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      const eventsPromises = eventIds.map(async (eventId) => {
        // 1) Essayer de charger depuis la collection events (événements internes)
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          const data = eventDoc.data();
          return {
            id: eventDoc.id,
            title: data.title || 'Sans titre',
            coverImage: data.coverImage || 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800',
            date: data.startDate?.toDate?.()?.toLocaleDateString('fr-FR') || '',
            time: data.startDate?.toDate?.()?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) || '',
            location: data.location || '',
            address: data.location || '',
            organizer: data.organizerName || 'Organisateur',
            description: data.description || '',
            price: data.price || 0,
            isFree: data.isFree || false,
          } as EventData;
        }

        // 2) Fallback : utiliser les données stockées dans le document favori
        if (user) {
          const favDoc = await getDoc(doc(db, 'users', user.uid, 'favorites', eventId));
          if (favDoc.exists()) {
            const fav = favDoc.data();
            if (fav.title) {
              return {
                id: eventId,
                title: fav.title || 'Sans titre',
                coverImage: fav.coverImage || 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800',
                date: fav.date || '',
                time: fav.time || '',
                location: fav.location || '',
                address: fav.location || '',
                organizer: fav.organizer || 'Organisateur',
                description: fav.description || '',
                price: fav.price || 0,
                isFree: fav.isFree ?? true,
              } as EventData;
            }
          }
        }

        return null;
      });

      const loadedEvents = (await Promise.all(eventsPromises)).filter((e) => e !== null) as EventData[];
      setEvents(loadedEvents);
    } catch (error: any) {
      console.error('Error loading favorite events:', error);
    } finally {
      setLoading(false);
    }
  };

  /** Prépare l'objet événement pour la navigation en supprimant _startDate (non sérialisable par React Navigation). */
  const eventForNav = (e: EventData & { _startDate?: Date }) => {
    const { _startDate, ...rest } = e;
    return rest;
  };

  /** Rendu d'une carte événement favori avec image, prix, date et lieu. Le tap navigue vers l'écran de détails. */
  const renderEvent = ({ item }: { item: EventData }) => {
    const priceLabel = item.isFree ? 'Gratuit' : `${(item.price || 0).toFixed(2)} €`;
    
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('EventDetails', { event: eventForNav(item) })}
        style={[
          styles.eventCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <Image source={{ uri: normalizeImageUrl(item.coverImage) }} style={styles.eventImage} />
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <Text style={[styles.eventTitle, { color: theme.text }]}>{item.title}</Text>
            <View
              style={[
                styles.priceBadge,
                {
                  backgroundColor: `${theme.primary}26`,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.priceText, { color: theme.primary }]}>{priceLabel}</Text>
            </View>
          </View>

          <View style={styles.eventInfo}>
            <Ionicons name="calendar-outline" size={16} color={theme.primary} />
            <Text style={[styles.eventInfoText, { color: theme.textSecondary }]}>
              {item.date} · {item.time}
            </Text>
          </View>

          <View style={styles.eventInfo}>
            <Ionicons name="location-outline" size={16} color={theme.primary} />
            <Text style={[styles.eventInfoText, { color: theme.textSecondary }]}>{item.location}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.header,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('myFavorites')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color={theme.textMuted} style={{ opacity: 0.3 }} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('noFavorites')}</Text>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            {t('noFavoritesDesc')}
          </Text>
          <TouchableOpacity
            style={[styles.browseButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('HomeParticipant')}
          >
            <Text style={[styles.browseButtonText, { color: theme.buttonPrimaryText }]}>
              {t('browseEvents')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 22,
  },
  eventCard: {
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 160,
  },
  eventContent: {
    padding: 14,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
    paddingRight: 12,
  },
  priceBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '800',
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  eventInfoText: {
    fontSize: 13,
  },
});

export default FavoritesScreen;
