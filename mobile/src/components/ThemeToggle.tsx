// mobile/src/components/ThemeToggle.tsx
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, themeMode, toggleTheme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Ionicons
          name={themeMode === 'dark' ? 'moon' : 'sunny'}
          size={20}
          color={theme.primary}
        />
        <Text style={[styles.text, { color: theme.text }]}>
          {themeMode === 'dark' ? 'Mode sombre' : 'Mode clair'}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={theme.textMuted}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
});
