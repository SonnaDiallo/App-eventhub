import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAdminReviews, deleteAdminReview, type AdminReviewItem } from '../../services/adminService';
import { useTheme } from '../../theme/ThemeContext';

export default function AdminReviewsScreen() {
  const { theme } = useTheme();
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return reviews;
    const q = searchQuery.toLowerCase();
    return reviews.filter(
      (r) =>
        r.eventTitle?.toLowerCase().includes(q) ||
        r.userName?.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q)
    );
  }, [reviews, searchQuery]);

  const load = useCallback((page = 1) => {
    setError('');
    setLoading(true);
    const minDelay = new Promise((r) => setTimeout(r, 400));
    Promise.all([getAdminReviews(page, 20), minDelay])
      .then(([r]) => {
        setReviews(r.reviews);
        setPagination(r.pagination);
      })
      .catch(() => setError('Impossible de charger les avis'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = (reviewId: string) => {
    Alert.alert(
      'Confirmation',
      'Supprimer cet avis ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeleting(reviewId);
            try {
              await deleteAdminReview(reviewId);
              load(pagination.page);
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer l\'avis');
            }
            setDeleting(null);
          },
        },
      ]
    );
  };

  if (loading && reviews.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#7B5CFF" />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Chargement…</Text>
      </View>
    );
  }

  if (error && reviews.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.error, { color: theme.text }]}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load(1)}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Avis</Text>
      <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher (événement, auteur, commentaire…)"
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={filteredReviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textSecondary }]}>Aucun avis</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHeader}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Ionicons
                    key={n}
                    name={n <= item.rating ? 'star' : 'star-outline'}
                    size={14}
                    color="#FFB800"
                  />
                ))}
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                disabled={deleting === item.id}
                style={styles.deleteBtn}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={deleting === item.id ? theme.textSecondary : '#e74c3c'}
                />
              </TouchableOpacity>
            </View>
            <Text style={[styles.eventTitle, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.eventTitle || 'Événement'}
            </Text>
            <Text style={[styles.comment, { color: theme.text }]} numberOfLines={3}>
              {item.comment}
            </Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              {item.userName || 'Anonyme'}
            </Text>
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
  error: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
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
  card: { borderRadius: 12, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  stars: { flexDirection: 'row', gap: 2 },
  deleteBtn: { padding: 4 },
  eventTitle: { fontSize: 12, marginBottom: 6 },
  comment: { fontSize: 15 },
  meta: { fontSize: 12, marginTop: 6 },
  pagination: { padding: 12, borderTopWidth: 1 },
  paginationText: { fontSize: 13, textAlign: 'center' },
});
