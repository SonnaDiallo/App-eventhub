import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Chemin vers le fichier de service account JSON
// On peut utiliser une variable d'environnement ou chercher automatiquement le fichier
let serviceAccountPath: string;

if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  // Si une variable d'environnement est définie, l'utiliser
  serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
} else {
  // Sinon, chercher automatiquement le fichier dans le dossier backend
  const backendDir = path.join(__dirname, '../..');
  const files = fs.readdirSync(backendDir);
  const serviceAccountFile = files.find(file => 
    file.startsWith('eventhub-') && 
    file.includes('firebase-adminsdk') && 
    file.endsWith('.json')
  );
  
  if (serviceAccountFile) {
    serviceAccountPath = path.join(backendDir, serviceAccountFile);
  } else {
    throw new Error(
      'Fichier de service account Firebase introuvable. ' +
      'Placez le fichier JSON dans le dossier backend/ ou définissez FIREBASE_SERVICE_ACCOUNT_PATH dans .env'
    );
  }
}

// Vérifier que le fichier existe
if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(`Fichier de service account introuvable: ${serviceAccountPath}`);
}

export const firebaseAdminApp = admin.apps.length
  ? admin.app()
  : admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });

export const firebaseAuth = admin.auth(firebaseAdminApp);
export const firebaseDb = admin.firestore(firebaseAdminApp);
