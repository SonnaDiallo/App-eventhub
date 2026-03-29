/**
 * SearchBar.tsx - Barre de recherche avec boutons de localisation et filtre.
 * 
 * Composants intégrés :
 * - Champ de recherche avec icône, placeholder et bouton clear
 * - Bouton de localisation (ouvre le modal de sélection de ville)
 * - Bouton filtre avec gradient (ouvre les options de filtrage)
 * 
 * Utilise un effet glassmorphism avec bordure colorée au focus.
 */

import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Callback pour ouvrir les filtres avancés */
  onFilterPress?: () => void;
  /** Callback pour ouvrir la sélection de ville */
  onLocationPress?: () => void;
  userCity?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = "Rechercher un événement...",
  onFilterPress,
  onLocationPress,
  userCity = "Paris, FR",
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {/* Barre de recherche avec glassmorphism */}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.inputBackground,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: isFocused ? theme.primary : theme.border,
          paddingHorizontal: 18,
          paddingVertical: 14,
          shadowColor: isFocused ? theme.primary : '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isFocused ? 0.2 : 0.08,
          shadowRadius: isFocused ? 12 : 8,
          elevation: isFocused ? 6 : 3,
        }}
      >
        {/* Icône de recherche avec animation */}
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
          <Ionicons name="search" size={20} color={theme.primary} />
        </View>
        
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.inputPlaceholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{ 
            color: theme.text, 
            flex: 1, 
            fontSize: 15,
            fontWeight: '500',
          }}
        />
        
        {/* Bouton clear si du texte est présent */}
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: `${theme.textMuted}20`,
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 8,
            }}
          >
            <Ionicons name="close" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Bouton localisation */}
      {onLocationPress && (
        <TouchableOpacity
          onPress={onLocationPress}
          style={{
            marginLeft: 12,
            borderRadius: 20,
            backgroundColor: theme.card,
            borderWidth: 2,
            borderColor: theme.border,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Ionicons name="location" size={20} color={theme.primary} style={{ marginRight: 6 }} />
        </TouchableOpacity>
      )}
      
      {/* Bouton filtre avec gradient */}
      {onFilterPress && (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            onPress={onFilterPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
            style={{
              marginLeft: 12,
              borderRadius: 20,
              overflow: 'hidden',
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <LinearGradient
              colors={[theme.primary, `${theme.primary}DD`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 18,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons name="options" size={22} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};
