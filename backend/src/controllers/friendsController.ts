import { Request, Response } from 'express';
import mongoose from 'mongoose';
import FriendRequest from '../models/FriendRequest';
import User from '../models/User';
import { getUserByFirebaseUid } from '../services/userService';

type AuthRequest = Request & { user?: { userId?: string } };

const getMongoUserId = (req: AuthRequest): string | null => {
  return (req as any).user?.userId ?? null;
};

/**
 * POST /friends/request - Envoyer une demande d'ami (toUserId = MongoDB ObjectId)
 */
export const sendRequest = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getMongoUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const mongoUser = await getUserByFirebaseUid(firebaseUid);
    if (!mongoUser) return res.status(404).json({ message: 'User not found in database' });

    const toUserId = req.body.toUserId;
    if (!toUserId || !mongoose.Types.ObjectId.isValid(toUserId)) {
      return res.status(400).json({ message: 'Invalid toUserId' });
    }

    if (mongoUser._id.toString() === toUserId) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    const toUser = await User.findById(toUserId);
    if (!toUser) return res.status(404).json({ message: 'User not found' });

    const existing = await FriendRequest.findOne({
      $or: [
        { fromUser: mongoUser._id, toUser: toUser._id },
        { fromUser: toUser._id, toUser: mongoUser._id },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ message: 'Already friends' });
      }
      if (existing.fromUser.toString() === mongoUser._id.toString() && existing.status === 'pending') {
        return res.status(400).json({ message: 'Friend request already sent' });
      }
      if (existing.toUser.toString() === mongoUser._id.toString() && existing.status === 'pending') {
        return res.status(400).json({ message: 'They already sent you a request. Accept it from your requests.' });
      }
      // Rejected: allow re-send only if I was the sender (fromUser) and we re-send to same person
      if (existing.status === 'rejected' && existing.fromUser.toString() === mongoUser._id.toString()) {
        existing.status = 'pending';
        await existing.save();
        const fr = await FriendRequest.findById(existing._id).populate('toUser', 'name firstName lastName email');
        const to = (fr as any)?.toUser;
        return res.status(201).json({
          message: 'Friend request sent',
          request: {
            id: fr!._id,
            toUser: to ? { id: to._id.toString(), name: to.name, firstName: to.firstName, lastName: to.lastName, email: to.email } : null,
            status: 'pending',
            createdAt: fr!.createdAt,
          },
        });
      }
      if (existing.status === 'rejected') {
        return res.status(400).json({ message: 'Cannot send request. They previously declined.' });
      }
    }

    const friendRequest = await FriendRequest.create({
      fromUser: mongoUser._id,
      toUser: toUser._id,
      status: 'pending',
    });
    await friendRequest.populate('toUser', 'name firstName lastName email');

    const toUserDoc = (friendRequest as any).toUser;
    return res.status(201).json({
      message: 'Friend request sent',
      request: {
        id: friendRequest._id,
        toUser: toUserDoc ? {
          id: toUserDoc._id.toString(),
          name: toUserDoc.name,
          firstName: toUserDoc.firstName,
          lastName: toUserDoc.lastName,
          email: toUserDoc.email,
        } : null,
        status: friendRequest.status,
        createdAt: friendRequest.createdAt,
      },
    });
  } catch (error: any) {
    console.error('sendRequest error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /friends/requests - Mes demandes reçues (en attente)
 */
export const getIncomingRequests = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getMongoUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const mongoUser = await getUserByFirebaseUid(firebaseUid);
    if (!mongoUser) return res.status(404).json({ message: 'User not found in database' });

    const requests = await FriendRequest.find({
      toUser: mongoUser._id,
      status: 'pending',
    })
      .populate('fromUser', 'name firstName lastName email')
      .sort({ createdAt: -1 });

    const list = requests.map((r: any) => ({
      id: r._id.toString(),
      fromUser: {
        id: r.fromUser._id.toString(),
        name: r.fromUser.name || [r.fromUser.firstName, r.fromUser.lastName].filter(Boolean).join(' '),
        firstName: r.fromUser.firstName,
        lastName: r.fromUser.lastName,
        email: r.fromUser.email,
      },
      status: r.status,
      createdAt: r.createdAt,
    }));

    return res.status(200).json({ requests: list });
  } catch (error: any) {
    console.error('getIncomingRequests error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /friends/requests/:id/accept - Accepter une demande
 */
export const acceptRequest = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getMongoUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const mongoUser = await getUserByFirebaseUid(firebaseUid);
    if (!mongoUser) return res.status(404).json({ message: 'User not found in database' });

    const requestId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: 'Invalid request id' });
    }

    const friendRequest = await FriendRequest.findOne({
      _id: requestId,
      toUser: mongoUser._id,
      status: 'pending',
    }).populate('fromUser', 'name firstName lastName email');

    if (!friendRequest) {
      return res.status(404).json({ message: 'Request not found or already handled' });
    }

    friendRequest.status = 'accepted';
    await friendRequest.save();

    const fromUser = (friendRequest as any).fromUser;
    return res.status(200).json({
      message: 'Friend request accepted',
      friend: {
        id: fromUser._id.toString(),
        name: fromUser.name || [fromUser.firstName, fromUser.lastName].filter(Boolean).join(' '),
        firstName: fromUser.firstName,
        lastName: fromUser.lastName,
        email: fromUser.email,
      },
    });
  } catch (error: any) {
    console.error('acceptRequest error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /friends/requests/:id/reject - Refuser une demande
 */
export const rejectRequest = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getMongoUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const mongoUser = await getUserByFirebaseUid(firebaseUid);
    if (!mongoUser) return res.status(404).json({ message: 'User not found in database' });

    const requestId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: 'Invalid request id' });
    }

    const updated = await FriendRequest.findOneAndUpdate(
      { _id: requestId, toUser: mongoUser._id, status: 'pending' },
      { status: 'rejected' },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Request not found or already handled' });
    }

    return res.status(200).json({ message: 'Friend request rejected' });
  } catch (error: any) {
    console.error('rejectRequest error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /friends - Liste de mes amis (demandes acceptées)
 */
export const getFriends = async (req: Request, res: Response) => {
  try {
    const firebaseUid = getMongoUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const mongoUser = await getUserByFirebaseUid(firebaseUid);
    if (!mongoUser) return res.status(404).json({ message: 'User not found in database' });

    const accepted = await FriendRequest.find({
      status: 'accepted',
      $or: [{ fromUser: mongoUser._id }, { toUser: mongoUser._id }],
    })
      .populate('fromUser', 'name firstName lastName email')
      .populate('toUser', 'name firstName lastName email')
      .sort({ updatedAt: -1 });

    const friends = accepted.map((r: any) => {
      const other = r.fromUser._id.toString() === mongoUser._id.toString() ? r.toUser : r.fromUser;
      return {
        id: other._id.toString(),
        name: other.name || [other.firstName, other.lastName].filter(Boolean).join(' '),
        firstName: other.firstName,
        lastName: other.lastName,
        email: other.email,
      };
    });

    return res.status(200).json({ friends });
  } catch (error: any) {
    console.error('getFriends error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
