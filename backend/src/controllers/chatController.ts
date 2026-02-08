import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message';
import FriendRequest from '../models/FriendRequest';
import User from '../models/User';
import { getUserByFirebaseUid } from '../services/userService';

type AuthRequest = Request & { user?: { userId?: string } };

const getMongoUserId = (req: AuthRequest): string | null => {
  return (req as any).user?.userId ?? null;
};

const areFriends = async (userA: mongoose.Types.ObjectId, userB: mongoose.Types.ObjectId): Promise<boolean> => {
  const doc = await FriendRequest.findOne({
    status: 'accepted',
    $or: [
      { fromUser: userA, toUser: userB },
      { fromUser: userB, toUser: userA },
    ],
  });
  return !!doc;
};

/**
 * GET /chat/conversations - Liste des conversations (amis avec dernier message)
 */
export const getConversations = async (req: Request, res: Response) => {
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

    const friendIds = accepted.map((r: any) =>
      r.fromUser._id.toString() === mongoUser._id.toString() ? r.toUser._id : r.fromUser._id
    );

    const conversations: Array<{
      user: { id: string; name: string; firstName?: string; lastName?: string; email?: string };
      lastMessage?: { content: string; createdAt: Date; fromMe: boolean };
      unreadCount: number;
    }> = [];

    for (const r of accepted) {
      const other = r.fromUser._id.toString() === mongoUser._id.toString() ? r.toUser : r.fromUser;
      const otherId = other._id.toString();

      const lastMsg = await Message.findOne({
        $or: [
          { senderId: mongoUser._id, receiverId: other._id },
          { senderId: other._id, receiverId: mongoUser._id },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(1)
        .lean();

      const unreadCount = await Message.countDocuments({
        senderId: other._id,
        receiverId: mongoUser._id,
        readAt: null,
      });

      conversations.push({
        user: {
          id: otherId,
          name: other.name || [other.firstName, other.lastName].filter(Boolean).join(' ') || 'Utilisateur',
          firstName: other.firstName,
          lastName: other.lastName,
          email: other.email,
        },
        lastMessage: lastMsg
          ? {
              content: lastMsg.content,
              createdAt: lastMsg.createdAt,
              fromMe: lastMsg.senderId.toString() === mongoUser._id.toString(),
            }
          : undefined,
        unreadCount,
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
    const firebaseUid = getMongoUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const mongoUser = await getUserByFirebaseUid(firebaseUid);
    if (!mongoUser) return res.status(404).json({ message: 'User not found in database' });

    const otherUserId = req.params.userId;
    if (!otherUserId || !mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: 'Invalid userId' });
    }

    const friends = await areFriends(mongoUser._id, new mongoose.Types.ObjectId(otherUserId));
    if (!friends) {
      return res.status(403).json({ message: 'You can only chat with friends' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const before = req.query.before as string; // optional cursor (message id or date)

    const otherId = new mongoose.Types.ObjectId(otherUserId);
    const query: any = {
      $or: [
        { senderId: mongoUser._id, receiverId: otherId },
        { senderId: otherId, receiverId: mongoUser._id },
      ],
    };
    if (before) {
      if (mongoose.Types.ObjectId.isValid(before)) {
        const beforeDoc = await Message.findById(before);
        if (beforeDoc) query.createdAt = { $lt: beforeDoc.createdAt };
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('senderId', 'name firstName lastName')
      .lean();

    const list = messages.reverse().map((m: any) => ({
      id: m._id.toString(),
      senderId: m.senderId._id.toString(),
      receiverId: m.receiverId.toString(),
      content: m.content,
      readAt: m.readAt,
      createdAt: m.createdAt,
      fromMe: m.senderId._id.toString() === mongoUser._id.toString(),
      senderName: m.senderId.name || [m.senderId.firstName, m.senderId.lastName].filter(Boolean).join(' '),
    }));

    return res.status(200).json({ messages: list });
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
    const firebaseUid = getMongoUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const mongoUser = await getUserByFirebaseUid(firebaseUid);
    if (!mongoUser) return res.status(404).json({ message: 'User not found in database' });

    const otherUserId = req.params.userId;
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';

    if (!otherUserId || !mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: 'Invalid userId' });
    }
    if (!content || content.length > 5000) {
      return res.status(400).json({ message: 'Content required (max 5000 chars)' });
    }

    const friends = await areFriends(mongoUser._id, new mongoose.Types.ObjectId(otherUserId));
    if (!friends) {
      return res.status(403).json({ message: 'You can only chat with friends' });
    }

    const message = await Message.create({
      senderId: mongoUser._id,
      receiverId: otherUserId,
      content,
    });
    await message.populate('senderId', 'name firstName lastName');

    const sender = (message as any).senderId;
    return res.status(201).json({
      message: {
        id: message._id.toString(),
        senderId: mongoUser._id.toString(),
        receiverId: otherUserId,
        content: message.content,
        readAt: message.readAt,
        createdAt: message.createdAt,
        fromMe: true,
        senderName: sender?.name || [sender?.firstName, sender?.lastName].filter(Boolean).join(' '),
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
    const firebaseUid = getMongoUserId(req as AuthRequest);
    if (!firebaseUid) return res.status(401).json({ message: 'Unauthorized' });

    const mongoUser = await getUserByFirebaseUid(firebaseUid);
    if (!mongoUser) return res.status(404).json({ message: 'User not found in database' });

    const messageId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message id' });
    }

    const message = await Message.findOneAndUpdate(
      { _id: messageId, receiverId: mongoUser._id, readAt: null },
      { readAt: new Date() },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: 'Message not found or already read' });
    }

    return res.status(200).json({ message: 'Message marked as read', readAt: message.readAt });
  } catch (error: any) {
    console.error('markMessageRead error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
