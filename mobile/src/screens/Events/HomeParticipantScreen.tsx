/**
 * @file HomeParticipantScreen.tsx
 * @description Écran d'accueil principal pour les participants. Point d'entrée de
 * l'application après connexion. Présente un header immersif avec image de fond,
 * une barre de recherche, un filtre par catégorie, un carrousel d'événements « À la une »,
 * une grille d'événements filtrés, et une liste « À venir ».
 *
 * Intègre également :
 * - Un compteur de notifications (messages non lus + demandes d'amis)
 * - Un sélecteur de ville (sauvegardé dans Firestore)
 * - Un menu de tri (date, prix, titre)
 * - Une barre de navigation inférieure (Explorer, Tickets, Chat, Favoris, Profil)
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, Image, Animated, Modal, ImageBackground, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { auth, db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getDefaultCategories, getCategoryName } from '../../services/categories';
import { useUserRole, canCreateEvents } from '../../hooks/useUserRole';
import { useEvents } from '../../hooks/useEvents';

import { EventCard } from '../../components/EventCard';
import { AnimatedFadeIn } from '../../components/AnimatedFadeIn';
import { SearchBar } from '../../components/SearchBar';
import { CategoryFilter } from '../../components/CategoryFilter';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { LocationPickerModal } from '../../components/LocationPickerModal';

import { filterEvents, sortEvents, type SortOption } from '../../utils/eventFilters';
import { eventForNav, ensureUniqueImages } from '../../utils/eventHelpers';
import { createStyles } from './HomeParticipantScreen.styles';
import { normalizeImageUrl } from '../../config/constants';

type Props = NativeStackScreenProps<AuthStackParamList, 'HomeParticipant'>;

const HomeParticipantScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const styles = createStyles(theme);
  const userRole = useUserRole();
  const categories = getDefaultCategories();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [userCity, setUserCity] = useState('Paris, FR');
  const [notificationCount, setNotificationCount] = useState(0);
  const [showAllFeatured, setShowAllFeatured] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const { events, loading } = useEvents({ 
    limit: selectedCategory ? undefined : 15, 
    category: selectedCategory || undefined,
    includeExternal: true,
    upcoming: true, // uniquement événements à venir (évite anciens événements type janvier en mars)
  });

  // Charger la ville de l'utilisateur depuis Firestore
  useEffect(() => {
    const loadUserCity = async () => {
      const user = auth.currentUser;
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.city) {
            setUserCity(userData.city);
          }
        }
      } catch (error) {
        console.error('Error loading user city:', error);
      }
    };
    loadUserCity();
  }, []);

  // Charger le nombre de notifications non lues
  useFocusEffect(
    useCallback(() => {
      const loadNotifications = async () => {
        const user = auth.currentUser;
        if (!user) return;
        
        try {
          // Importer les services pour compter toutes les notifications
          const { getConversations } = await import('../../services/chatService');
          const { getIncomingFriendRequests } = await import('../../services/friendsService');
          
          // Charger en parallèle les messages non lus et les demandes d'amis
          const [conversations, friendRequests] = await Promise.all([
            getConversations().catch(() => []),
            getIncomingFriendRequests().catch(() => []),
          ]);
          
          // Compter le total de messages non lus
          const unreadMessagesCount = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
          
          // Compter les demandes d'amis en attente
          const pendingRequestsCount = friendRequests.length;
          
          // Mettre à jour les états
          setUnreadMessages(unreadMessagesCount);
          setPendingRequests(pendingRequestsCount);
          
          // Total des notifications
          const total = unreadMessagesCount + pendingRequestsCount;
          setNotificationCount(total);
        } catch (error) {
          console.error('Error loading notifications:', error);
          // En cas d'erreur, ne pas afficher de badge
          setNotificationCount(0);
        }
      };
      loadNotifications();
    }, [])
  );

  /** Pipeline de filtrage et tri : recherche textuelle → filtre catégorie → tri sélectionné → déduplication images. */
  const filtered = useMemo(() => {
    const filteredEvents = filterEvents(events, searchQuery, selectedCategory);
    const sorted = sortEvents(filteredEvents, sortBy);
    return ensureUniqueImages(sorted);
  }, [events, searchQuery, selectedCategory, sortBy]);

  const featuredEvent = filtered.length > 0 ? filtered[0] : null;
  const otherEvents = filtered.length > 1 ? filtered.slice(1) : [];

  const renderSortMenu = () => {
    const sortOptions = [
      { value: 'date' as SortOption, label: 'Date (plus proche)', icon: 'calendar-outline' },
      { value: 'price-asc' as SortOption, label: 'Prix (croissant)', icon: 'arrow-up-outline' },
      { value: 'price-desc' as SortOption, label: 'Prix (décroissant)', icon: 'arrow-down-outline' },
      { value: 'title' as SortOption, label: 'Titre (A-Z)', icon: 'text-outline' },
    ];

    return (
      <Modal
        visible={showSortMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortMenu(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-start',
            paddingTop: Platform.OS === 'ios' ? 120 : 100,
            paddingHorizontal: 20,
          }}
          onPress={() => setShowSortMenu(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.sortMenu, { marginHorizontal: 0 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={styles.sortMenuTitle}>Trier par</Text>
                <TouchableOpacity onPress={() => setShowSortMenu(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    setSortBy(option.value);
                    setShowSortMenu(false);
                  }}
                  style={[
                    styles.sortOption,
                    sortBy === option.value && styles.sortOptionActive,
                  ]}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={20}
                    color={sortBy === option.value ? theme.primary : theme.textMuted}
                  />
                  <Text
                    style={[
                      styles.sortOptionText,
                      { color: sortBy === option.value ? theme.primary : theme.text },
                      sortBy === option.value && styles.sortOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {sortBy === option.value && (
                    <Ionicons name="checkmark-circle" size={22} color={theme.primary} style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderHeader = () => (
    <View style={{ position: 'relative', overflow: 'hidden' }}>
      <ImageBackground
        source={require('../../../assets/images/imagedefond.png')}
        style={{
          width: '100%',
        }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(124, 58, 237, 0.88)', 'rgba(124, 58, 237, 0.85)', 'rgba(124, 58, 237, 0.70)', 'rgba(124, 58, 237, 0.50)', theme.background]}
          locations={[0, 0.4, 0.7, 0.9, 1]}
          style={{
            paddingHorizontal: 20,
            paddingTop: Platform.OS === 'ios' ? 60 : 20,
            paddingBottom: 40,
          }}
        >
          {/* Ligne du haut : EventHub + Badge + Notification */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 28,
          }}>
            <Text style={{
              fontSize: 28,
              fontWeight: '900',
              color: '#FFFFFF',
              textShadowColor: 'rgba(0, 0, 0, 0.3)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 8,
            }}>
              EventHub
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => {
                  scrollViewRef.current?.scrollTo({ y: 600, animated: true });
                }}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  marginRight: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '600',
                }}>
                  Découvrez
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Map')}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  borderRadius: 999,
                  padding: 8,
                  marginRight: 8,
                }}
              >
                <Ionicons name="compass-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowNotificationMenu(true)}
                style={{
                  position: 'relative',
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  borderRadius: 999,
                  padding: 8,
                }}
              >
                <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                {notificationCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    backgroundColor: theme.error,
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{
                      color: theme.buttonPrimaryText,
                      fontSize: 10,
                      fontWeight: '700',
                    }}>
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Titre principal - halo violet (multi-couches) + texte net - compatible Android */}
          <View style={{ marginBottom: 20, position: 'relative' }}>
            {/* Halo : copies décalées en violet pour simuler le flou (Android ne supporte pas textShadowRadius) */}
            {[
              { x: -1, y: -1, o: 0.4 }, { x: 1, y: -1, o: 0.4 }, { x: -1, y: 1, o: 0.4 }, { x: 1, y: 1, o: 0.4 },
              { x: -2, y: -2, o: 0.3 }, { x: 2, y: -2, o: 0.3 }, { x: -2, y: 2, o: 0.3 }, { x: 2, y: 2, o: 0.3 },
              { x: -3, y: 0, o: 0.25 }, { x: 3, y: 0, o: 0.25 }, { x: 0, y: -3, o: 0.25 }, { x: 0, y: 3, o: 0.25 },
              { x: -4, y: -4, o: 0.2 }, { x: 4, y: -4, o: 0.2 }, { x: -4, y: 4, o: 0.2 }, { x: 4, y: 4, o: 0.2 },
            ].map(({ x, y, o }, i) => (
              <View key={i} style={{ position: 'absolute', top: y, left: x }}>
                <Text style={{
                  fontSize: 36,
                  fontWeight: '900',
                  color: theme.primary,
                  lineHeight: 42,
                  letterSpacing: 0.5,
                  opacity: o,
                }}>
                  Vivez des moments
                </Text>
                <Text style={{
                  fontSize: 36,
                  fontWeight: '900',
                  color: theme.primary,
                  lineHeight: 42,
                  letterSpacing: 0.5,
                  opacity: o,
                }}>
                  inoubliables
                </Text>
              </View>
            ))}
            {/* Texte net et lisible */}
            <View>
              <Text style={{
                fontSize: 36,
                fontWeight: '900',
                color: '#FFFFFF',
                lineHeight: 42,
                letterSpacing: 0.5,
              }}>
                Vivez des moments
              </Text>
              <Text style={{
                fontSize: 36,
                fontWeight: '900',
                color: '#FFD700',
                lineHeight: 42,
                letterSpacing: 0.5,
              }}>
                inoubliables
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={{
            fontSize: 14,
            fontWeight: '500',
            color: 'rgba(255, 255, 255, 0.95)',
            lineHeight: 20,
            marginBottom: 36,
            textShadowColor: 'rgba(0, 0, 0, 0.2)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 4,
          }}>
            Trouvez et réservez les événements qui vous passionnent. Connectez-vous avec d'autres participants et partagez vos expériences.
          </Text>

          {/* SearchBar intégrée dans le header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
            {/* Input de recherche */}
            <View style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'transparent',
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginRight: 8,
              borderWidth: 1.5,
              borderColor: 'rgba(255, 255, 255, 0.8)',
            }}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('searchEvents')}
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: '#FFFFFF',
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.8)" />
                </TouchableOpacity>
              )}
            </View>

            {/* Bouton Rechercher (loupe) */}
            <TouchableOpacity
              style={{
                backgroundColor: 'transparent',
                borderRadius: 16,
                padding: 12,
                marginRight: 8,
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <Ionicons name="search" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Bouton localisation */}
            <TouchableOpacity
              onPress={() => setShowLocationPicker(true)}
              style={{
                backgroundColor: 'transparent',
                borderRadius: 16,
                padding: 12,
                marginRight: 8,
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <Ionicons name="location" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Bouton filtres */}
            <TouchableOpacity
              onPress={() => setShowSortMenu(!showSortMenu)}
              style={{
                backgroundColor: 'transparent',
                borderRadius: 16,
                padding: 12,
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <Ionicons name="options" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Catégories sur l'image de fond */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            <TouchableOpacity
              onPress={() => setSelectedCategory(null)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 20,
                marginRight: 12,
                backgroundColor: !selectedCategory ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.3)',
                borderWidth: !selectedCategory ? 0 : 1,
                borderColor: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="grid" size={18} color={!selectedCategory ? theme.primary : '#FFFFFF'} style={{ marginRight: 6 }} />
                <Text style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: !selectedCategory ? theme.primary : '#FFFFFF',
                }}>
                  Tout
                </Text>
              </View>
            </TouchableOpacity>

            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 20,
                  marginRight: 12,
                  backgroundColor: selectedCategory === cat.id ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.3)',
                  borderWidth: selectedCategory === cat.id ? 0 : 1,
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={getCategoryIcon(cat.id) as any} size={18} color={selectedCategory === cat.id ? theme.primary : '#FFFFFF'} style={{ marginRight: 6 }} />
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: selectedCategory === cat.id ? theme.primary : '#FFFFFF',
                  }}>
                    {cat.nameFr}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );


  /** Affiche le carrousel horizontal des 3 événements vedettes avec image de fond, gradient et animation d'entrée. */
  const renderFeaturedEvents = () => {
    if (loading || filtered.length === 0) return null;
    const featuredEvents = filtered.slice(0, 3);
    const isDarkMode = theme.background === '#000000' || theme.background === '#121212';

    return (
      <View style={{ backgroundColor: theme.background }}>
        {/* Zone de transition avec dégradé */}
        <LinearGradient
          colors={[
            isDarkMode ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.08)',
            theme.background
          ]}
          style={{
            paddingTop: 32,
            paddingBottom: 24,
          }}
        >
          {/* En-tête de section avec design premium */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            marginBottom: 20,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 4,
                height: 28,
                borderRadius: 2,
                marginRight: 12,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={[theme.primary, `${theme.primary}80`]}
                style={{ width: '100%', height: '100%' }}
              />
            </View>
            <View>
              <Text style={{
                fontSize: 24,
                fontWeight: '900',
                color: theme.text,
                letterSpacing: -0.5,
              }}>
                {t('featuredEvents')}
              </Text>
              <Text style={{
                fontSize: 13,
                fontWeight: '500',
                color: theme.textMuted,
                marginTop: 2,
              }}>
                {t('trending')}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            onPress={() => {
              // Naviguer vers la page des événements populaires
              navigation.navigate('TrendingEvents');
            }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: `${theme.primary}15`,
              borderWidth: 1,
              borderColor: `${theme.primary}30`,
            }}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '700',
              color: theme.primary,
            }}>
              {t('seeAll')}
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
          }}
        >
          {featuredEvents.map((event, index) => (
            <AnimatedFadeIn key={event.id} delay={index * 80} duration={350}>
            <TouchableOpacity
              onPress={() => navigation.navigate('EventDetails', { event: eventForNav(event) })}
              style={{
                width: 280,
                height: 240,
                borderRadius: 20,
                backgroundColor: theme.card,
                overflow: 'hidden',
                position: 'relative',
                shadowColor: theme.text,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 5,
                marginRight: index < featuredEvents.length - 1 ? 16 : 0,
                borderWidth: 2,
                borderColor: isDarkMode ? 'rgba(124, 58, 237, 0.6)' : 'rgba(124, 58, 237, 0.4)',
              }}
            >
              {/* Image de fond */}
              <Image
                source={{ uri: (event.coverImage && normalizeImageUrl(event.coverImage)) || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800' }}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                }}
                resizeMode="cover"
              />
              
              {/* Gradient overlay dynamique */}
              <LinearGradient
                colors={[
                  'transparent',
                  'rgba(0, 0, 0, 0.3)',
                  'rgba(0, 0, 0, 0.7)',
                  'rgba(0, 0, 0, 0.9)',
                ]}
                locations={[0, 0.3, 0.7, 1]}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                }}
              />
              
              {(event.price ?? 0) > 0 && (
                <View style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  backgroundColor: theme.error,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                  zIndex: 1,
                }}>
                  <Text style={{
                    color: theme.buttonPrimaryText,
                    fontSize: 12,
                    fontWeight: '600',
                  }}>
                    ${(event.price || 0).toFixed(2)}
                  </Text>
                </View>
              )}
              
              <View style={{
                flex: 1,
                justifyContent: 'flex-end',
                padding: 20,
              }}>
                <Text style={{
                  color: theme.buttonPrimaryText,
                  fontSize: 12,
                  fontWeight: '500',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}>
                  {event.date} • {event.time}
                </Text>
                <Text style={{
                  color: theme.buttonPrimaryText,
                  fontSize: 18,
                  fontWeight: '700',
                }}>
                  {event.title}
                </Text>
              </View>
            </TouchableOpacity>
            </AnimatedFadeIn>
          ))}
        </ScrollView>
        </LinearGradient>
      </View>
    );
  };

  /** Mappe chaque identifiant de catégorie vers un nom d'icône Ionicons pour l'affichage dans les filtres. */
  const getCategoryIcon = (categoryId: string | null): string => {
    if (!categoryId) return 'apps';
    const iconMap: Record<string, string> = {
      music: 'musical-notes',
      sports: 'football',
      arts: 'color-palette',
      food: 'restaurant',
      technology: 'laptop',
      business: 'briefcase',
      education: 'school',
      health: 'fitness',
      family: 'people',
    };
    return iconMap[categoryId] || 'ellipse';
  };

  /** Affiche les pilules de catégorie avec icônes. La sélection déclenche le filtrage côté client via le useMemo `filtered`. */
  const renderCategoryPills = () => {
    const mainCategories = [
      { id: null, label: t('all') },
      ...categories.map(cat => ({ id: cat.id, label: getCategoryName(cat, language) })),
    ];

    return (
      <View style={{
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: theme.background,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
          >
          {mainCategories.map((cat, index) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id || 'all'}
                onPress={() => setSelectedCategory(cat.id)}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: isSelected ? theme.primary : theme.surface,
                  marginRight: index < mainCategories.length - 1 ? 12 : 0,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View style={{ marginRight: 6 }}>
                  <Ionicons
                    name={getCategoryIcon(cat.id) as any}
                    size={16}
                    color={isSelected ? theme.buttonPrimaryText : theme.text}
                  />
                </View>
                <Text style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: isSelected ? theme.buttonPrimaryText : theme.text,
                }}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {/* Bouton de tri masqué */}
        </View>
      </View>
    );
  };

  /** Affiche les événements en grille 2 colonnes quand une catégorie est sélectionnée (remplace le carrousel vedette). */
  const renderGridEvents = () => {
    if (!selectedCategory || loading) return null;

    return (
      <View style={{ backgroundColor: theme.background, paddingHorizontal: 20, paddingTop: 24 }}>
        {/* En-tête de section stylé */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <View
            style={{
              width: 4,
              height: 28,
              borderRadius: 2,
              marginRight: 12,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={[theme.primary, `${theme.primary}80`]}
              style={{ width: '100%', height: '100%' }}
            />
          </View>
          <View>
            <Text style={{
              fontSize: 24,
              fontWeight: '900',
              color: theme.text,
              letterSpacing: -0.5,
            }}>
              {t('upcoming')}
            </Text>
            <Text style={{
              fontSize: 13,
              fontWeight: '500',
              color: theme.textMuted,
              marginTop: 2,
            }}>
              {t('allEvents')}
            </Text>
          </View>
        </View>
        
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}>
          {filtered.map((event, index) => {
            const categoryInfo = categories.find(
              (c) => c.id.toLowerCase() === (event.category || '').toLowerCase()
            );
            return (
              <AnimatedFadeIn key={event.id} delay={index * 50} duration={300} style={{ width: '48%', marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('EventDetails', { event: eventForNav(event) })}
                style={{ width: '100%' }}
              >
                <View style={{
                  backgroundColor: theme.surface,
                  borderRadius: 16,
                  overflow: 'hidden',
                }}>
                  {/* Badge catégorie */}
                  <View style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    backgroundColor: theme.card,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 6,
                    zIndex: 1,
                  }}>
                    <Text style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: theme.primary,
                      textTransform: 'uppercase',
                    }}>
                      {categoryInfo?.nameFr || 'AUTRE'}
                    </Text>
                  </View>

                  {/* Image */}
                  <Image
                    source={{ uri: (event.coverImage && normalizeImageUrl(event.coverImage)) || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800' }}
                    style={{ width: '100%', height: 140 }}
                    resizeMode="cover"
                  />
                </View>

                {/* Infos événement */}
                <View style={{ paddingTop: 12 }}>
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: theme.text,
                    marginBottom: 8,
                  }} numberOfLines={2}>
                    {event.title}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ marginRight: 6 }}>
                      <Ionicons name="calendar-outline" size={14} color={theme.primary} />
                    </View>
                    <Text style={{ fontSize: 12, color: theme.textMuted }}>
                      {event.date}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ marginRight: 6 }}>
                      <Ionicons name="location-outline" size={14} color={theme.primary} />
                    </View>
                    <Text style={{ fontSize: 12, color: theme.textMuted }} numberOfLines={1}>
                      {event.location}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ marginRight: 4 }}>
                        <Ionicons name="people-outline" size={14} color={theme.textMuted} />
                      </View>
                      <Text style={{ fontSize: 12, color: theme.textMuted }}>
                        {event.price ? `${event.price}` : '0'}/100
                      </Text>
                    </View>
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: event.isFree ? theme.success : theme.error,
                    }}>
                      {event.isFree ? 'GRATUIT' : `${(event.price ?? 0).toFixed(2)}€`}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              </AnimatedFadeIn>
            );
          })}
        </View>
      </View>
    );
  };

  /** Affiche la liste verticale des événements à venir (à partir du 4e) en format carte compacte. */
  const renderUpcomingEvents = () => {
    if (loading) {
      return <LoadingSpinner fullScreen message="Chargement des événements..." />;
    }

    if (filtered.length === 0) {
      return (
        <EmptyState
          icon="calendar-outline"
          title="Aucun événement trouvé"
          message="Essayez une autre catégorie ou recherche"
        />
      );
    }

    const upcomingEvents = filtered.length > 3 ? filtered.slice(3) : [];
    if (upcomingEvents.length === 0) return null;

    return (
      <View style={{ backgroundColor: theme.background, paddingTop: 24, paddingBottom: 100 }}>
        {/* En-tête de section avec design premium */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          marginBottom: 20,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 4,
                height: 28,
                borderRadius: 2,
                marginRight: 12,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={[theme.primary, `${theme.primary}80`]}
                style={{ width: '100%', height: '100%' }}
              />
            </View>
            <View>
              <Text style={{
                fontSize: 24,
                fontWeight: '900',
                color: theme.text,
                letterSpacing: -0.5,
              }}>
                À venir
              </Text>
              <Text style={{
                fontSize: 13,
                fontWeight: '500',
                color: theme.textMuted,
                marginTop: 2,
              }}>
                Ne manquez rien
              </Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {upcomingEvents.map((event, index) => (
            <AnimatedFadeIn key={event.id} delay={index * 70} duration={350}>
              <EventCard
                event={{
                  ...event,
                  organizer: event.organizerName || event.organizer,
                }}
                onPress={() => navigation.navigate('EventDetails', { event: eventForNav(event) })}
                variant="list"
              />
            </AnimatedFadeIn>
          ))}
        </View>
      </View>
    );
  };

  const renderCreateEventCTA = () => {
    // Fonction désactivée - les participants ne peuvent pas créer d'événements
    return null;
  };

  /** Met à jour la ville de l'utilisateur dans Firestore et l'état local. */
  const handleSelectCity = async (city: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Mettre à jour la ville dans Firestore
      await import('firebase/firestore').then(({ updateDoc, doc }) => {
        updateDoc(doc(db, 'users', user.uid), {
          city: city,
        });
      });
      
      // Mettre à jour l'état local
      setUserCity(city);
    } catch (error) {
      console.error('Error updating city:', error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView 
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {renderHeader()}
        {renderSortMenu()}
        {selectedCategory ? (
          <>
            {renderGridEvents()}
          </>
        ) : (
          <>
            {renderFeaturedEvents()}
            {renderUpcomingEvents()}
          </>
        )}
      </ScrollView>
      
      {/* Bottom Navigation Bar */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        backgroundColor: theme.background,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        flexDirection: 'row',
        paddingBottom: Platform.OS === 'ios' ? 20 : 0,
        shadowColor: theme.text,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 10,
      }}>
        <TouchableOpacity
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="compass" size={24} color={theme.primary} />
          <Text style={{
            fontSize: 12,
            color: theme.primary,
            fontWeight: '600',
            marginTop: 4,
          }}>
            {t('home')}
          </Text>
          <View style={{
            position: 'absolute',
            bottom: 0,
            width: 40,
            height: 3,
            backgroundColor: theme.primary,
            borderRadius: 2,
          }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => navigation.navigate('MyTickets')}
        >
          <Ionicons name="ticket-outline" size={24} color={theme.textMuted} />
          <Text style={{
            fontSize: 12,
            color: theme.textMuted,
            marginTop: 4,
          }}>
            {t('tickets')}
          </Text>
        </TouchableOpacity>

        {/* Bouton Chat */}
        <TouchableOpacity
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => navigation.navigate('ChatList')}
        >
          <Ionicons name="chatbubbles-outline" size={24} color={theme.textMuted} />
          <Text style={{
            fontSize: 12,
            color: theme.textMuted,
            marginTop: 4,
          }}>
            Chat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => navigation.navigate('Favorites')}
        >
          <Ionicons name="heart-outline" size={24} color={theme.textMuted} />
          <Text style={{
            fontSize: 12,
            color: theme.textMuted,
            marginTop: 4,
          }}>
            {t('favorites')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person-outline" size={24} color={theme.textMuted} />
          <Text style={{
            fontSize: 12,
            color: theme.textMuted,
            marginTop: 4,
          }}>
            {t('profile')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal de notifications */}
      <Modal
        visible={showNotificationMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotificationMenu(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowNotificationMenu(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            justifyContent: 'flex-start',
            paddingTop: Platform.OS === 'ios' ? 110 : 70,
            paddingHorizontal: 16,
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.surface || '#FFFFFF',
              borderRadius: 16,
              width: '100%',
              maxWidth: 420,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.28,
              shadowRadius: 20,
              elevation: 12,
              overflow: 'hidden',
            }}
          >
            <View style={{
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.border || '#E5E7EB',
            }}>
              <Text style={{
                fontSize: 17,
                fontWeight: '700',
                color: theme.text || '#111827',
              }}>
                Notifications
              </Text>
            </View>

            {notificationCount === 0 ? (
              <View style={{
                paddingHorizontal: 20,
                paddingVertical: 28,
                alignItems: 'center',
              }}>
                <Ionicons name="notifications-off-outline" size={36} color={theme.textMuted || '#9CA3AF'} />
                <Text style={{
                  marginTop: 10,
                  fontSize: 15,
                  color: theme.textMuted || '#9CA3AF',
                  textAlign: 'center',
                }}>
                  Aucune notification
                </Text>
              </View>
            ) : (
              <View style={{ paddingBottom: 8 }}>
                {unreadMessages > 0 && (
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border || '#E5E7EB',
                    }}
                    onPress={() => {
                      setShowNotificationMenu(false);
                      navigation.navigate('ChatList');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: `${theme.primary}18`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}>
                      <Ionicons name="chatbubble" size={22} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: theme.text || '#111827',
                      }}>
                        Messages
                      </Text>
                      <Text style={{
                        fontSize: 13,
                        color: theme.textMuted || '#6B7280',
                        marginTop: 2,
                      }}>
                        {unreadMessages} message{unreadMessages > 1 ? 's' : ''} non lu{unreadMessages > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={22} color={theme.textMuted || '#9CA3AF'} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                )}

                {pendingRequests > 0 && (
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      setShowNotificationMenu(false);
                      navigation.navigate('Friends', { openTab: 'requests' });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: `${theme.success}18`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}>
                      <Ionicons name="person-add" size={22} color={theme.success} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: theme.text || '#111827',
                      }}>
                        Demandes d'amis
                      </Text>
                      <Text style={{
                        fontSize: 13,
                        color: theme.textMuted || '#6B7280',
                        marginTop: 2,
                      }}>
                        {pendingRequests} demande{pendingRequests > 1 ? 's' : ''} en attente
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={22} color={theme.textMuted || '#9CA3AF'} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal de sélection de ville */}
      <LocationPickerModal
        visible={showLocationPicker}
        currentCity={userCity}
        onClose={() => setShowLocationPicker(false)}
        onSelectCity={handleSelectCity}
        theme={theme}
      />
    </View>
  );
};

export default HomeParticipantScreen;
