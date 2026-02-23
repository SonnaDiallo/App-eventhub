import React from 'react';
import { View, Text, Image, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import type { EventData } from '../navigation/AuthNavigator';

interface EventCardProps {
  event: EventData;
  onPress: () => void;
  variant?: 'featured' | 'grid' | 'list';
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress, variant = 'grid' }) => {
  const { theme } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  if (variant === 'featured') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          style={{
            borderRadius: 28,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          <View style={{ position: 'relative' }}>
            {/* Image de fond */}
            <Image 
              source={{ uri: event.coverImage }} 
              style={{ width: '100%', height: 280 }} 
              resizeMode="cover"
            />
            
            {/* Gradient overlay dynamique */}
            <LinearGradient
              colors={[
                'transparent',
                'rgba(0, 0, 0, 0.3)',
                'rgba(0, 0, 0, 0.8)',
                'rgba(0, 0, 0, 0.95)',
              ]}
              locations={[0, 0.3, 0.7, 1]}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '70%',
              }}
            />

            {/* Badge prix avec gradient */}
            {event.price && event.price > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  borderRadius: 20,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#FF8E53']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900' }}>
                    {event.price}€
                  </Text>
                </LinearGradient>
              </View>
            )}

            {/* Badge gratuit avec effet néon */}
            {event.isFree && (
              <View
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  backgroundColor: '#00D9FF',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  shadowColor: '#00D9FF',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                <Text style={{ color: '#000', fontSize: 14, fontWeight: '900' }}>
                  GRATUIT
                </Text>
              </View>
            )}
            
            {/* Contenu avec glassmorphism */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: 24,
              }}
            >
              <Text style={{ 
                color: '#FFFFFF', 
                fontWeight: '900', 
                fontSize: 26, 
                marginBottom: 8,
                textShadowColor: 'rgba(0, 0, 0, 0.75)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 8,
              }}>
                {event.title}
              </Text>
              {event.description && (
                <Text 
                  style={{ 
                    color: 'rgba(255, 255, 255, 0.95)', 
                    fontSize: 14, 
                    marginBottom: 16, 
                    lineHeight: 20,
                    textShadowColor: 'rgba(0, 0, 0, 0.5)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 4,
                  }}
                  numberOfLines={2}
                >
                  {event.description}
                </Text>
              )}
              
              {/* Infos avec badges glassmorphism */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <Ionicons name="calendar" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>{event.date}</Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    flex: 1,
                  }}
                >
                  <Ionicons name="location" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                    {event.location}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={{
          borderRadius: 24,
          overflow: 'hidden',
          backgroundColor: theme.card,
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        {/* Image avec overlay gradient */}
        <View style={{ position: 'relative' }}>
          <Image 
            source={{ uri: event.coverImage }} 
            style={{ width: '100%', height: 160 }} 
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.4)']}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '50%',
            }}
          />
          
          {/* Badge prix avec gradient */}
          {event.price && event.price > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                borderRadius: 16,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <LinearGradient
                colors={['#FF6B6B', '#FF8E53']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                  {event.price}€
                </Text>
              </LinearGradient>
            </View>
          )}

          {/* Badge gratuit */}
          {event.isFree && (
            <View
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                backgroundColor: '#00D9FF',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                shadowColor: '#00D9FF',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Text style={{ color: '#000', fontSize: 12, fontWeight: '900' }}>
                GRATUIT
              </Text>
            </View>
          )}
        </View>

        {/* Contenu */}
        <View style={{ padding: 16 }}>
          <Text 
            style={{ 
              color: theme.text, 
              fontWeight: '800', 
              fontSize: 17, 
              marginBottom: 10,
              lineHeight: 22,
            }}
            numberOfLines={2}
          >
            {event.title}
          </Text>
          
          {/* Infos avec icônes colorées */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: `${theme.primary}15`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8,
              }}
            >
              <Ionicons name="calendar" size={16} color={theme.primary} />
            </View>
            <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '500', flex: 1 }} numberOfLines={1}>
              {event.date}
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: `${theme.primary}15`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8,
              }}
            >
              <Ionicons name="location" size={16} color={theme.primary} />
            </View>
            <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '500', flex: 1 }} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
          
          {/* Bouton avec gradient */}
          <View
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <LinearGradient
              colors={[theme.primary, `${theme.primary}CC`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: theme.buttonPrimaryText, fontWeight: '700', fontSize: 14 }}>
                Voir les détails →
              </Text>
            </LinearGradient>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};
