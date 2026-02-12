import React from 'react';
import { ScrollView, TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import type { Category } from '../services/categories';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

const getCategoryIcon = (categoryId: string): string => {
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
    other: 'ellipse',
  };
  return iconMap[categoryId] || 'ellipse';
};

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const { theme } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16 }}
    >
      <TouchableOpacity
        onPress={() => onSelectCategory(null)}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 18,
          borderRadius: 999,
          backgroundColor: !selectedCategory ? theme.primary : theme.surface,
          borderWidth: 1,
          borderColor: !selectedCategory ? theme.primary : theme.border,
          flexDirection: 'row',
          alignItems: 'center',
          marginRight: 10,
        }}
      >
        <Ionicons
          name="apps"
          size={16}
          color={!selectedCategory ? theme.buttonPrimaryText : theme.text}
          style={{ marginRight: 6 }}
        />
        <Text
          style={{
            color: !selectedCategory ? theme.buttonPrimaryText : theme.text,
            fontWeight: '600',
            fontSize: 14,
          }}
        >
          Tout
        </Text>
      </TouchableOpacity>

      {categories.map((cat, index) => (
        <TouchableOpacity
          key={cat.id}
          onPress={() => onSelectCategory(cat.id)}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 18,
            borderRadius: 999,
            backgroundColor: selectedCategory === cat.id ? theme.primary : theme.surface,
            borderWidth: 1,
            borderColor: selectedCategory === cat.id ? theme.primary : theme.border,
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: index < categories.length - 1 ? 10 : 0,
          }}
        >
          <Ionicons
            name={getCategoryIcon(cat.id) as any}
            size={16}
            color={selectedCategory === cat.id ? theme.buttonPrimaryText : theme.text}
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              color: selectedCategory === cat.id ? theme.buttonPrimaryText : theme.text,
              fontWeight: '600',
              fontSize: 14,
            }}
          >
            {cat.nameFr}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};
