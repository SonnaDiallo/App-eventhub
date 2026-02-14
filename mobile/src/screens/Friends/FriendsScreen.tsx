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

const FriendsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [requests, setRequests] = useState<FriendRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

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
    }, [load])
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
        <View style={[styles.avatar, { backgroundColor: `${theme.primary}26` }]}>
          <Text style={[styles.avatarText, { color: theme.primary }]}>{name.charAt(0).toUpperCase()}</Text>
        </View>
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
        <View style={[styles.avatar, { backgroundColor: `${theme.primary}26` }]}>
          <Text style={[styles.avatarText, { color: theme.primary }]}>{name.charAt(0).toUpperCase()}</Text>
        </View>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <>
            {requests.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Demandes reçues</Text>
                {requests.map((r) => (
                  <View key={r.id}>{renderRequest({ item: r })}</View>
                ))}
              </View>
            ) : null}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Mes amis ({friends.length})
              </Text>
              {friends.length === 0 && requests.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="people-outline" size={56} color={theme.textMuted} />
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                    Aucun ami pour le moment. Ajoute des participants d'événements depuis la liste des participants.
                  </Text>
                </View>
              ) : (
                friends.map((f) => (
                  <View key={f.id}>{renderFriend({ item: f })}</View>
                ))
              )}
            </View>
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
  actions: { flexDirection: 'row', marginTop: 8 },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  btnAccept: {},
  btnReject: {},
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { textAlign: 'center', marginTop: 12, paddingHorizontal: 24 },
});

export default FriendsScreen;
