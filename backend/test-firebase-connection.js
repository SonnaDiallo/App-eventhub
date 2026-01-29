// Script de test pour vérifier la connexion Firebase
require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function testFirebaseConnection() {
  try {
    console.log('🔍 Recherche du fichier de service account Firebase...\n');

    let serviceAccountPath;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      console.log(`📁 Chemin depuis .env: ${serviceAccountPath}`);
    } else {
      const backendDir = path.join(__dirname);
      const files = fs.readdirSync(backendDir);
      const serviceAccountFile = files.find(file => 
        file.startsWith('eventhub-') && 
        file.includes('firebase-adminsdk') && 
        file.endsWith('.json')
      );
      
      if (serviceAccountFile) {
        serviceAccountPath = path.join(backendDir, serviceAccountFile);
        console.log(`📁 Fichier trouvé: ${serviceAccountFile}`);
      } else {
        console.error('❌ Aucun fichier Firebase trouvé dans:', backendDir);
        console.log('\nFichiers dans le dossier:');
        files.filter(f => f.endsWith('.json')).forEach(f => console.log(`  - ${f}`));
        process.exit(1);
      }
    }

    if (!fs.existsSync(serviceAccountPath)) {
      console.error(`❌ Fichier introuvable: ${serviceAccountPath}`);
      process.exit(1);
    }

    console.log(`✅ Fichier trouvé: ${serviceAccountPath}\n`);

    // Charger et valider le JSON
    const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
    let serviceAccount;
    
    try {
      serviceAccount = JSON.parse(serviceAccountContent);
    } catch (error) {
      console.error('❌ Erreur de parsing JSON:', error.message);
      process.exit(1);
    }

    // Vérifier les champs requis
    const requiredFields = ['project_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);
    
    if (missingFields.length > 0) {
      console.error(`❌ Champs manquants dans le fichier JSON: ${missingFields.join(', ')}`);
      process.exit(1);
    }

    console.log(`✅ Fichier JSON valide`);
    console.log(`   Project ID: ${serviceAccount.project_id}`);
    console.log(`   Client Email: ${serviceAccount.client_email}\n`);

    // Initialiser Firebase Admin
    console.log('🔧 Initialisation de Firebase Admin SDK...');
    
    if (admin.apps.length > 0) {
      admin.app().delete();
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firebase Admin SDK initialisé\n');

    // Tester la connexion Firestore
    console.log('🔍 Test de connexion à Firestore...');
    const db = admin.firestore();
    const testRef = db.collection('_test').doc('connection');
    
    await testRef.set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      test: true
    });
    
    console.log('✅ Écriture réussie dans Firestore');

    // Lire pour vérifier
    const doc = await testRef.get();
    if (doc.exists) {
      console.log('✅ Lecture réussie depuis Firestore');
    }

    // Nettoyer
    await testRef.delete();
    console.log('✅ Test document supprimé\n');

    // Tester Firebase Auth
    console.log('🔍 Test de connexion à Firebase Auth...');
    const auth = admin.auth();
    const users = await auth.listUsers(1);
    console.log(`✅ Firebase Auth accessible (${users.users.length} utilisateur(s) trouvé(s))\n`);

    console.log('🎉 Tous les tests Firebase sont passés avec succès!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

testFirebaseConnection();
