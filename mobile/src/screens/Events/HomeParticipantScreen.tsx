import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

import { useTheme } from '../../theme/ThemeContext';
import { getDefaultCategories } from '../../services/categories';
import { useUserRole, canCreateEvents } from '../../hooks/useUserRole';
import { useEvents } from '../../hooks/useEvents';

import { EventCard } from '../../components/EventCard';
import { SearchBar } from '../../components/SearchBar';
import { CategoryFilter } from '../../components/CategoryFilter';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';

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

  const { events, loading } = useEvents({ 
    limit: selectedCategory ? undefined : 15, 
    category: selectedCategory || undefined,
    includeExternal: true
  });

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
    <View style={{
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 60 : 20,
      paddingBottom: 16,
      backgroundColor: theme.background,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <Text style={{
        fontSize: 28,
        fontWeight: '700',
        color: theme.primary,
      }}>
        EventHub
      </Text>
      <TouchableOpacity
        style={{
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="notifications-outline" size={24} color={theme.text} />
      </TouchableOpacity>
    </View>
  );

  const renderLocationSection = () => (
    <View style={{
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: theme.background,
    }}>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}
        onPress={() => {}}
      >
        <Ionicons name="location-outline" size={18} color={theme.textMuted} />
        <Text style={{
          marginLeft: 6,
          fontSize: 14,
          color: theme.textMuted,
        }}>
          Paris, FR
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.textMuted} style={{ marginLeft: 4 }} />
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
    const featuredEvents = filtered.slice(0, 3);

    return (
      <View style={{ backgroundColor: theme.background, paddingVertical: 20 }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          marginBottom: 16,
        }}>
          <Text style={{
            fontSize: 20,
            fontWeight: '700',
            color: theme.text,
          }}>
            Événements à la une
          </Text>
          <TouchableOpacity>
            <Text style={{
              fontSize: 14,
              fontWeight: '500',
              color: theme.primary,
            }}>
              Voir tout
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
              
              {/* Gradient overlay */}
              <View style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
              }} />
              
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
      <View style={{ backgroundColor: theme.background, paddingHorizontal: 20, paddingTop: 20 }}>
        <Text style={{
          fontSize: 20,
          fontWeight: '700',
          color: theme.text,
          marginBottom: 16,
        }}>
          Découvrir
        </Text>
        
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
      <View style={{ backgroundColor: theme.background, paddingTop: 20, paddingBottom: 100 }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          marginBottom: 16,
        }}>
          <Text style={{
            fontSize: 20,
            fontWeight: '700',
            color: theme.text,
          }}>
            Événements à venir
          </Text>
          <TouchableOpacity>
            <Text style={{
              fontSize: 14,
              fontWeight: '500',
              color: theme.primary,
            }}>
              Filtrer
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {upcomingEvents.map((event) => (
            <TouchableOpacity
              key={event.id}
              onPress={() => navigation.navigate('EventDetails', { event: eventForNav(event) })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 24,
                backgroundColor: 'transparent',
              }}
            >
              <View style={{
                width: 100,
                height: 100,
                borderRadius: 24,
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
                  }}>
                    <Ionicons name="calendar-outline" size={32} color={theme.primary} />
                  </View>
                )}
              </View>

              <View style={{
                flex: 1,
                marginLeft: 16,
                justifyContent: 'center',
              }}>
                <Text style={{
                  fontSize: 17,
                  fontWeight: '600',
                  color: theme.text,
                  marginBottom: 6,
                  lineHeight: 22,
                }}>
                  {event.title}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: theme.textMuted,
                  marginBottom: 10,
                }}>
                  {event.date} • {event.time}
                </Text>
                <View style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  backgroundColor: `${theme.primary}20`,
                  borderRadius: 8,
                }}>
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: theme.primary,
                    letterSpacing: 0.5,
                  }}>
                    INTÉRESSÉ
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderCreateEventCTA = () => {
    // Fonction désactivée - les participants ne peuvent pas créer d'événements
    return null;
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
    </View>
  );
};

export default HomeParticipantScreen;
