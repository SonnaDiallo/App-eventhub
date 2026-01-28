import User from '../models/User';
import { firebaseDb } from '../config/firebaseAdmin';

/**
 * Synchronise un utilisateur Firebase vers MongoDB
 */
export const syncUserToMongoDB = async (firebaseUid: string, userData: any) => {
  try {
    const existingUser = await User.findOne({ firebaseUid });
    
    if (existingUser) {
      // Mettre à jour l'utilisateur existant
      Object.assign(existingUser, {
        name: userData.name || existingUser.name,
        firstName: userData.firstName || existingUser.firstName,
        lastName: userData.lastName || existingUser.lastName,
        email: userData.email || existingUser.email,
        role: userData.role || existingUser.role,
        canScanTickets: userData.canScanTickets ?? existingUser.canScanTickets,
        themeMode: userData.themeMode || existingUser.themeMode,
        language: userData.language || existingUser.language,
      });
      await existingUser.save();
      return existingUser;
    } else {
      // Créer un nouvel utilisateur
      const newUser = new User({
        firebaseUid,
        name: userData.name,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email?.toLowerCase(),
        role: userData.role || 'user',
        canScanTickets: userData.canScanTickets || false,
        themeMode: userData.themeMode,
        language: userData.language || 'fr',
      });
      await newUser.save();
      return newUser;
    }
  } catch (error: any) {
    console.error('Error syncing user to MongoDB:', error);
    throw error;
  }
};

/**
 * Récupère un utilisateur depuis MongoDB par Firebase UID
 */
export const getUserByFirebaseUid = async (firebaseUid: string) => {
  try {
    return await User.findOne({ firebaseUid });
  } catch (error: any) {
    console.error('Error getting user from MongoDB:', error);
    throw error;
  }
};

/**
 * Récupère un utilisateur depuis MongoDB par email
 */
export const getUserByEmail = async (email: string) => {
  try {
    return await User.findOne({ email: email.toLowerCase() });
  } catch (error: any) {
    console.error('Error getting user from MongoDB:', error);
    throw error;
  }
};

/**
 * Met à jour un utilisateur dans MongoDB
 */
export const updateUserInMongoDB = async (firebaseUid: string, updates: any) => {
  try {
    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { $set: updates },
      { new: true, runValidators: true }
    );
    return user;
  } catch (error: any) {
    console.error('Error updating user in MongoDB:', error);
    throw error;
  }
};

/**
 * Synchronise tous les utilisateurs Firestore vers MongoDB (utilitaire)
 */
export const syncAllUsersFromFirestore = async () => {
  try {
    const usersSnapshot = await firebaseDb.collection('users').get();
    let synced = 0;
    let errors = 0;

    for (const doc of usersSnapshot.docs) {
      try {
        const firebaseData = doc.data();
        await syncUserToMongoDB(doc.id, {
          ...firebaseData,
          email: firebaseData.email?.toLowerCase(),
        });
        synced++;
      } catch (error) {
        console.error(`Error syncing user ${doc.id}:`, error);
        errors++;
      }
    }

    console.log(`✅ Synced ${synced} users, ${errors} errors`);
    return { synced, errors };
  } catch (error: any) {
    console.error('Error syncing all users:', error);
    throw error;
  }
};
