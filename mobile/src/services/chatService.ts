import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  doc,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { getFriends } from './friendsService';

export interface ChatUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  photoURL?: string;
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
  senderPhotoURL?: string;
}

export interface MessagesResponse {
  messages: ChatMessage[];
}

// Génère un ID de conversation unique entre deux utilisateurs
const getConversationId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join('_');
};

/** Liste des conversations (amis + dernier message) */
export const getConversations = async (): Promise<ConversationItem[]> => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) return [];

  try {
    // Récupérer la liste des amis
    const friends = await getFriends();
    
    const conversations: ConversationItem[] = [];

    for (const friend of friends) {
      const conversationId = getConversationId(currentUserId, friend.id);
      
      // Récupérer le dernier message
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'), firestoreLimit(1));
      const snap = await getDocs(q);
      
      let lastMessage;
      let unreadCount = 0;

      if (!snap.empty) {
        const msgData = snap.docs[0].data();
        lastMessage = {
          content: msgData.content || '',
          createdAt: msgData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          fromMe: msgData.senderId === currentUserId,
        };

        // Compter les messages non lus
        const unreadQuery = query(
          messagesRef,
          where('receiverId', '==', currentUserId),
          where('readAt', '==', null)
        );
        const unreadSnap = await getDocs(unreadQuery);
        unreadCount = unreadSnap.size;
      }

      conversations.push({
        user: {
          id: friend.id,
          name: friend.name || 'Utilisateur',
          photoURL: friend.photoURL,
        },
        lastMessage,
        unreadCount,
      });
    }

    // Trier par dernier message
    conversations.sort((a, b) => {
      const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return conversations;
  } catch (error) {
    console.error('Error getting conversations:', error);
    return [];
  }
};

/** Messages avec un ami */
export const getMessages = async (
  userId: string,
  options?: { limit?: number; before?: string }
): Promise<ChatMessage[]> => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) return [];

  try {
    const conversationId = getConversationId(currentUserId, userId);
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    
    let q = query(messagesRef, orderBy('createdAt', 'desc'));
    if (options?.limit) {
      q = query(q, firestoreLimit(options.limit));
    }

    const snap = await getDocs(q);
    
    return snap.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content || '',
        readAt: data.readAt?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        fromMe: data.senderId === currentUserId,
        senderName: data.senderName,
        senderPhotoURL: data.senderPhotoURL,
      };
    }).reverse(); // Remettre dans l'ordre chronologique
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
};

/** Envoyer un message à un ami */
export const sendMessage = async (
  userId: string,
  content: string
): Promise<ChatMessage> => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('Non authentifié');

  const conversationId = getConversationId(currentUserId, userId);
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');

  const messageData = {
    senderId: currentUserId,
    receiverId: userId,
    content: content.trim(),
    readAt: null,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(messagesRef, messageData);

  return {
    id: docRef.id,
    senderId: currentUserId,
    receiverId: userId,
    content: content.trim(),
    readAt: null,
    createdAt: new Date().toISOString(),
    fromMe: true,
  };
};

/** Marquer les messages comme lus */
export const markMessageRead = async (messageId: string): Promise<void> => {
  // Cette fonction nécessite de connaître la conversation
  // Pour l'instant, on ne fait rien (à améliorer)
  console.warn('markMessageRead not fully implemented for Firestore');
};

/** S'abonner aux nouveaux messages (temps réel) */
export const subscribeToMessages = (
  userId: string,
  callback: (messages: ChatMessage[]) => void
): Unsubscribe => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) return () => {};

  const conversationId = getConversationId(currentUserId, userId);
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content || '',
        readAt: data.readAt?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        fromMe: data.senderId === currentUserId,
      };
    });
    callback(messages);
  });
};

/** Supprimer un message */
export const deleteMessage = async (messageId: string): Promise<void> => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('Non connecté');

  // Trouver et supprimer le message dans toutes les conversations de l'utilisateur
  // Note: Cette approche est simplifiée - idéalement, on aurait l'ID de conversation
  const conversationsRef = collection(db, 'conversations');
  const snapshot = await getDocs(conversationsRef);

  for (const convDoc of snapshot.docs) {
    // Vérifier si l'utilisateur fait partie de cette conversation
    if (convDoc.id.includes(currentUserId)) {
      const messageRef = doc(db, 'conversations', convDoc.id, 'messages', messageId);
      try {
        await updateDoc(messageRef, {
          content: 'Message supprimé',
          deletedAt: serverTimestamp(),
          deletedBy: currentUserId,
        });
        return; // Message trouvé et mis à jour
      } catch (e) {
        // Message pas dans cette conversation, continuer
      }
    }
  }

  throw new Error('Message non trouvé');
};
