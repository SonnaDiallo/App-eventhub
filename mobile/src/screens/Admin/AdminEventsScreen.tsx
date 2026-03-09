import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getAdminEvents,
  deleteAdminEvent,
  type AdminEventItem,
} from '../../services/adminService';
import { useTheme } from '../../theme/ThemeContext';

function formatDate(d?: string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d;
  }
}

export default function AdminEventsScreen() {
  const { theme } = useTheme();
  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (e) =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q) ||
        (e.organizerName || '').toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  const load = useCallback((page = 1) => {
    setError('');
    setLoading(true);
    const minDelay = new Promise((r) => setTimeout(r, 400));
    Promise.all([
      getAdminEvents(page, 20),
      minDelay,
    ])
      .then(([r]) => {
        setEvents(r.events);
        setPagination(r.pagination);
      })
      .catch(() => setError('Impossible de charger les événements'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = (eventId: string) => {
    Alert.alert(
      'Confirmation',
      'Supprimer cet événement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeleting(eventId);
            try {
              await deleteAdminEvent(eventId);
              load(pagination.page);
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer l\'événement');
            }
            setDeleting(null);
          },
        },
      ]
    );
  };

  if (loading && events.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#7B5CFF" />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Chargement…</Text>
      </View>
    );
  }

  if (error && events.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.error, { color: theme.text }]}>{error}</Text>
        <Text style={[styles.errorHint, { color: theme.textSecondary }]}>
          Vérifiez que le backend est démarré et que l’URL API est correcte (Paramètres).
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load(1)}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Événements</Text>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textSecondary }]}>
            Aucun événement
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.row}>
              {item.coverImage ? (
                <Image source={{ uri: item.coverImage }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumbPlaceholder, { backgroundColor: theme.background }]}>
                  <Ionicons name="calendar-outline" size={24} color={theme.textSecondary} />
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  {item.category || '—'} · {item.location || '—'}
                </Text>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  {formatDate(item.startDate)} · {item.participantsCount ?? 0} participants
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                disabled={deleting === item.id}
                style={styles.deleteBtn}
              >
                <Ionicons
                  name="trash-outline"
                  size={22}
                  color={deleting === item.id ? theme.textSecondary : '#e74c3c'}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      {pagination.pages > 1 && (
        <View style={[styles.pagination, { borderTopColor: theme.surface }]}>
          <Text style={[styles.paginationText, { color: theme.textSecondary }]}>
            Page {pagination.page} / {pagination.pages} ({pagination.total} au total)
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 16 },
  error: { fontSize: 16, textAlign: 'center', marginBottom: 8 },
  errorHint: { fontSize: 13, textAlign: 'center', marginBottom: 20 },
  retryBtn: { backgroundColor: '#7B5CFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  title: { fontSize: 20, fontWeight: '700', marginHorizontal: 20, marginBottom: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 4 },
  list: { padding: 20, paddingTop: 0, paddingBottom: 24 },
  empty: { textAlign: 'center', marginTop: 24 },
  card: { borderRadius: 12, padding: 12, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  thumbPlaceholder: { width: 56, height: 56, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, marginLeft: 12 },
  eventTitle: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 8 },
  pagination: { padding: 12, borderTopWidth: 1 },
  paginationText: { fontSize: 13, textAlign: 'center' },
});
