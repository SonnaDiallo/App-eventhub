import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { firebaseDb } from '../config/firebaseAdmin';
import { getUserByFirebaseUid } from '../services/userService';

type AuthRequest = Request & { user?: { userId?: string } };

const getUserId = (req: AuthRequest): string | null => (req as any).user?.userId ?? null;

const toDate = (v: admin.firestore.Timestamp | undefined): Date | undefined =>
  !v ? undefined : (v as admin.firestore.Timestamp).toDate?.();

/** toUserId dans le body = Firebase UID de l'ami */
export const sendRequest = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const me = await getUserByFirebaseUid(firebaseUid);
    if (!me) return res.status(404).json({ message: 'User not found in database' });

    const toUserId = req.body.toUserId;
    if (!toUserId || typeof toUserId !== 'string') return res.status(400).json({ message: 'Invalid toUserId' });
    if (toUserId === firebaseUid) return res.status(400).json({ message: 'Cannot send friend request to yourself' });

    const toUserSnap = await firebaseDb.collection('users').doc(toUserId).get();
    if (!toUserSnap.exists) return res.status(404).json({ message: 'User not found' });

    const pair = [firebaseUid, toUserId].sort();
    const docId = `${pair[0]}_${pair[1]}`;
    const existingSnap = await firebaseDb.collection('friendRequests').doc(docId).get();
    const existing = existingSnap.exists ? existingSnap.data() : null;

    if (existing) {
      if (existing.status === 'accepted') return res.status(400).json({ message: 'Already friends' });
      if (existing.fromUserId === firebaseUid && existing.status === 'pending') {
        return res.status(400).json({ message: 'Friend request already sent' });
      }
      if (existing.toUserId === firebaseUid && existing.status === 'pending') {
        return res.status(400).json({ message: 'They already sent you a request. Accept it from your requests.' });
      }
      if (existing.status === 'rejected' && existing.fromUserId === firebaseUid) {
        await firebaseDb.collection('friendRequests').doc(docId).update({ status: 'pending', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      } else if (existing.status === 'rejected') {
        return res.status(400).json({ message: 'Cannot send request. They previously declined.' });
      }
    }

    const toData = toUserSnap.data()!;
    const payload = {
      fromUserId: firebaseUid,
      toUserId,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await firebaseDb.collection('friendRequests').doc(docId).set(payload, { merge: true });

    return res.status(201).json({
      message: 'Friend request sent',
      request: {
        id: docId,
        toUser: { id: toUserId, name: toData.name, firstName: toData.firstName, lastName: toData.lastName, email: toData.email },
        status: 'pending',
        createdAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error('sendRequest error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getIncomingRequests = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const me = await getUserByFirebaseUid(firebaseUid);
    if (!me) return res.status(404).json({ message: 'User not found in database' });

    const snap = await firebaseDb.collection('friendRequests').where('toUserId', '==', firebaseUid).where('status', '==', 'pending').get();
    const fromIds = snap.docs.map((d) => d.data().fromUserId).filter(Boolean);
    const userSnaps = await Promise.all(fromIds.map((id) => firebaseDb.collection('users').doc(id).get()));
    const userMap: Record<string, any> = {};
    fromIds.forEach((id, i) => {
      if (userSnaps[i]?.exists) userMap[id] = userSnaps[i].data();
    });

    const list = snap.docs.map((d) => {
      const data = d.data();
      const u = userMap[data.fromUserId];
      return {
        id: d.id,
        fromUser: u ? { id: data.fromUserId, name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' '), firstName: u.firstName, lastName: u.lastName, email: u.email } : null,
        status: data.status,
        createdAt: toDate(data.createdAt),
      };
    });

    return res.status(200).json({ requests: list });
  } catch (error: any) {
    console.error('getIncomingRequests error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const acceptRequest = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const me = await getUserByFirebaseUid(firebaseUid);
    if (!me) return res.status(404).json({ message: 'User not found in database' });

    const requestId = req.params.id;
    if (!requestId) return res.status(400).json({ message: 'Invalid request id' });

    const docSnap = await firebaseDb.collection('friendRequests').doc(requestId).get();
    if (!docSnap.exists) return res.status(404).json({ message: 'Request not found or already handled' });
    const data = docSnap.data()!;
    if (data.toUserId !== firebaseUid || data.status !== 'pending') {
      return res.status(404).json({ message: 'Request not found or already handled' });
    }

    await docSnap.ref.update({ status: 'accepted', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    const fromSnap = await firebaseDb.collection('users').doc(data.fromUserId).get();
    const fromData = fromSnap.exists ? fromSnap.data()! : null;

    return res.status(200).json({
      message: 'Friend request accepted',
      friend: fromData ? { id: data.fromUserId, name: fromData.name || [fromData.firstName, fromData.lastName].filter(Boolean).join(' '), firstName: fromData.firstName, lastName: fromData.lastName, email: fromData.email } : null,
    });
  } catch (error: any) {
    console.error('acceptRequest error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const rejectRequest = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const me = await getUserByFirebaseUid(firebaseUid);
    if (!me) return res.status(404).json({ message: 'User not found in database' });

    const requestId = req.params.id;
    if (!requestId) return res.status(400).json({ message: 'Invalid request id' });

    const docSnap = await firebaseDb.collection('friendRequests').doc(requestId).get();
    if (!docSnap.exists) return res.status(404).json({ message: 'Request not found or already handled' });
    const data = docSnap.data()!;
    if (data.toUserId !== firebaseUid || data.status !== 'pending') return res.status(404).json({ message: 'Request not found or already handled' });

    await docSnap.ref.update({ status: 'rejected', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return res.status(200).json({ message: 'Friend request rejected' });
  } catch (error: any) {
    console.error('rejectRequest error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFriends = async (req: Request, res: Response) => {
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
    const ids = [...otherIds];
    const userSnaps = await Promise.all(ids.map((id) => firebaseDb.collection('users').doc(id).get()));
    const friends = userSnaps
      .map((s, i) => (s.exists ? { id: ids[i], ...s.data() } : null))
      .filter(Boolean)
      .map((u: any) => ({ id: u.id, name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' '), firstName: u.firstName, lastName: u.lastName, email: u.email }));

    return res.status(200).json({ friends });
  } catch (error: any) {
    console.error('getFriends error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
