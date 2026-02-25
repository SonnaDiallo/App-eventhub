import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useTheme } from '../../theme/ThemeContext';
import { getMessages, sendMessage, markMessageRead, type ChatMessage } from '../../services/chatService';
import { api } from '../../services/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'ChatRoom'>;

const ChatRoomScreen: React.FC<Props> = ({ route, navigation }) => {
  const { userId, userName } = route.params;
  const { theme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const markedAsReadRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    navigation.setOptions({ title: userName || 'Chat' });
  }, [userName, navigation]);

  const loadMessages = useCallback(async () => {
    try {
      const list = await getMessages(userId, { limit: 80 });
      setMessages(list);
    } catch (err: any) {
      console.error('Load messages error', err);
      Alert.alert('Erreur', 'Impossible de charger les messages.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      const newMsg = await sendMessage(userId, text);
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Impossible d\'envoyer');
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;
    try {
      await api.delete(`/chat/messages/${selectedMessage.id}`);
      // Mettre à jour le message localement
      setMessages(prev => prev.map(m => 
        m.id === selectedMessage.id 
          ? { ...m, content: 'Message supprimé', deletedAt: new Date().toISOString() }
          : m
      ));
      setShowDeleteModal(false);
      setSelectedMessage(null);
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Impossible de supprimer le message');
    }
  };

  const canDeleteMessage = (msg: ChatMessage): boolean => {
    if (!msg.fromMe) return false;
    const messageTime = new Date(msg.createdAt).getTime();
    const now = Date.now();
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    return (now - messageTime) < twoHoursInMs;
  };

  const handleMessagePress = (msg: ChatMessage) => {
    console.log('Message clicked:', { 
      id: msg.id, 
      fromMe: msg.fromMe, 
      readAt: msg.readAt,
      alreadyMarked: markedAsReadRef.current.has(msg.id)
    });
    
    if (!msg.fromMe && !msg.readAt && !markedAsReadRef.current.has(msg.id)) {
      console.log('Marking message as read:', msg.id);
      markedAsReadRef.current.add(msg.id);
      markMessageRead(msg.id)
        .then(() => {
          console.log('Message marked as read successfully:', msg.id);
          // Mettre à jour le message localement
          setMessages(prev => prev.map(m => 
            m.id === msg.id ? { ...m, readAt: new Date().toISOString() } : m
          ));
        })
        .catch(err => {
          console.error('Error marking message as read:', err);
          markedAsReadRef.current.delete(msg.id);
        });
    } else {
      console.log('Message NOT marked as read because:', {
        isFromMe: msg.fromMe,
        alreadyRead: !!msg.readAt,
        alreadyMarked: markedAsReadRef.current.has(msg.id)
      });
    }
  };

  const handleMessageLongPress = (msg: ChatMessage) => {
    if (canDeleteMessage(msg)) {
      setSelectedMessage(msg);
      setShowDeleteModal(true);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View
      style={[
        styles.bubbleWrap,
        item.fromMe ? styles.bubbleWrapRight : styles.bubbleWrapLeft,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.bubble,
          item.fromMe
            ? { backgroundColor: theme.primary, alignSelf: 'flex-end' }
            : { backgroundColor: theme.surface, borderColor: theme.border, alignSelf: 'flex-start' },
        ]}
        onPress={() => {
          console.log('TOUCH DETECTED!');
          handleMessagePress(item);
        }}
        onLongPress={() => handleMessageLongPress(item)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.bubbleText,
            { 
              color: (item as any).deletedAt 
                ? (item.fromMe ? 'rgba(255,255,255,0.5)' : theme.textMuted)
                : (item.fromMe ? '#fff' : theme.text),
              fontStyle: (item as any).deletedAt ? 'italic' : 'normal',
            },
          ]}
        >
          {item.content}
        </Text>
        <Text
          style={[
            styles.bubbleTime,
            { color: item.fromMe ? 'rgba(255,255,255,0.8)' : theme.textMuted },
          ]}
        >
          {new Date(item.createdAt).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Aucun message. Envoie le premier !
            </Text>
          </View>
        }
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />
      <View style={[styles.inputRow, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Message..."
          placeholderTextColor={theme.inputPlaceholder}
          style={[styles.input, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
          multiline
          maxLength={5000}
          editable={!sending}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!input.trim() || sending}
          style={[
            styles.sendBtn,
            { backgroundColor: input.trim() && !sending ? theme.primary : theme.borderLight },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de suppression */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDeleteModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Supprimer ce message ?
            </Text>
            <Text style={[styles.modalText, { color: theme.textMuted }]}>
              Ce message sera supprimé pour tout le monde.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.border }]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.error }]}
                onPress={handleDeleteMessage}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  bubbleWrap: { marginBottom: 10 },
  bubbleWrapLeft: { alignItems: 'flex-start' },
  bubbleWrapRight: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bubbleText: { fontSize: 15 },
  bubbleTime: { fontSize: 11, marginTop: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ChatRoomScreen;
