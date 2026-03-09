import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../services/firebase';
import {
  getUsers,
  updateUserRole,
  deleteUser,
  type AdminUser,
} from '../../services/adminService';
import { useTheme } from '../../theme/ThemeContext';

export default function AdminUsersScreen() {
  const { theme } = useTheme();
  const currentUserId = auth.currentUser?.uid ?? '';
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const fetchUsers = useCallback(async () => {
    setError('');
    setLoading(true);
    const minDelay = new Promise((r) => setTimeout(r, 400));
    try {
      const [res] = await Promise.all([getUsers(), minDelay]);
      setUsers(res.users);
    } catch {
      setError('Impossible de charger les utilisateurs');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleChangeRole = async (userId: string, newRole: AdminUser['role']) => {
    setUpdating(userId);
    try {
      await updateUserRole(userId, newRole);
      fetchUsers();
    } catch {
      Alert.alert('Erreur', 'Impossible de changer le rôle');
    }
    setUpdating(null);
  };

  const handleDelete = (userId: string) => {
    Alert.alert(
      'Confirmation',
      'Supprimer cet utilisateur ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setUpdating(userId);
            try {
              await deleteUser(userId);
              fetchUsers();
            } catch {
              Alert.alert('Erreur', "Impossible de supprimer l'utilisateur");
            }
            setUpdating(null);
          },
        },
      ]
    );
  };

  if (loading && users.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#7B5CFF" />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Chargement…</Text>
      </View>
    );
  }

  if (error && users.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.error, { color: theme.text }]}>{error}</Text>
        <Text style={[styles.errorHint, { color: theme.textSecondary }]}>
          Vérifiez que le backend est démarré et que l’URL API est correcte (Paramètres).
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchUsers}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Gestion des membres</Text>
      <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher par nom ou email…"
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
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.name, { color: theme.text }]}>
                {item.name || item.email}
              </Text>
              {item.id !== currentUserId && (
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  disabled={updating === item.id}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.email, { color: theme.textSecondary }]}>{item.email}</Text>
            <Text style={[styles.roleLabel, { color: theme.textSecondary }]}>
              Rôle : {item.role}
            </Text>
            <Picker
              selectedValue={item.role}
              onValueChange={(value) => handleChangeRole(item.id, value as AdminUser['role'])}
              enabled={item.id !== currentUserId && updating !== item.id}
              style={[styles.picker, { color: theme.text }]}
              dropdownIconColor={theme.text}
            >
              <Picker.Item label="Utilisateur" value="user" />
              <Picker.Item label="Organisateur" value="organizer" />
              <Picker.Item label="Admin" value="admin" />
            </Picker>
          </View>
        )}
      />
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
  list: { padding: 20, paddingTop: 0 },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '600', flex: 1 },
  email: { fontSize: 14, marginTop: 2 },
  roleLabel: { fontSize: 13, marginTop: 6, marginBottom: 6 },
  picker: { marginVertical: 4 },
  deleteBtn: { padding: 8 },
});
