// mobile/src/theme/theme.ts

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  card: string;
  header: string;
  
  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // Borders
  border: string;
  borderLight: string;
  
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Accent colors
  accent: string;
  accentLight: string;
  
  // Status colors
  success: string;
  error: string;
  warning: string;
  info: string;
  
  // Inputs
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  
  // Buttons
  buttonPrimary: string;
  buttonPrimaryText: string;
  buttonSecondary: string;
  buttonSecondaryText: string;
  
  // Overlay
  overlay: string;
  modalBackground: string;
}

export const darkTheme: ThemeColors = {
  // Backgrounds - Mode sombre actuel
  background: '#050016',
  surface: '#0F0F23',
  card: '#0b0620',
  header: '#0A0A1E',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#E0E0FF',
  textMuted: '#C0C0E0',
  
  // Borders
  border: 'rgba(123, 92, 255, 0.25)',
  borderLight: '#1A1A3A',
  
  // Primary colors
  primary: '#7b5cff',
  primaryLight: '#8B7BFF',
  primaryDark: '#6B4BFF',
  
  // Accent colors
  accent: '#00e0ff',
  accentLight: '#20f0ff',
  
  // Status colors
  success: '#00ff88',
  error: '#FF4F8B',
  warning: '#ffaa00',
  info: '#00e0ff',
  
  // Inputs
  inputBackground: 'rgba(255, 255, 255, 0.03)',
  inputBorder: 'rgba(123, 92, 255, 0.25)',
  inputText: '#FFFFFF',
  inputPlaceholder: 'rgba(255, 255, 255, 0.35)',
  
  // Buttons
  buttonPrimary: '#7B5CFF',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#2A2A4A',
  buttonSecondaryText: '#FFFFFF',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  modalBackground: '#0A0A1E',
};

export const lightTheme: ThemeColors = {
  // Backgrounds - Mode clair
  background: '#FFFFFF',
  surface: '#F5F5F7',
  card: '#FFFFFF',
  header: '#FFFFFF',
  
  // Text
  text: '#000000',
  textSecondary: '#1A1A1A',
  textMuted: '#666666',
  
  // Borders
  border: 'rgba(0, 0, 0, 0.1)',
  borderLight: '#E5E5E5',
  
  // Primary colors
  primary: '#7b5cff',
  primaryLight: '#9B8BFF',
  primaryDark: '#5B3BFF',
  
  // Accent colors
  accent: '#007AFF',
  accentLight: '#0088FF',
  
  // Status colors
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  info: '#007AFF',
  
  // Inputs
  inputBackground: '#F5F5F7',
  inputBorder: 'rgba(0, 0, 0, 0.1)',
  inputText: '#000000',
  inputPlaceholder: 'rgba(0, 0, 0, 0.4)',
  
  // Buttons
  buttonPrimary: '#7B5CFF',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#E5E5E5',
  buttonSecondaryText: '#000000',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalBackground: '#FFFFFF',
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
};
