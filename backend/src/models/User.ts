import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'user' | 'organizer' | 'admin';

export interface IUser extends Document {
  firebaseUid?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string; // hashé avec bcrypt
  role: UserRole;
  canScanTickets?: boolean;
  themeMode?: 'light' | 'dark';
  language?: 'fr' | 'en' | 'es';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ['user', 'organizer', 'admin'],
      default: 'user',
    },
    canScanTickets: {
      type: Boolean,
      default: false,
    },
    themeMode: {
      type: String,
      enum: ['light', 'dark'],
    },
    language: {
      type: String,
      enum: ['fr', 'en', 'es'],
      default: 'fr',
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<IUser>('User', userSchema);

export default User;