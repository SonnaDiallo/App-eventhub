/**
 * @file FriendsScreen — Écran de gestion des amis et des demandes d'amitié.
 *
 * Deux onglets : « Mes amis » et « Demandes ». Permet de rechercher parmi
 * ses amis, d'accepter ou refuser les demandes entrantes, et de lancer
 * une conversation directe avec un ami via ChatRoom.
 * Les données sont rechargées à chaque focus de l'écran.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  TextInput,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useTheme } from '../../theme/ThemeContext';
import {
  getFriends,
  getIncomingFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  type FriendUser,
  type FriendRequestItem,
} from '../../services/friendsService';

type Props = NativeStackScreenProps<AuthStackParamList, 'Friends'>;

const FriendsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const openTab = route.params?.openTab;
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [requests, setRequests] = useState<FriendRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'requests'>(openTab === 'requests' ? 'requests' : 'all');

  const load = useCallback(async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        getFriends(),
        getIncomingFriendRequests(),
      ]);
      setFriends(friendsRes);
      setRequests(requestsRes);
    } catch (err: any) {
      console.error('Friends load error', err);
      Alert.alert('Erreur', 'Impossible de charger les amis et demandes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      if (openTab === 'requests') setActiveTab('requests');
    }, [load, openTab])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleAccept = async (requestId: string) => {
    setAcceptingId(requestId);
    try {
      await acceptFriendRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      await load();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Impossible d\'accepter');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setRejectingId(requestId);
    try {
      await rejectFriendRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Impossible de refuser');
    } finally {
      setRejectingId(null);
    }
  };

  const renderRequest = ({ item }: { item: FriendRequestItem }) => {
    const name = item.fromUser.name || [item.fromUser.firstName, item.fromUser.lastName].filter(Boolean).join(' ') || 'Utilisateur';
    const accepting = acceptingId === item.id;
    const rejecting = rejectingId === item.id;
    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {item.fromUser.photoURL ? (
          <Image
            source={{ uri: item.fromUser.photoURL }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: `${theme.primary}26` }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
          {item.fromUser.email ? (
            <Text style={[styles.email, { color: theme.textMuted }]}>{item.fromUser.email}</Text>
          ) : null}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => handleAccept(item.id)}
              disabled={accepting || rejecting}
              style={[styles.btn, styles.btnAccept, { backgroundColor: theme.success }]}
            >
              {accepting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>Accepter</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleReject(item.id)}
              disabled={accepting || rejecting}
              style={[styles.btn, styles.btnReject, { backgroundColor: theme.error }]}
            >
              {rejecting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>Refuser</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderFriend = ({ item }: { item: FriendUser }) => {
    const name = item.name || [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Utilisateur';
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => navigation.navigate('ChatRoom', { userId: item.id, userName: name })}
        activeOpacity={0.7}
      >
        {item.photoURL ? (
          <Image
            source={{ uri: item.photoURL }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: `${theme.primary}26` }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
          {item.email ? <Text style={[styles.email, { color: theme.textMuted }]}>{item.email}</Text> : null}
        </View>
        <Ionicons name="chatbubble-outline" size={22} color={theme.primary} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>Chargement...</Text>
      </View>
    );
  }

  const filteredFriends = friends.filter(friend => {
    const name = friend.name || [friend.firstName, friend.lastName].filter(Boolean).join(' ') || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredRequests = requests.filter(req => {
    const name = req.fromUser.name || [req.fromUser.firstName, req.fromUser.lastName].filter(Boolean).join(' ') || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Barre de recherche */}
      <View style={[styles.searchContainer, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher dans ton réseau..."
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Onglets */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'all' ? theme.primary : theme.textMuted }]}>
            Mes amis ({filteredFriends.length})
          </Text>
          {activeTab === 'all' && <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'requests' ? theme.primary : theme.textMuted }]}>
            Demandes ({filteredRequests.length})
          </Text>
          {activeTab === 'requests' && <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <>
            {activeTab === 'requests' ? (
              <View style={styles.section}>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((r) => (
                    <View key={r.id}>{renderRequest({ item: r })}</View>
                  ))
                ) : (
                  <View style={styles.empty}>
                    <Ionicons name="person-add-outline" size={64} color={theme.textMuted} />
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>
                      {searchQuery ? 'Aucun résultat' : 'Aucune demande'}
                    </Text>
                    <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                      {searchQuery ? 'Essaye une autre recherche' : 'Tu n\'as pas de demandes d\'ami en attente.'}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.section}>
                {filteredFriends.length > 0 ? (
                  filteredFriends.map((f) => (
                    <View key={f.id}>{renderFriend({ item: f })}</View>
                  ))
                ) : (
                  <View style={styles.empty}>
                    <Ionicons name="people-outline" size={64} color={theme.textMuted} />
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>
                      {searchQuery ? 'Aucun résultat' : 'Aucun ami'}
                    </Text>
                    <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                      {searchQuery ? 'Essaye une autre recherche' : 'Ajoute des participants d\'événements depuis la liste des participants.'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
  },
  listContent: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700' },
  cardBody: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  email: { fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  btnAccept: {},
  btnReject: {},
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyText: { textAlign: 'center', marginTop: 12, paddingHorizontal: 24, fontSize: 14 },
});

export default FriendsScreen;
