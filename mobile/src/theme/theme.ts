/**
 * theme.ts - Définition des thèmes clair et sombre de l'application.
 * 
 * Chaque thème (ThemeColors) contient l'ensemble des tokens de couleur
 * utilisés dans toute l'app : backgrounds, textes, bordures, couleurs
 * primaires/accent, statuts, inputs, boutons et overlays.
 * 
 * La couleur primaire (#7B5CFF, violet) est partagée entre les deux thèmes.
 */

export type ThemeMode = 'light' | 'dark';

/** Contrat de couleurs que chaque thème doit implémenter */
export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  header: string;
  
  text: string;
  textSecondary: string;
  textMuted: string;
  
  border: string;
  borderLight: string;
  
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  accent: string;
  accentLight: string;
  
  success: string;
  error: string;
  warning: string;
  info: string;
  
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  
  buttonPrimary: string;
  buttonPrimaryText: string;
  buttonSecondary: string;
  buttonSecondaryText: string;
  
  overlay: string;
  modalBackground: string;
}

/** Thème sombre : fond très foncé (#050016) avec accents néon */
export const darkTheme: ThemeColors = {
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
  success: '#8B7BFF',
  error: '#FF4F8B',
  warning: '#ffaa00',
  info: '#00e0ff',
  
  // Inputs
  inputBackground: 'rgba(255, 255, 255, 0.05)',
  inputBorder: 'rgba(123, 92, 255, 0.3)',
  inputText: '#FFFFFF',
  inputPlaceholder: 'rgba(255, 255, 255, 0.4)',
  
  // Buttons
  buttonPrimary: '#7B5CFF',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#2A2A4A',
  buttonSecondaryText: '#FFFFFF',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  modalBackground: '#0A0A1E',
};

/** Thème clair : fond blanc avec ombres subtiles */
export const lightTheme: ThemeColors = {
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

/** Map des thèmes indexée par ThemeMode pour un accès dynamique */
export const themes = {
  light: lightTheme,
  dark: darkTheme,
};
