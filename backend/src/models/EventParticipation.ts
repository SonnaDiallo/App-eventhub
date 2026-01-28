import mongoose, { Document, Schema, Types } from 'mongoose';

export type ParticipationStatus = 'pending_payment' | 'confirmed';

export interface IEventParticipation extends Document {
  event: Types.ObjectId;
  user: Types.ObjectId;
  status: ParticipationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const eventParticipationSchema = new Schema<IEventParticipation>(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending_payment', 'confirmed'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

eventParticipationSchema.index({ event: 1, user: 1 }, { unique: true });

eventParticipationSchema.index({ event: 1, status: 1 });

const EventParticipation = mongoose.model<IEventParticipation>(
  'EventParticipation',
  eventParticipationSchema
);

export default EventParticipation;
