/**
 * ThemeToggle.tsx - Indicateur du mode de thème actuel.
 * 
 * Affiche le mode actuel (clair) avec une icône soleil.
 * Utilisé dans les paramètres ou le header pour informer
 * l'utilisateur du thème en cours.
 */

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View style={styles.content}>
        <Ionicons
          name="sunny"
          size={20}
          color={theme.primary}
        />
        <Text style={[styles.text, { color: theme.text }]}>
          Mode clair
        </Text>
      </View>
    </View>
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
