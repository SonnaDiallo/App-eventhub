/**
 * CategoryFilter.tsx - Barre de filtrage horizontal par catégorie.
 * 
 * Affiche une liste scrollable de boutons de catégorie avec :
 * - Un bouton "Tous" par défaut
 * - Un gradient coloré sur la catégorie sélectionnée
 * - Une animation spring au press pour le retour haptique visuel
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface CategoryFilterProps {
  categories: Array<{ id: string; name: string; icon: string }>;
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  theme: any;
  allLabel?: string;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  theme,
  allLabel = 'Tous',
}) => {
  /**
   * CategoryButton - Bouton individuel pour chaque catégorie.
   * Utilise un gradient quand sélectionné, un style bordé sinon.
   * Animation spring au press-in/press-out pour un effet de rebond.
   */
  const CategoryButton = ({ id, name, icon, isSelected }: any) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    /** Réduit légèrement la taille au toucher */
    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    };

    /** Retourne à la taille normale avec un léger rebond */
    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }], marginRight: 10 }}>
        <TouchableOpacity
          onPress={() => onSelectCategory(id)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          style={{
            borderRadius: 24,
            overflow: 'hidden',
            shadowColor: isSelected ? theme.primary : '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isSelected ? 0.3 : 0.1,
            shadowRadius: isSelected ? 12 : 6,
            elevation: isSelected ? 6 : 3,
          }}
        >
          {isSelected ? (
            <LinearGradient
              colors={[theme.primary, `${theme.primary}DD`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {icon && (
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}
                >
                  <Ionicons name={icon as any} size={16} color="#FFFFFF" />
                </View>
              )}
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: '700',
                }}
              >
                {name}
              </Text>
            </LinearGradient>
          ) : (
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.card,
                borderWidth: 2,
                borderColor: theme.border,
              }}
            >
              {icon && (
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: `${theme.primary}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}
                >
                  <Ionicons name={icon as any} size={16} color={theme.primary} />
                </View>
              )}
              <Text
                style={{
                  color: theme.text,
                  fontSize: 15,
                  fontWeight: '600',
                }}
              >
                {name}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingVertical: 16,
      }}
    >
      <CategoryButton
        id={null}
        name={allLabel}
        icon="apps"
        isSelected={selectedCategory === null}
      />

      {categories.map((category) => (
        <CategoryButton
          key={category.id}
          id={category.id}
          name={category.name}
          icon={category.icon}
          isSelected={selectedCategory === category.id}
        />
      ))}
    </ScrollView>
  );
};
