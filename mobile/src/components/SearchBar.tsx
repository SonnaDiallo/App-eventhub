import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = "Rechercher un événement, une ville...",
  onFilterPress,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.inputBackground,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Ionicons name="search" size={20} color={theme.textMuted} style={{ marginRight: 12 }} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.inputPlaceholder}
          style={{ 
            color: theme.text, 
            flex: 1, 
            fontSize: 15,
          }}
        />
      </View>
      {onFilterPress && (
        <TouchableOpacity
          onPress={onFilterPress}
          style={{
            backgroundColor: theme.surface,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: 12,
          }}
        >
          <Ionicons name="options-outline" size={20} color={theme.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};
