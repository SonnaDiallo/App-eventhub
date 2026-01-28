import mongoose, { Document, Schema } from 'mongoose';

export interface ITicket extends Document {
  code: string;
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  participantName: string;
  participantEmail?: string;
  ticketType: string;
  price?: number;
  checkedIn: boolean;
  checkedInAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    participantName: {
      type: String,
      required: true,
      trim: true,
    },
    participantEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    ticketType: {
      type: String,
      default: 'Standard',
      trim: true,
    },
    price: {
      type: Number,
      min: 0,
    },
    checkedIn: {
      type: Boolean,
      default: false,
      index: true,
    },
    checkedInAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index composite pour les requêtes fréquentes
ticketSchema.index({ eventId: 1, checkedIn: 1 });
ticketSchema.index({ userId: 1, eventId: 1 });
ticketSchema.index({ code: 1 });

const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema);

export default Ticket;
