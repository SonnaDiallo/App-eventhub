/**
 * @module friendsController
 * @description Contrôleur du système d'amitié entre utilisateurs.
 *
 * Gère les demandes d'ami, leur acceptation/refus, et la liste d'amis.
 * Les relations d'amitié sont stockées dans la collection « friendRequests »
 * avec un ID déterministe basé sur la paire triée des deux UIDs
 * (ex: « uid1_uid2 »), ce qui garantit qu'il n'existe qu'un seul
 * document par paire d'utilisateurs et simplifie les vérifications.
 *
 * Statuts possibles d'une demande : pending → accepted | rejected.
 * Une demande rejetée peut être renvoyée uniquement par l'expéditeur
 * original (le destinataire qui a refusé ne peut pas ré-initier).
 *
 * Routes gérées :
 * - POST   /friends/request        → sendRequest
 * - GET    /friends/requests        → getIncomingRequests
 * - PATCH  /friends/requests/:id/accept → acceptRequest
 * - PATCH  /friends/requests/:id/reject → rejectRequest
 * - GET    /friends                 → getFriends
 */
import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { firebaseDb } from '../config/firebaseAdmin';
import { getUserByFirebaseUid } from '../services/userService';

type AuthRequest = Request & { user?: { userId?: string } };

const getUserId = (req: AuthRequest): string | null => (req as any).user?.userId ?? null;

const toDate = (v: admin.firestore.Timestamp | undefined): Date | undefined =>
  !v ? undefined : (v as admin.firestore.Timestamp).toDate?.();

/**
 * POST /friends/request
 * Envoie une demande d'ami. L'ID du document est la paire triée
 * des deux UIDs pour garantir l'unicité. Gère les cas limites :
 * déjà amis, demande déjà envoyée, demande inverse en attente,
 * et relance après un refus précédent.
 *
 * @body {string} toUserId - Firebase UID de l'utilisateur ciblé
 */
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

/**
 * GET /friends/requests
 * Liste les demandes d'ami en attente reçues par l'utilisateur connecté.
 * Joint le profil (nom, email, photo) de chaque expéditeur pour
 * permettre à l'utilisateur de décider d'accepter ou refuser.
 */
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
        fromUser: u ? { id: data.fromUserId, name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' '), firstName: u.firstName, lastName: u.lastName, email: u.email, photoURL: u.photoURL || u.profileImage } : null,
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

/**
 * PATCH /friends/requests/:id/accept
 * Accepte une demande d'ami en attente. Seul le destinataire (toUserId)
 * peut accepter. Passe le statut à « accepted », ce qui débloque
 * automatiquement la messagerie privée entre les deux utilisateurs.
 *
 * @param {string} id - Identifiant du document friendRequest (paire triée)
 */
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

/**
 * PATCH /friends/requests/:id/reject
 * Refuse une demande d'ami. Seul le destinataire (toUserId) peut
 * refuser. Le statut passe à « rejected ». L'expéditeur original
 * pourra éventuellement renvoyer une demande, mais le destinataire
 * qui a refusé ne peut pas en envoyer une.
 *
 * @param {string} id - Identifiant du document friendRequest
 */
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

/**
 * GET /friends
 * Retourne la liste d'amis acceptés de l'utilisateur connecté.
 * Combine les deux sens (envoyées + reçues avec status=accepted)
 * et déduplique les UIDs pour éviter les doublons, puis joint
 * le profil de chaque ami.
 */
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
