/**
 * @module config/firebaseAdmin
 * @description Initialisation et configuration du Firebase Admin SDK.
 *
 * Ce module est importé par side-effect dans server.ts pour garantir que Firebase
 * est initialisé une seule fois au démarrage. Il exporte ensuite les instances
 * partagées (auth, firestore) utilisées par tous les services backend.
 *
 * Stratégie de résolution du fichier de credentials :
 * 1. Variable d'environnement FIREBASE_SERVICE_ACCOUNT_PATH si définie
 * 2. Sinon, recherche automatique d'un fichier `eventhub-*firebase-adminsdk*.json`
 *    dans le dossier backend/ (pratique en développement local)
 *
 * @requires firebase-admin
 * @exports firebaseAdminApp - Instance de l'application Firebase Admin
 * @exports firebaseAuth - Service d'authentification Firebase
 * @exports firebaseDb - Instance Firestore
 */
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let serviceAccountPath: string;
let serviceAccount: any;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  } else {
    // Recherche automatique : remonte de deux niveaux (src/config → backend/)
    // pour trouver le fichier JSON de credentials placé à la racine du backend.
    const backendDir = path.join(__dirname, '../..');
    
    if (!fs.existsSync(backendDir)) {
      throw new Error(`Dossier backend introuvable: ${backendDir}`);
    }
    
    const files = fs.readdirSync(backendDir);
    const serviceAccountFile = files.find(file => 
      file.startsWith('eventhub-') && 
      file.includes('firebase-adminsdk') && 
      file.endsWith('.json')
    );
    
    if (serviceAccountFile) {
      serviceAccountPath = path.join(backendDir, serviceAccountFile);
      console.log(`✅ Fichier Firebase trouvé: ${serviceAccountFile}`);
    } else {
      throw new Error(
        'Fichier de service account Firebase introuvable. ' +
        'Placez le fichier JSON dans le dossier backend/ ou définissez FIREBASE_SERVICE_ACCOUNT_PATH dans .env'
      );
    }
  }

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Fichier de service account introuvable: ${serviceAccountPath}`);
  }

  const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
  serviceAccount = JSON.parse(serviceAccountContent);

  // Validation minimale : ces trois champs sont indispensables pour que le SDK fonctionne
  if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error('Le fichier de service account Firebase est invalide. Vérifiez qu\'il contient project_id, private_key et client_email.');
  }

  console.log(`✅ Firebase Admin SDK configuré pour le projet: ${serviceAccount.project_id}`);

} catch (error: any) {
  console.error('❌ Erreur lors de la configuration Firebase Admin:', error.message);
  throw error;
}

// Garde contre la double-initialisation (possible en cas de hot-reload ou tests)
let firebaseAdminApp: admin.app.App;

if (admin.apps.length > 0) {
  firebaseAdminApp = admin.app();
  console.log('✅ Utilisation de l\'instance Firebase existante');
} else {
  try {
    firebaseAdminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    console.log('✅ Firebase Admin SDK initialisé avec succès');
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'initialisation Firebase Admin:', error.message);
    throw new Error(`Impossible d'initialiser Firebase Admin: ${error.message}`);
  }
}

export { firebaseAdminApp };
export const firebaseAuth = admin.auth(firebaseAdminApp);
export const firebaseDb = admin.firestore(firebaseAdminApp);
