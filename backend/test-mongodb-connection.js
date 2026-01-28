/**
 * Script de test de connexion MongoDB
 * Utilise ce script pour tester ta connexion MongoDB
 * 
 * Usage: node test-mongodb-connection.js "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/"
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Récupérer la chaîne de connexion depuis les arguments ou .env
const mongoUri = process.argv[2] || process.env.MONGO_URI;

if (!mongoUri) {
  console.error('❌ Erreur: Aucune chaîne de connexion fournie');
  console.log('\nUsage:');
  console.log('  node test-mongodb-connection.js "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/"');
  console.log('\nOu définis MONGO_URI dans .env');
  process.exit(1);
}

console.log('🔍 Test de connexion MongoDB...\n');
console.log('📋 Chaîne de connexion:', mongoUri.replace(/:[^:@]+@/, ':****@')); // Masquer le password

// Options de connexion
const options = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

mongoose.connect(mongoUri, options)
  .then(() => {
    console.log('\n✅ Connexion réussie !');
    console.log('📊 Base de données:', mongoose.connection.name);
    console.log('🔗 Host:', mongoose.connection.host);
    console.log('📝 Collections disponibles:', mongoose.connection.collections ? Object.keys(mongoose.connection.collections) : 'Aucune');
    
    // Tester une opération simple
    return mongoose.connection.db.admin().ping();
  })
  .then(() => {
    console.log('✅ Ping réussi - MongoDB répond correctement');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur de connexion:');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (error.message.includes('authentication failed')) {
      console.error('🔐 PROBLÈME: Authentification échouée');
      console.error('\nSolutions:');
      console.error('  1. Vérifie ton username et password dans MongoDB Atlas');
      console.error('  2. Va dans "Database Access" sur MongoDB Atlas');
      console.error('  3. Vérifie que ton utilisateur existe et a les bonnes permissions');
    } else if (error.message.includes('timeout') || error.message.includes('ENOTFOUND')) {
      console.error('🌐 PROBLÈME: Timeout ou réseau');
      console.error('\nSolutions:');
      console.error('  1. Vérifie que ton IP est autorisée dans "Network Access" sur MongoDB Atlas');
      console.error('  2. Vérifie ta connexion internet');
      console.error('  3. Vérifie que le cluster MongoDB est actif (pas en pause)');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('🔗 PROBLÈME: Hostname introuvable');
      console.error('\nSolutions:');
      console.error('  1. Vérifie que l\'URL du cluster est correcte');
      console.error('  2. Vérifie que tu utilises mongodb+srv:// (pas mongodb://)');
    } else {
      console.error('❓ Erreur:', error.message);
    }
    
    console.error('\n📖 Consulte MONGODB_COMPASS_TROUBLESHOOTING.md pour plus d\'aide');
    process.exit(1);
  });
