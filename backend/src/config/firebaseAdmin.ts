import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Chemin vers le fichier de service account JSON
// On peut utiliser une variable d'environnement ou chercher automatiquement le fichier
let serviceAccountPath: string;
let serviceAccount: any;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    // Si une variable d'environnement est définie, l'utiliser
    serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  } else {
    // Sinon, chercher automatiquement le fichier dans le dossier backend
    const backendDir = path.join(__dirname, '../..');
    
    // Vérifier que le dossier existe
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

  // Vérifier que le fichier existe
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Fichier de service account introuvable: ${serviceAccountPath}`);
  }

  // Charger le fichier JSON
  const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
  serviceAccount = JSON.parse(serviceAccountContent);

  // Vérifier que le fichier JSON contient les champs requis
  if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error('Le fichier de service account Firebase est invalide. Vérifiez qu\'il contient project_id, private_key et client_email.');
  }

  console.log(`✅ Firebase Admin SDK configuré pour le projet: ${serviceAccount.project_id}`);

} catch (error: any) {
  console.error('❌ Erreur lors de la configuration Firebase Admin:', error.message);
  throw error;
}

// Initialiser Firebase Admin SDK (une seule fois)
let firebaseAdminApp: admin.app.App;

if (admin.apps.length > 0) {
  // Si Firebase est déjà initialisé, utiliser l'instance existante
  firebaseAdminApp = admin.app();
  console.log('✅ Utilisation de l\'instance Firebase existante');
} else {
  // Sinon, initialiser avec les credentials
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
