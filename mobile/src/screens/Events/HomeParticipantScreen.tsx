import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, Image, Animated, Modal } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { auth, db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

import { useTheme } from '../../theme/ThemeContext';
import { getDefaultCategories } from '../../services/categories';
import { useUserRole, canCreateEvents } from '../../hooks/useUserRole';
import { useEvents } from '../../hooks/useEvents';

import { EventCard } from '../../components/EventCard';
import { SearchBar } from '../../components/SearchBar';
import { CategoryFilter } from '../../components/CategoryFilter';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { LocationPickerModal } from '../../components/LocationPickerModal';

import { filterEvents, sortEvents, type SortOption } from '../../utils/eventFilters';
import { eventForNav } from '../../utils/eventHelpers';
import { createStyles } from './HomeParticipantScreen.styles';

type Props = NativeStackScreenProps<AuthStackParamList, 'HomeParticipant'>;

const HomeParticipantScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
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

  const { events, loading } = useEvents({ 
    limit: selectedCategory ? undefined : 15, 
    category: selectedCategory || undefined,
    includeExternal: true
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
  useEffect(() => {
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
    
    // Recharger les notifications toutes les 30 secondes
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const filteredEvents = filterEvents(events, searchQuery, selectedCategory);
    return sortEvents(filteredEvents, sortBy);
  }, [events, searchQuery, selectedCategory, sortBy]);

  const featuredEvent = filtered.length > 0 ? filtered[0] : null;
  const otherEvents = filtered.length > 1 ? filtered.slice(1) : [];

  const renderSortMenu = () => {
    if (!showSortMenu) return null;

    const sortOptions = [
      { value: 'date' as SortOption, label: '📅 Date (plus proche)', icon: 'calendar-outline' },
      { value: 'price-asc' as SortOption, label: '💰 Prix (croissant)', icon: 'arrow-up-outline' },
      { value: 'price-desc' as SortOption, label: '💰 Prix (décroissant)', icon: 'arrow-down-outline' },
      { value: 'title' as SortOption, label: '🔤 Titre (A-Z)', icon: 'text-outline' },
    ];

    return (
      <View style={styles.sortMenu}>
        <Text style={styles.sortMenuTitle}>Trier par</Text>
        <View style={styles.sortMenuOptions}>
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
                size={18} 
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
                <Ionicons name="checkmark" size={18} color={theme.primary} style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[theme.primary, `${theme.primary}DD`, theme.background]}
      locations={[0, 0.5, 1]}
      style={{
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 24,
      }}
    >
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <View>
          <Text style={{
            fontSize: 32,
            fontWeight: '900',
            color: '#FFFFFF',
            textShadowColor: 'rgba(0, 0, 0, 0.3)',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 8,
          }}>
            EventHub
          </Text>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.8)',
            marginTop: 4,
          }}>
            Découvre les meilleurs événements
          </Text>
        </View>
        <View style={{ position: 'relative' }}>
        <TouchableOpacity
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            borderRadius: 22,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          }}
          onPress={() => setShowNotificationMenu(!showNotificationMenu)}
        >
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          {notificationCount > 0 && (
            <View style={{
              position: 'absolute',
              top: -2,
              right: -2,
              backgroundColor: '#FF3B30',
              borderRadius: 12,
              minWidth: 20,
              height: 20,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 5,
              borderWidth: 2,
              borderColor: '#FFFFFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4,
            }}>
              <Text style={{
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: '900',
              }}>
                {notificationCount > 99 ? '99+' : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      </View>
    </LinearGradient>
  );

  const renderLocationSection = () => (
    <View style={{
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.background,
    }}>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.card,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
        onPress={() => setShowLocationPicker(true)}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: `${theme.primary}15`,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Ionicons name="location" size={20} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 12,
            color: theme.textMuted,
            fontWeight: '500',
            marginBottom: 2,
          }}>
            Localisation
          </Text>
          <Text style={{
            fontSize: 15,
            color: theme.text,
            fontWeight: '700',
          }}>
            {userCity}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={theme.textMuted} />
      </TouchableOpacity>
    </View>
  );

  const renderSearchSection = () => (
    <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: theme.background }}>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onFilterPress={() => setShowSortMenu(!showSortMenu)}
      />
      {renderSortMenu()}
    </View>
  );

  const renderFeaturedEvents = () => {
    if (loading || filtered.length === 0) return null;
    const featuredEvents = showAllFeatured ? filtered : filtered.slice(0, 3);

    return (
      <View style={{ backgroundColor: theme.background, paddingVertical: 24 }}>
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
                À la une
              </Text>
              <Text style={{
                fontSize: 13,
                fontWeight: '500',
                color: theme.textMuted,
                marginTop: 2,
              }}>
                Les événements du moment
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            onPress={() => setShowAllFeatured(!showAllFeatured)}
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
              {showAllFeatured ? 'Voir moins' : 'Voir tout'}
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
            <TouchableOpacity
              key={event.id}
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
              }}
            >
              {/* Image de fond */}
              {event.coverImage && (
                <Image
                  source={{ uri: event.coverImage }}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                  }}
                  resizeMode="cover"
                />
              )}
              
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
              
              {event.price && event.price > 0 && (
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
          ))}
        </ScrollView>
      </View>
    );
  };

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

  const renderCategoryPills = () => {
    const mainCategories = [
      { id: null, label: 'Tout' },
      ...categories.map(cat => ({ id: cat.id, label: cat.nameFr })),
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
              À venir
            </Text>
            <Text style={{
              fontSize: 13,
              fontWeight: '500',
              color: theme.textMuted,
              marginTop: 2,
            }}>
              Tous les événements
            </Text>
          </View>
        </View>
        
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}>
          {filtered.map((event) => {
            const categoryInfo = categories.find(
              (c) => c.id.toLowerCase() === (event.category || '').toLowerCase()
            );
            return (
              <TouchableOpacity
                key={event.id}
                onPress={() => navigation.navigate('EventDetails', { event: eventForNav(event) })}
                style={{
                  width: '48%',
                  marginBottom: 20,
                }}
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
                  {event.coverImage ? (
                    <Image
                      source={{ uri: event.coverImage }}
                      style={{ width: '100%', height: 140 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{ width: '100%', height: 140, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="image-outline" size={40} color={theme.border} />
                    </View>
                  )}
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
            );
          })}
        </View>
      </View>
    );
  };

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
          {upcomingEvents.map((event) => {
            const categoryInfo = categories.find(
              (c) => c.id.toLowerCase() === (event.category || '').toLowerCase()
            );

            return (
              <View key={event.id}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('EventDetails', { event: eventForNav(event) })}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 16,
                    backgroundColor: theme.card,
                    borderRadius: 20,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  {/* Image avec badge catégorie */}
                  <View style={{ position: 'relative' }}>
                    <View style={{
                      width: 90,
                      height: 90,
                      borderRadius: 18,
                      backgroundColor: theme.surface,
                      overflow: 'hidden',
                    }}>
                      {event.coverImage ? (
                        <Image
                          source={{ uri: event.coverImage }}
                          style={{
                            width: '100%',
                            height: '100%',
                          }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{
                          width: '100%',
                          height: '100%',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: `${theme.primary}10`,
                        }}>
                          <Ionicons name="calendar" size={32} color={theme.primary} />
                        </View>
                      )}
                    </View>
                    
                    {/* Badge catégorie avec gradient */}
                    {categoryInfo && (
                      <View
                        style={{
                          position: 'absolute',
                          bottom: -6,
                          left: -6,
                          borderRadius: 12,
                          overflow: 'hidden',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        <LinearGradient
                          colors={['#FF6B6B', '#FF8E53']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                          }}
                        >
                          <Text style={{
                            fontSize: 9,
                            fontWeight: '900',
                            color: '#FFFFFF',
                            textTransform: 'uppercase',
                          }}>
                            {categoryInfo.nameFr}
                          </Text>
                        </LinearGradient>
                      </View>
                    )}
                  </View>

                  {/* Infos événement */}
                  <View style={{
                    flex: 1,
                    marginLeft: 14,
                    justifyContent: 'center',
                  }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: theme.text,
                      marginBottom: 6,
                      lineHeight: 20,
                    }} numberOfLines={2}>
                      {event.title}
                    </Text>
                    
                    {/* Date et heure avec icône */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}>
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: `${theme.primary}15`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 6,
                        }}
                      >
                        <Ionicons name="time" size={12} color={theme.primary} />
                      </View>
                      <Text style={{
                        fontSize: 13,
                        color: theme.textMuted,
                        fontWeight: '500',
                      }}>
                        {event.date} • {event.time}
                      </Text>
                    </View>
                    
                    {/* Badge INTÉRESSÉ avec gradient */}
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        borderRadius: 12,
                        overflow: 'hidden',
                      }}
                    >
                      <LinearGradient
                        colors={[`${theme.primary}25`, `${theme.primary}15`]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderWidth: 1,
                          borderColor: `${theme.primary}30`,
                        }}
                      >
                        <Text style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: theme.primary,
                          letterSpacing: 0.5,
                        }}>
                          INTÉRESSÉ
                        </Text>
                      </LinearGradient>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderCreateEventCTA = () => {
    // Fonction désactivée - les participants ne peuvent pas créer d'événements
    return null;
  };

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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {renderHeader()}
        {renderLocationSection()}
        {renderSearchSection()}
        {renderCategoryPills()}
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
            Explorer
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
            Tickets
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
            Favoris
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
            Profil
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
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            justifyContent: 'flex-start',
            paddingTop: Platform.OS === 'ios' ? 110 : 70,
            paddingHorizontal: 20,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              alignSelf: 'flex-end',
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              width: 300,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 12,
              overflow: 'hidden',
            }}
          >
            <View style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '700',
                color: theme.text,
              }}>
                Notifications
              </Text>
            </View>

            {notificationCount === 0 ? (
              <View style={{
                paddingHorizontal: 16,
                paddingVertical: 24,
                alignItems: 'center',
              }}>
                <Ionicons name="notifications-off-outline" size={32} color={theme.textMuted} />
                <Text style={{
                  marginTop: 8,
                  fontSize: 14,
                  color: theme.textMuted,
                  textAlign: 'center',
                }}>
                  Aucune notification
                </Text>
              </View>
            ) : (
              <>
                {unreadMessages > 0 && (
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    }}
                    onPress={() => {
                      setShowNotificationMenu(false);
                      navigation.navigate('ChatList');
                    }}
                  >
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: `${theme.primary}20`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}>
                      <Ionicons name="chatbubble" size={20} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: theme.text,
                      }}>
                        Messages
                      </Text>
                      <Text style={{
                        fontSize: 12,
                        color: theme.textMuted,
                        marginTop: 2,
                      }}>
                        {unreadMessages} message{unreadMessages > 1 ? 's' : ''} non lu{unreadMessages > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                )}

                {pendingRequests > 0 && (
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      setShowNotificationMenu(false);
                      navigation.navigate('Friends');
                    }}
                  >
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: `${theme.success}20`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}>
                      <Ionicons name="person-add" size={20} color={theme.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: theme.text,
                      }}>
                        Demandes d'amis
                      </Text>
                      <Text style={{
                        fontSize: 12,
                        color: theme.textMuted,
                        marginTop: 2,
                      }}>
                        {pendingRequests} demande{pendingRequests > 1 ? 's' : ''} en attente
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </>
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
