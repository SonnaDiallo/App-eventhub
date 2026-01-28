import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  coverImage?: string;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  description?: string;
  isFree: boolean;
  price?: number;
  capacity?: number;
  organizerId?: mongoose.Types.ObjectId;
  organizerName?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    coverImage: {
      type: String,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    location: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isFree: {
      type: Boolean,
      required: true,
      default: true,
    },
    price: {
      type: Number,
      min: 0,
    },
    capacity: {
      type: Number,
      min: 0,
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    organizerName: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Event = mongoose.model<IEvent>('Event', eventSchema);

export default Event;
