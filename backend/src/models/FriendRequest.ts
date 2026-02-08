import mongoose, { Document, Schema, Types } from 'mongoose';

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface IFriendRequest extends Document {
  fromUser: Types.ObjectId;
  toUser: Types.ObjectId;
  status: FriendRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

const friendRequestSchema = new Schema<IFriendRequest>(
  {
    fromUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

friendRequestSchema.index({ fromUser: 1, toUser: 1 }, { unique: true });
friendRequestSchema.index({ toUser: 1, status: 1 });
friendRequestSchema.index({ fromUser: 1, status: 1 });

const FriendRequest = mongoose.model<IFriendRequest>('FriendRequest', friendRequestSchema);
export default FriendRequest;
