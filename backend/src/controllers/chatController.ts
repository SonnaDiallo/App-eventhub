import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { firebaseDb } from '../config/firebaseAdmin';
import { getUserByFirebaseUid } from '../services/userService';

type AuthRequest = Request & { user?: { userId?: string } };

const getUserId = (req: AuthRequest): string | null => (req as any).user?.userId ?? null;

const toDate = (v: admin.firestore.Timestamp | undefined): Date | undefined =>
  !v ? undefined : (v as admin.firestore.Timestamp).toDate?.();

async function areFriends(userA: string, userB: string): Promise<boolean> {
  const pair = [userA, userB].sort();
  const docId = `${pair[0]}_${pair[1]}`;
  const doc = await firebaseDb.collection('friendRequests').doc(docId).get();
  return doc.exists ? (doc.data()?.status === 'accepted') : false;
}

/**
 * GET /chat/conversations - Liste des conversations (amis avec dernier message)
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
        firebaseDb.collection('messages').where('senderId', '==', firebaseUid).where('receiverId', '==', otherId).orderBy('createdAt', 'desc').limit(1).get(),
        firebaseDb.collection('messages').where('senderId', '==', otherId).where('receiverId', '==', firebaseUid).orderBy('createdAt', 'desc').limit(1).get(),
      ]);
      const lastMe = sentByMe.docs[0];
      const lastThem = sentByThem.docs[0];
      let lastMsg: { doc: admin.firestore.DocumentSnapshot; fromMe: boolean } | null = null;
      if (lastMe && lastThem) {
        const tMe = lastMe.data().createdAt?.toMillis?.() ?? 0;
        const tThem = lastThem.data().createdAt?.toMillis?.() ?? 0;
        lastMsg = tMe >= tThem ? { doc: lastMe, fromMe: true } : { doc: lastThem, fromMe: false };
      } else if (lastMe) lastMsg = { doc: lastMe, fromMe: true };
      else if (lastThem) lastMsg = { doc: lastThem, fromMe: false };

      const unreadSnap = await firebaseDb.collection('messages').where('senderId', '==', otherId).where('receiverId', '==', firebaseUid).where('readAt', '==', null).get();

      conversations.push({
        user: { id: otherId, name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Utilisateur', firstName: u.firstName, lastName: u.lastName, email: u.email },
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
 * GET /chat/conversations/:userId/messages - Messages avec un ami (pagination)
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
 * POST /chat/conversations/:userId/messages - Envoyer un message à un ami
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
 * PATCH /chat/messages/:id/read - Marquer un message comme lu
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
