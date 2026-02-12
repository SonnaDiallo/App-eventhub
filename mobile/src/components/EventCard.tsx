import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import type { EventData } from '../navigation/AuthNavigator';

interface EventCardProps {
  event: EventData;
  onPress: () => void;
  variant?: 'featured' | 'grid' | 'list';
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress, variant = 'grid' }) => {
  const { theme } = useTheme();

  if (variant === 'featured') {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={{
          backgroundColor: theme.card,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: theme.border,
          overflow: 'hidden',
        }}
      >
        <View style={{ position: 'relative' }}>
          <Image 
            source={{ uri: event.coverImage }} 
            style={{ width: '100%', height: 240 }} 
            resizeMode="cover"
          />
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 20,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 24, marginBottom: 8 }}>
              {event.title}
            </Text>
            {event.description && (
              <Text 
                style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 14, marginBottom: 12, lineHeight: 20 }}
                numberOfLines={2}
              >
                {event.description}
              </Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                <Ionicons name="calendar-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={{ color: '#FFFFFF', fontSize: 13 }}>{event.date}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="location-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={{ color: '#FFFFFF', fontSize: 13 }} numberOfLines={1}>{event.location}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: theme.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.border,
        overflow: 'hidden',
      }}
    >
      <Image 
        source={{ uri: event.coverImage }} 
        style={{ width: '100%', height: 140 }} 
        resizeMode="cover"
      />
      <View style={{ padding: 14 }}>
        <Text 
          style={{ color: theme.text, fontWeight: '700', fontSize: 16, marginBottom: 8 }}
          numberOfLines={2}
        >
          {event.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Ionicons name="calendar-outline" size={14} color={theme.textMuted} style={{ marginRight: 6 }} />
          <Text style={{ color: theme.textMuted, fontSize: 12 }} numberOfLines={1}>
            {event.date}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Ionicons name="location-outline" size={14} color={theme.textMuted} style={{ marginRight: 6 }} />
          <Text style={{ color: theme.textMuted, fontSize: 12 }} numberOfLines={1}>
            {event.location}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 16 }}>
            {event.isFree ? 'Gratuit' : `${event.price}€`}
          </Text>
          <View
            style={{
              backgroundColor: theme.primary,
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: theme.buttonPrimaryText, fontWeight: '600', fontSize: 12 }}>
              Voir
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
