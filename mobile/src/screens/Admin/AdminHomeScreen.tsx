/**
 * @module AdminHomeScreen
 * @description Page d'accueil de l'espace administrateur.
 *
 * Sert de hub de navigation vers les différentes sections d'administration :
 * - Tableau de bord (statistiques globales)
 * - Gestion des utilisateurs (rôles, suppression)
 * - Gestion des événements (modération, suppression)
 * - Gestion des avis (modération)
 *
 * Inclut un bouton de déconnexion avec confirmation (Alert) qui :
 * 1. Supprime le token local (clearToken)
 * 2. Déconnecte Firebase Auth (auth.signOut)
 * 3. Réinitialise la pile de navigation vers l'écran Welcome
 */
/**
 * @file AdminHomeScreen.tsx
 * @description Écran d'accueil de l'espace administrateur (menu principal).
 *
 * Sert de hub de navigation vers les différentes sections d'administration :
 * tableau de bord, gestion des utilisateurs, événements et avis.
 * Inclut également la fonctionnalité de déconnexion qui efface le token
 * local et réinitialise la pile de navigation vers l'écran d'accueil.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { auth } from '../../services/firebase';
import { clearToken } from '../../services/authStorage';

export default function AdminHomeScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  /**
   * Propose une confirmation de déconnexion puis efface le token stocké,
   * déconnecte Firebase Auth et redirige vers l'écran Welcome.
   */
  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Quitter l\'espace admin ?');
      if (!confirmed) return;
      await clearToken();
      await auth.signOut();
      window.location.reload();
      return;
    }
    Alert.alert(
      'Déconnexion',
      'Quitter l\'espace admin ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await clearToken();
            await auth.signOut();
            navigation.reset({ index: 0, routes: [{ name: 'Welcome' as never }] });
          },
        },
      ]
    );
  };

  const items = [
    { route: 'AdminDashboard' as const, icon: 'stats-chart', label: 'Tableau de bord' },
    { route: 'AdminUsers' as const, icon: 'people', label: 'Utilisateurs' },
    { route: 'AdminEvents' as const, icon: 'calendar', label: 'Événements' },
    { route: 'AdminReviews' as const, icon: 'star', label: 'Avis' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Espace admin</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Gestion de la plateforme EventHub
      </Text>
      {items.map(({ route, icon, label }) => (
        <TouchableOpacity
          key={route}
          style={[styles.card, { backgroundColor: theme.surface }]}
          onPress={() => navigation.navigate(route as never)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#7B5CFF20' }]}>
            <Ionicons name={icon as any} size={28} color="#7B5CFF" />
          </View>
          <Text style={[styles.cardLabel, { color: theme.text }]}>{label}</Text>
          <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={22} color="#e74c3c" />
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
  },
});
