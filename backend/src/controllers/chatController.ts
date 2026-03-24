/**
 * @module chatController
 * @description Contrôleur de messagerie privée entre amis.
 *
 * Implémente un système de chat 1-à-1 restreint aux utilisateurs
 * qui se sont mutuellement acceptés en amis (collection friendRequests).
 * Les messages sont stockés dans la collection Firestore « messages »
 * sans sous-collection, ce qui simplifie les requêtes croisées.
 *
 * Règles métier importantes :
 * - Seuls les amis acceptés peuvent échanger des messages.
 * - Un message ne peut être supprimé que par son expéditeur et
 *   seulement dans les 2 heures suivant l'envoi (soft-delete :
 *   le contenu est remplacé par « Message supprimé »).
 * - Le marquage « lu » n'est possible que par le destinataire.
 *
 * Routes gérées :
 * - GET    /chat/conversations                     → getConversations
 * - GET    /chat/conversations/:userId/messages     → getMessages
 * - POST   /chat/conversations/:userId/messages     → sendMessage
 * - PATCH  /chat/messages/:id/read                  → markMessageRead
 * - DELETE /chat/messages/:id                       → deleteMessage
 */
import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { firebaseDb } from '../config/firebaseAdmin';
import { getUserByFirebaseUid } from '../services/userService';

type AuthRequest = Request & { user?: { userId?: string } };

const getUserId = (req: AuthRequest): string | null => (req as any).user?.userId ?? null;

const toDate = (v: admin.firestore.Timestamp | undefined): Date | undefined =>
  !v ? undefined : (v as admin.firestore.Timestamp).toDate?.();

/** Vérifie si deux utilisateurs sont amis acceptés via la paire triée dans friendRequests. */
async function areFriends(userA: string, userB: string): Promise<boolean> {
  const pair = [userA, userB].sort();
  const docId = `${pair[0]}_${pair[1]}`;
  const doc = await firebaseDb.collection('friendRequests').doc(docId).get();
  return doc.exists ? (doc.data()?.status === 'accepted') : false;
}

/**
 * GET /chat/conversations
 * Retourne la liste des conversations de l'utilisateur connecté.
 * Pour chaque ami accepté, récupère le dernier message échangé et
 * le nombre de messages non lus. Le tri des messages se fait en
 * mémoire car Firestore ne permet pas de combiner where + orderBy
 * sur des champs différents sans index composite.
 *
 * @returns {Array} conversations - Liste triée par dernière activité
 */
export const getConversations = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const me = await getUserByFirebaseUid(firebaseUid);
    if (!me) return res.status(404).json({ message: 'User not found in database' });

    const sent = await firebaseDb.collection('friendRequests').where('fromUserId', '==', firebaseUid).where('status', '==', 'accepted').get();
    const received = await firebaseDb.collection('friendRequests').where('toUserId', '==', firebaseUid).where('status', '==', 'accepted').get();
    const otherIds = new Set<string>();
    sent.docs.forEach((d) => otherIds.add(d.data().toUserId));
    received.docs.forEach((d) => otherIds.add(d.data().fromUserId));

    const userSnaps = await Promise.all([...otherIds].map((id) => firebaseDb.collection('users').doc(id).get()));
    const ids = [...otherIds];
    const conversations: Array<{ user: any; lastMessage?: any; unreadCount: number }> = [];

    for (let i = 0; i < ids.length; i++) {
      const otherId = ids[i];
      const uSnap = userSnaps[i];
      if (!uSnap?.exists) continue;
      const u = uSnap.data()!;

      const [sentByMe, sentByThem] = await Promise.all([
        firebaseDb.collection('messages').where('senderId', '==', firebaseUid).where('receiverId', '==', otherId).get(),
        firebaseDb.collection('messages').where('senderId', '==', otherId).where('receiverId', '==', firebaseUid).get(),
      ]);
      
      // Trier en mémoire et prendre le dernier
      const sortedMe = sentByMe.docs.sort((a, b) => {
        const tA = a.data().createdAt?.toMillis?.() ?? 0;
        const tB = b.data().createdAt?.toMillis?.() ?? 0;
        return tB - tA;
      });
      const sortedThem = sentByThem.docs.sort((a, b) => {
        const tA = a.data().createdAt?.toMillis?.() ?? 0;
        const tB = b.data().createdAt?.toMillis?.() ?? 0;
        return tB - tA;
      });
      
      const lastMe = sortedMe[0];
      const lastThem = sortedThem[0];
      let lastMsg: { doc: admin.firestore.DocumentSnapshot; fromMe: boolean } | null = null;
      if (lastMe && lastThem) {
        const tMe = lastMe.data().createdAt?.toMillis?.() ?? 0;
        const tThem = lastThem.data().createdAt?.toMillis?.() ?? 0;
        lastMsg = tMe >= tThem ? { doc: lastMe, fromMe: true } : { doc: lastThem, fromMe: false };
      } else if (lastMe) lastMsg = { doc: lastMe, fromMe: true };
      else if (lastThem) lastMsg = { doc: lastThem, fromMe: false };

      const unreadSnap = await firebaseDb.collection('messages').where('senderId', '==', otherId).where('receiverId', '==', firebaseUid).where('readAt', '==', null).get();

      conversations.push({
        user: { id: otherId, name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Utilisateur', firstName: u.firstName, lastName: u.lastName, email: u.email, photoURL: u.photoURL },
        lastMessage: lastMsg ? { content: lastMsg.doc.data()!.content, createdAt: toDate(lastMsg.doc.data()!.createdAt), fromMe: lastMsg.fromMe } : undefined,
        unreadCount: unreadSnap.size,
      });
    }

    return res.status(200).json({ conversations });
  } catch (error: any) {
    console.error('getConversations error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /chat/conversations/:userId/messages
 * Récupère l'historique des messages entre l'utilisateur connecté et
 * un ami donné. Les deux sens (envoyés/reçus) sont fusionnés, triés
 * chronologiquement, puis tronqués aux N derniers (défaut 50, max 100).
 * Vérifie au préalable que les deux utilisateurs sont bien amis.
 *
 * @param {string} userId - Firebase UID de l'interlocuteur
 * @query {number} [limit=50] - Nombre max de messages à retourner
 */
export const getMessages = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const me = await getUserByFirebaseUid(firebaseUid);
    if (!me) return res.status(404).json({ message: 'User not found in database' });

    const otherUserId = req.params.userId;
    if (!otherUserId) return res.status(400).json({ message: 'Invalid userId' });

    if (!(await areFriends(firebaseUid, otherUserId))) return res.status(403).json({ message: 'You can only chat with friends' });

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const [snap1, snap2] = await Promise.all([
      firebaseDb.collection('messages').where('senderId', '==', firebaseUid).where('receiverId', '==', otherUserId).get(),
      firebaseDb.collection('messages').where('senderId', '==', otherUserId).where('receiverId', '==', firebaseUid).get(),
    ]);
    let list = [...snap1.docs, ...snap2.docs].map((d) => ({ id: d.id, ...d.data() })) as any[];
    list.sort((a, b) => ((a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)));
    list = list.slice(-limit);

    const listFormatted = list.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      receiverId: m.receiverId,
      content: m.content,
      readAt: toDate(m.readAt),
      createdAt: toDate(m.createdAt),
      fromMe: m.senderId === firebaseUid,
      senderName: me && m.senderId === firebaseUid ? (me.name || `${me.firstName || ''} ${me.lastName || ''}`.trim()) : undefined,
    }));

    return res.status(200).json({ messages: listFormatted });
  } catch (error: any) {
    console.error('getMessages error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /chat/conversations/:userId/messages
 * Envoie un nouveau message à un ami. Le contenu est limité à 5000
 * caractères pour éviter les abus. Le message est créé avec readAt=null
 * (non lu) et un timestamp serveur pour garantir l'ordre chronologique.
 *
 * @param {string} userId      - Firebase UID du destinataire
 * @body  {string} content     - Texte du message (1-5000 caractères)
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const me = await getUserByFirebaseUid(firebaseUid);
    if (!me) return res.status(404).json({ message: 'User not found in database' });

    const otherUserId = req.params.userId;
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!otherUserId) return res.status(400).json({ message: 'Invalid userId' });
    if (!content || content.length > 5000) return res.status(400).json({ message: 'Content required (max 5000 chars)' });

    if (!(await areFriends(firebaseUid, otherUserId))) return res.status(403).json({ message: 'You can only chat with friends' });

    const ref = await firebaseDb.collection('messages').add({
      senderId: firebaseUid,
      receiverId: otherUserId,
      content,
      readAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    const data = snap.data()!;

    return res.status(201).json({
      message: {
        id: ref.id,
        senderId: firebaseUid,
        receiverId: otherUserId,
        content: data.content,
        readAt: null,
        createdAt: toDate(data.createdAt as admin.firestore.Timestamp),
        fromMe: true,
        senderName: me.name || `${me.firstName || ''} ${me.lastName || ''}`.trim(),
      },
    });
  } catch (error: any) {
    console.error('sendMessage error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PATCH /chat/messages/:id/read
 * Marque un message comme lu en enregistrant un timestamp readAt.
 * Seul le destinataire du message peut le marquer comme lu, et
 * un message déjà lu ne peut pas être re-marqué (idempotence).
 *
 * @param {string} id - Identifiant Firestore du message
 */
export const markMessageRead = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const me = await getUserByFirebaseUid(firebaseUid);
    if (!me) return res.status(404).json({ message: 'User not found in database' });

    const messageId = req.params.id;
    if (!messageId) return res.status(400).json({ message: 'Invalid message id' });

    const doc = await firebaseDb.collection('messages').doc(messageId).get();
    if (!doc.exists) return res.status(404).json({ message: 'Message not found or already read' });
    const data = doc.data()!;
    if (data.receiverId !== firebaseUid || data.readAt != null) return res.status(404).json({ message: 'Message not found or already read' });

    await doc.ref.update({ readAt: admin.firestore.FieldValue.serverTimestamp() });
    return res.status(200).json({ message: 'Message marked as read', readAt: new Date() });
  } catch (error: any) {
    console.error('markMessageRead error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * DELETE /chat/messages/:id
 * Soft-delete d'un message : le contenu est remplacé par
 * « Message supprimé » plutôt que d'être physiquement supprimé,
 * afin de préserver la cohérence de la conversation côté destinataire.
 * Deux contraintes : seul l'expéditeur peut supprimer, et le message
 * doit avoir été envoyé il y a moins de 2 heures.
 *
 * @param {string} id - Identifiant Firestore du message
 */
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const me = await getUserByFirebaseUid(firebaseUid);
    if (!me) return res.status(404).json({ message: 'User not found in database' });

    const messageId = req.params.id;
    if (!messageId) return res.status(400).json({ message: 'Invalid message id' });

    const doc = await firebaseDb.collection('messages').doc(messageId).get();
    if (!doc.exists) return res.status(404).json({ message: 'Message not found' });
    
    const data = doc.data()!;
    
    // Vérifier que c'est bien l'expéditeur
    if (data.senderId !== firebaseUid) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    // Vérifier que le message a moins de 2h
    const messageTime = data.createdAt?.toMillis?.() ?? 0;
    const now = Date.now();
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    
    if (now - messageTime >= twoHoursInMs) {
      return res.status(403).json({ message: 'You can only delete messages sent less than 2 hours ago' });
    }

    // Marquer le message comme supprimé au lieu de le supprimer complètement
    await doc.ref.update({
      content: 'Message supprimé',
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error: any) {
    console.error('deleteMessage error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
