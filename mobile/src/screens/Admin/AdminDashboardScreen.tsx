import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { getDashboardStats } from '../../services/adminService';
import type { DashboardStats } from '../../services/adminService';
import { useTheme } from '../../theme/ThemeContext';

export default function AdminDashboardScreen() {
  const { theme } = useTheme();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    setLoading(true);
    const minDelay = new Promise((r) => setTimeout(r, 400));
    Promise.all([
      getDashboardStats(),
      minDelay,
    ])
      .then(([data]) => setStats(data))
      .catch(() => setError('Impossible de charger les statistiques'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#7B5CFF" />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Chargement…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.error, { color: theme.text }]}>{error}</Text>
        <Text style={[styles.errorHint, { color: theme.textSecondary }]}>
          Vérifiez que le backend est démarré (npm run dev) et que l’URL API est correcte dans Paramètres.
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!stats) return null;

  const { users, events, tickets, reviews } = stats;
  const byRole = users.byRole || {};

  const cards = [
    { label: 'Utilisateurs', value: users.total, detail: `user: ${byRole.user ?? 0} · org: ${byRole.organizer ?? 0} · admin: ${byRole.admin ?? 0}` },
    { label: 'Événements', value: events.total },
    { label: 'Billets', value: tickets.total },
    { label: 'Avis', value: reviews.total },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {cards.map((card) => (
        <View key={card.label} style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>{card.label}</Text>
          <Text style={[styles.cardValue, { color: theme.text }]}>{card.value}</Text>
          {card.detail !== undefined && (
            <Text style={[styles.cardDetail, { color: theme.textSecondary }]}>{card.detail}</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 16 },
  error: { fontSize: 16, textAlign: 'center', marginBottom: 8 },
  errorHint: { fontSize: 13, textAlign: 'center', marginBottom: 20 },
  retryBtn: { backgroundColor: '#7B5CFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  card: {
    padding: 18,
    borderRadius: 12,
    marginBottom: 14,
  },
  cardLabel: { fontSize: 13, marginBottom: 4 },
  cardValue: { fontSize: 26, fontWeight: '700' },
  cardDetail: { fontSize: 12, marginTop: 6 },
});
