/**
 * LoadingSpinner.tsx - Indicateur de chargement réutilisable.
 * 
 * Deux modes d'affichage :
 * - fullScreen : occupe tout l'écran avec fond thémé (pour les pages entières)
 * - inline : petit spinner avec message, pour les sections de page
 */

import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface LoadingSpinnerProps {
  /** Message affiché sous le spinner (défaut: "Chargement...") */
  message?: string;
  /** Si true, occupe tout l'écran avec le fond du thème */
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = "Chargement...", 
  fullScreen = false 
}) => {
  const { theme } = useTheme();

  if (fullScreen) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        {message && (
          <Text style={{ color: theme.textMuted, marginTop: 16, fontSize: 14 }}>
            {message}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={{ padding: 20, alignItems: 'center' }}>
      <ActivityIndicator size="large" color={theme.primary} />
      {message && (
        <Text style={{ color: theme.textMuted, marginTop: 12, fontSize: 14 }}>
          {message}
        </Text>
      )}
    </View>
  );
};
