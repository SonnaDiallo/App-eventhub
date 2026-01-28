import mongoose, { Document, Schema } from 'mongoose';

export interface IScanHistory extends Document {
  ticketId: mongoose.Types.ObjectId;
  ticketCode: string;
  eventId: mongoose.Types.ObjectId;
  eventTitle: string;
  participantName: string;
  participantId?: mongoose.Types.ObjectId;
  scannedBy: mongoose.Types.ObjectId;
  scannedByName: string;
  scannedAt: Date;
  canUndo: boolean;
  undoneAt?: Date;
  undoneBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const scanHistorySchema = new Schema<IScanHistory>(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },
    ticketCode: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    eventTitle: {
      type: String,
      required: true,
      trim: true,
    },
    participantName: {
      type: String,
      required: true,
      trim: true,
    },
    participantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    scannedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scannedByName: {
      type: String,
      required: true,
      trim: true,
    },
    scannedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    canUndo: {
      type: Boolean,
      default: true,
    },
    undoneAt: {
      type: Date,
    },
    undoneBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index composite pour les requêtes fréquentes
scanHistorySchema.index({ eventId: 1, scannedAt: -1 });
scanHistorySchema.index({ scannedBy: 1, scannedAt: -1 });

const ScanHistory = mongoose.model<IScanHistory>('ScanHistory', scanHistorySchema);

export default ScanHistory;
