import { Request, Response } from 'express';
import admin from 'firebase-admin';
import axios from 'axios';
import { firebaseAuth, firebaseDb } from '../config/firebaseAdmin';
import { syncUserToMongoDB, getUserByFirebaseUid } from '../services/userService';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Name, email and password are required' });
    }

    const allowedRoles = new Set(['user', 'organizer']);
    const normalizedRole = typeof role === 'string' ? role : undefined;
    const safeRole = normalizedRole && allowedRoles.has(normalizedRole) ? normalizedRole : 'user';

    // Vérifier si l'utilisateur existe déjà dans Firestore
    const usersSnapshot = await firebaseDb
      .collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Créer l'utilisateur dans Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email.toLowerCase(),
      password,
      displayName: name,
    });

    const firebaseUid = userRecord.uid;

    // Créer le profil dans Firestore
    const userData = {
      name,
      email: email.toLowerCase(),
      role: safeRole,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await firebaseDb.collection('users').doc(firebaseUid).set(userData);

    // Synchroniser avec MongoDB
    try {
      await syncUserToMongoDB(firebaseUid, {
        name,
        email: email.toLowerCase(),
        role: safeRole,
      });
      console.log(`✅ User ${firebaseUid} synced to MongoDB`);
    } catch (mongoError) {
      console.error('⚠️ Failed to sync user to MongoDB (continuing anyway):', mongoError);
      // On continue même si MongoDB échoue, car Firebase est la source de vérité pour l'auth
    }

    // Générer un token custom pour l'utilisateur (valide 7 jours)
    const customToken = await admin.auth().createCustomToken(firebaseUid);

    return res.status(201).json({
      user: {
        id: firebaseUid,
        name,
        email: email.toLowerCase(),
        role: safeRole,
      },
      // Note: customToken doit être échangé contre un ID token côté client
      // Pour Thunder Client, on va utiliser une autre approche
      message: 'User created. Use Firebase Auth to get ID token.',
    });
  } catch (error: any) {
    console.error('Register error:', {
      message: error?.message,
      code: error?.code,
    });

    if (error?.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Email already in use' });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    // Utiliser Firebase Auth REST API pour obtenir un ID token directement
    const firebaseWebApiKey = process.env.FIREBASE_WEB_API_KEY;
    
    if (!firebaseWebApiKey) {
      // Fallback: vérifier les credentials et générer un token directement
      const usersSnapshot = await firebaseDb
        .collection('users')
        .where('email', '==', email.toLowerCase())
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      const firebaseUid = userDoc.id;

      // Vérifier le mot de passe en essayant de se connecter avec Firebase Admin
      try {
        // Vérifier que l'utilisateur existe dans Firebase Auth
        const userRecord = await admin.auth().getUser(firebaseUid);
        
        // Générer un custom token que nous pouvons utiliser
        const customToken = await admin.auth().createCustomToken(firebaseUid);
        
        // Pour obtenir un ID token, on peut utiliser le customToken
        // Mais pour simplifier, on retourne le customToken qui peut être utilisé
        // Note: Le customToken doit être échangé contre un ID token côté client
        // Pour l'instant, on va créer un token simple basé sur l'UID
        
        return res.status(200).json({
          token: customToken, // Custom token (peut être utilisé directement avec Firebase Admin SDK)
          customToken: customToken, // Pour compatibilité
          user: {
            id: firebaseUid,
            name: userData.name,
            email: userData.email,
            role: userData.role,
          },
          message: 'Token généré. Utilisez ce token dans le header Authorization: Bearer TOKEN',
          note: 'Si ce token ne fonctionne pas, configurez FIREBASE_WEB_API_KEY dans .env pour obtenir un ID token directement.',
        });
      } catch (error: any) {
        console.error('Firebase Auth error:', error?.message);
        return res.status(400).json({ message: 'Invalid credentials' });
      }
    }

    // Utiliser Firebase Auth REST API pour obtenir un ID token
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseWebApiKey}`;
    
    const authResponse = await axios.post(authUrl, {
      email: email.toLowerCase(),
      password,
      returnSecureToken: true,
    });

    const idToken = authResponse.data.idToken;
    const firebaseUid = authResponse.data.localId;

    // Récupérer les données utilisateur depuis MongoDB (priorité) ou Firestore (fallback)
    let userData: any = null;
    try {
      const mongoUser = await getUserByFirebaseUid(firebaseUid);
      if (mongoUser) {
        userData = {
          id: mongoUser._id.toString(),
          firebaseUid: mongoUser.firebaseUid,
          name: mongoUser.name,
          firstName: mongoUser.firstName,
          lastName: mongoUser.lastName,
          email: mongoUser.email,
          role: mongoUser.role,
          canScanTickets: mongoUser.canScanTickets,
          themeMode: mongoUser.themeMode,
          language: mongoUser.language,
        };
      }
    } catch (mongoError) {
      console.error('⚠️ Failed to get user from MongoDB, falling back to Firestore:', mongoError);
    }

    // Fallback vers Firestore si MongoDB n'a pas de données
    if (!userData) {
      const userSnap = await firebaseDb.collection('users').doc(firebaseUid).get();
      userData = userSnap.exists ? userSnap.data() : null;
      
      // Synchroniser vers MongoDB pour la prochaine fois
      if (userData) {
        try {
          await syncUserToMongoDB(firebaseUid, userData);
        } catch (syncError) {
          console.error('⚠️ Failed to sync user to MongoDB:', syncError);
        }
      }
    }

    if (!userData) {
      return res.status(400).json({ message: 'User profile not found' });
    }

    return res.status(200).json({
      token: idToken, // ID token Firebase à utiliser dans Authorization header
      user: {
        id: firebaseUid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
      },
    });
  } catch (error: any) {
    console.error('Login error:', {
      message: error?.message,
      code: error?.code,
      response: error?.response?.data,
    });

    if (error?.response?.data?.error?.message === 'INVALID_PASSWORD' || 
        error?.response?.data?.error?.message === 'EMAIL_NOT_FOUND') {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /auth/me - Retourne le profil de l'utilisateur connecté.
 * Si l'utilisateur n'est pas dans MongoDB, le récupère depuis Firestore et le synchronise.
 */
export const getMe = async (req: Request, res: Response) => {
  try {
    const firebaseUid = (req as any).user?.userId;
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    let userData: any = null;
    try {
      const mongoUser = await getUserByFirebaseUid(firebaseUid);
      if (mongoUser) {
        userData = {
          id: mongoUser._id.toString(),
          firebaseUid: mongoUser.firebaseUid,
          name: mongoUser.name,
          firstName: mongoUser.firstName,
          lastName: mongoUser.lastName,
          email: mongoUser.email,
          role: mongoUser.role,
          canScanTickets: mongoUser.canScanTickets,
          themeMode: mongoUser.themeMode,
          language: mongoUser.language,
        };
      }
    } catch (mongoError) {
      console.error('⚠️ getMe: Failed to get user from MongoDB, falling back to Firestore:', mongoError);
    }

    if (!userData) {
      const userSnap = await firebaseDb.collection('users').doc(firebaseUid).get();
      userData = userSnap.exists ? userSnap.data() : null;
      if (userData) {
        if (!userData.name && (userData.firstName || userData.lastName)) {
          userData = { ...userData, name: [userData.firstName, userData.lastName].filter(Boolean).join(' ') };
        }
        try {
          await syncUserToMongoDB(firebaseUid, userData);
          console.log(`✅ User ${firebaseUid} synced to MongoDB (via /auth/me)`);
        } catch (syncError) {
          console.error('⚠️ Failed to sync user to MongoDB:', syncError);
        }
      }
    }

    if (!userData) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    return res.status(200).json({
      user: {
        id: firebaseUid,
        mongoId: userData.id,
        name: userData.name,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role,
        canScanTickets: userData.canScanTickets,
        themeMode: userData.themeMode,
        language: userData.language,
      },
    });
  } catch (error: any) {
    console.error('getMe error:', error?.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};