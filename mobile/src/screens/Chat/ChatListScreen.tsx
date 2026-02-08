import React, { useCallback, useState } from 'react';
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
import { getConversations, type ConversationItem } from '../../services/chatService';

type Props = NativeStackScreenProps<AuthStackParamList, 'ChatList'>;

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diff < 172800000) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
};

const ChatListScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getConversations();
      setConversations(list);
    } catch (err: any) {
      console.error('Chat list error', err);
      Alert.alert('Erreur', 'Impossible de charger les conversations.');
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

  const renderItem = ({ item }: { item: ConversationItem }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => navigation.navigate('ChatRoom', { userId: item.user.id, userName: item.user.name })}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: `${theme.primary}26` }]}>
        <Text style={[styles.avatarText, { color: theme.primary }]}>
          {(item.user.name || 'U').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.body}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {item.user.name}
          </Text>
          {item.lastMessage && (
            <Text style={[styles.time, { color: theme.textMuted }]}>
              {formatTime(item.lastMessage.createdAt)}
            </Text>
          )}
        </View>
        {item.lastMessage ? (
          <Text style={[styles.preview, { color: theme.textMuted }]} numberOfLines={1}>
            {item.lastMessage.fromMe ? 'Tu: ' : ''}{item.lastMessage.content}
          </Text>
        ) : (
          <Text style={[styles.preview, { color: theme.textMuted }]}>Aucun message</Text>
        )}
      </View>
      {item.unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.error }]}>
          <Text style={styles.badgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

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
        data={conversations}
        keyExtractor={(item) => item.user.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={56} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Aucune conversation. Accepte des demandes d'ami pour discuter.
            </Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[theme.primary]} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700' },
  body: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '700', flex: 1 },
  time: { fontSize: 12 },
  preview: { fontSize: 14 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { textAlign: 'center', marginTop: 12, paddingHorizontal: 24 },
});

export default ChatListScreen;
