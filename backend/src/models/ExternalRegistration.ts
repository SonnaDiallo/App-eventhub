import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IExternalRegistration extends Document {
  userId: Types.ObjectId;
  externalEventId: string; // ID de l'événement Ticketmaster
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  status: 'registered' | 'cancelled';
  registeredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const externalRegistrationSchema = new Schema<IExternalRegistration>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    externalEventId: {
      type: String,
      required: true,
      index: true,
    },
    eventTitle: {
      type: String,
      required: true,
      trim: true,
    },
    eventDate: {
      type: String,
      required: true,
      trim: true,
    },
    eventLocation: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['registered', 'cancelled'],
      default: 'registered',
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index composite pour éviter les doublons
externalRegistrationSchema.index({ userId: 1, externalEventId: 1 }, { unique: true });

const ExternalRegistration = mongoose.model<IExternalRegistration>('ExternalRegistration', externalRegistrationSchema);

export default ExternalRegistration;
