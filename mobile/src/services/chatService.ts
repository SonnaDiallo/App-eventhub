import { api } from './api';

export interface ChatUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface ConversationItem {
  user: ChatUser;
  lastMessage?: {
    content: string;
    createdAt: string;
    fromMe: boolean;
  };
  unreadCount: number;
}

export interface ConversationListResponse {
  conversations: ConversationItem[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  fromMe: boolean;
  senderName?: string;
}

export interface MessagesResponse {
  messages: ChatMessage[];
}

/** Liste des conversations (amis + dernier message) */
export const getConversations = async (): Promise<ConversationItem[]> => {
  const res = await api.get<ConversationListResponse>('/chat/conversations');
  return res.data.conversations || [];
};

/** Messages avec un ami (userId = MongoDB ObjectId) */
export const getMessages = async (
  userId: string,
  options?: { limit?: number; before?: string }
): Promise<ChatMessage[]> => {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.before) params.set('before', options.before);
  const q = params.toString();
  const url = `/chat/conversations/${userId}/messages${q ? `?${q}` : ''}`;
  const res = await api.get<MessagesResponse>(url);
  return res.data.messages || [];
};

/** Envoyer un message à un ami */
export const sendMessage = async (
  userId: string,
  content: string
): Promise<ChatMessage> => {
  const res = await api.post<{ message: ChatMessage }>(
    `/chat/conversations/${userId}/messages`,
    { content: content.trim() }
  );
  return res.data.message;
};

/** Marquer un message comme lu */
export const markMessageRead = async (messageId: string): Promise<void> => {
  await api.patch(`/chat/messages/${messageId}/read`);
};
