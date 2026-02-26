import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

import { useTheme } from '../../theme/ThemeContext';
import { useEvents } from '../../hooks/useEvents';
import { EventCard } from '../../components/EventCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { eventForNav } from '../../utils/eventHelpers';

type Props = NativeStackScreenProps<AuthStackParamList, 'TrendingEvents'>;

const TrendingEventsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { events, loading } = useEvents({ includeExternal: true });

  // Trier les événements par nombre de participants (réservations)
  const trendingEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aParticipants = a.participantsCount || 0;
      const bParticipants = b.participantsCount || 0;
      return bParticipants - aParticipants;
    });
  }, [events]);

  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement des événements populaires..." />;
  }

  if (trendingEvents.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{
          paddingTop: Platform.OS === 'ios' ? 60 : 20,
          paddingHorizontal: 20,
          paddingBottom: 20,
          backgroundColor: theme.background,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.surface,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
              }}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={{
              fontSize: 24,
              fontWeight: '900',
              color: theme.text,
            }}>
              Événements populaires
            </Text>
          </View>
        </View>
        <EmptyState
          icon="trending-up-outline"
          title="Aucun événement populaire"
          message="Revenez plus tard pour découvrir les événements tendance"
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header avec gradient */}
      <LinearGradient
        colors={[theme.primary, `${theme.primary}DD`]}
        style={{
          paddingTop: Platform.OS === 'ios' ? 60 : 20,
          paddingHorizontal: 20,
          paddingBottom: 24,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 28,
              fontWeight: '900',
              color: '#FFFFFF',
              textShadowColor: 'rgba(0, 0, 0, 0.3)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 8,
            }}>
              Événements populaires
            </Text>
          </View>
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
          }}>
            <Ionicons name="flame" size={24} color="#FFD700" />
          </View>
        </View>
        
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: 'rgba(255, 255, 255, 0.95)',
          lineHeight: 20,
          textShadowColor: 'rgba(0, 0, 0, 0.2)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 4,
        }}>
          Les événements les plus réservés du moment. Ne manquez pas ces expériences exceptionnelles !
        </Text>
      </LinearGradient>

      {/* Liste des événements avec statistiques */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 24,
          paddingBottom: 100,
        }}
      >
        {/* Top 3 en grand format */}
        {trendingEvents.slice(0, 3).map((event, index) => (
          <View key={event.id} style={{ marginBottom: 24, paddingHorizontal: 20 }}>
            {/* Badge de classement avec effet premium */}
            <View
              style={{
                position: 'absolute',
                top: -12,
                left: 8,
                zIndex: 10,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 3,
                borderColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Ionicons 
                name={index === 0 ? 'trophy' : index === 1 ? 'medal' : 'ribbon'} 
                size={20} 
                color="#FFFFFF" 
                style={{ marginRight: 6 }} 
              />
              <Text style={{
                fontSize: 16,
                fontWeight: '900',
                color: '#FFFFFF',
                textShadowColor: 'rgba(0, 0, 0, 0.3)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}>
                #{index + 1}
              </Text>
            </View>
            
            <TouchableOpacity
              onPress={() => navigation.navigate('EventDetails', { event: eventForNav(event) })}
              activeOpacity={0.9}
              style={{
                borderRadius: 24,
                overflow: 'hidden',
                backgroundColor: theme.card,
                borderWidth: 3,
                borderColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
                elevation: 10,
              }}
            >
              {/* Grande image */}
              <View style={{ position: 'relative' }}>
                <Image 
                  source={{ uri: event.coverImage }} 
                  style={{ width: '100%', height: 220 }} 
                  resizeMode="cover"
                />
                
                {/* Gradient overlay */}
                <LinearGradient
                  colors={['transparent', 'rgba(0, 0, 0, 0.7)']}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '50%',
                  }}
                />
                
                {/* Badge catégorie */}
                {event.category && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 16,
                      left: 16,
                      backgroundColor: theme.primary,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 14,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                      {event.category}
                    </Text>
                  </View>
                )}

                {/* Badge prix/gratuit */}
                {event.isFree ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      backgroundColor: '#10B981',
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 14,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                      Gratuit
                    </Text>
                  </View>
                ) : event.price && event.price > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      backgroundColor: '#EF4444',
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 14,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                      {event.price}€
                    </Text>
                  </View>
                )}
              </View>

              {/* Contenu */}
              <View style={{ padding: 20 }}>
                {/* Titre */}
                <Text 
                  style={{ 
                    color: theme.text, 
                    fontWeight: '800', 
                    fontSize: 20, 
                    marginBottom: 14,
                    lineHeight: 26,
                  }}
                  numberOfLines={2}
                >
                  {event.title}
                </Text>
                
                {/* Statistiques en ligne */}
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: `${theme.primary}10`,
                  borderRadius: 12,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="people" size={20} color={theme.primary} style={{ marginRight: 8 }} />
                    <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>
                      {event.participantsCount || 0}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: 13, marginLeft: 4 }}>
                      {event.participantsCount === 1 ? 'participant' : 'participants'}
                    </Text>
                  </View>
                  <Ionicons name="flame" size={24} color="#FF6B6B" />
                </View>
                
                {/* Date */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Ionicons name="calendar-outline" size={18} color={theme.textMuted} style={{ marginRight: 10 }} />
                  <Text style={{ color: theme.textMuted, fontSize: 15, fontWeight: '500' }}>
                    {event.date}
                  </Text>
                </View>
                
                {/* Lieu */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Ionicons name="location-outline" size={18} color={theme.textMuted} style={{ marginRight: 10 }} />
                  <Text style={{ color: theme.textMuted, fontSize: 15, fontWeight: '500', flex: 1 }} numberOfLines={1}>
                    {event.location}
                  </Text>
                </View>
                
                {/* Organisateur */}
                {event.organizerName && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="person-outline" size={18} color={theme.textMuted} style={{ marginRight: 10 }} />
                    <Text style={{ color: theme.textMuted, fontSize: 15, fontWeight: '500', flex: 1 }} numberOfLines={1}>
                      Organisé par {event.organizerName}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        ))}

        {/* Autres événements en format compact */}
        {trendingEvents.length > 3 && (
          <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
              paddingBottom: 12,
              borderBottomWidth: 2,
              borderBottomColor: `${theme.primary}30`,
            }}>
              <Ionicons name="list" size={24} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: theme.text,
              }}>
                Autres événements populaires
              </Text>
            </View>

            {trendingEvents.slice(3).map((event, index) => (
              <View key={event.id} style={{ marginBottom: 16 }}>
                <EventCard
                  event={{
                    ...event,
                    organizer: event.organizerName || event.organizer,
                  }}
                  onPress={() => navigation.navigate('EventDetails', { event: eventForNav(event) })}
                  variant="list"
                />
                
                {/* Badge nombre de participants */}
                {event.participantsCount && event.participantsCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    backgroundColor: theme.primary,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 3,
                  }}>
                    <Ionicons name="people" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: '700',
                    }}>
                      {event.participantsCount}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default TrendingEventsScreen;
