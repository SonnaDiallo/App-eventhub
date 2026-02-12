import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import { useNotifications } from './src/hooks/useNotifications';

function AppContent() {
  const { theme, themeMode } = useTheme();
  const { expoPushToken } = useNotifications();
  const BaseTheme = themeMode === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...BaseTheme,
    dark: themeMode === 'dark',
    colors: {
      ...BaseTheme.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      notification: theme.error,
    },
  };
  return (
    <NavigationContainer theme={navTheme}>
      <AuthNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}