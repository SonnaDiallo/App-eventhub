# 🔒 Configuration de Sécurité - EventHub

## ⚠️ Clés API Exposées - Actions Urgentes

GitHub a détecté que des clés API ont été exposées publiquement. Voici comment sécuriser l'application.

---

## 📋 Étapes de Sécurisation

### 1. Révoquer/Restreindre la Clé API Google (URGENT)

1. **Aller sur Google Cloud Console** :
   - https://console.cloud.google.com/apis/credentials

2. **Cliquer sur la clé `eventhub-mobile`**

3. **Ajouter des restrictions d'application** :
   - Sélectionner "Applications Android"
   - Package name : `com.eventhub.app`
   - Sélectionner "Applications iOS"
   - Bundle ID : `com.eventhub.app`

4. **Ajouter des restrictions d'API** :
   - Limiter aux API nécessaires :
     - Google Sign-In API
     - Firebase Authentication API
     - (Uniquement les API dont vous avez besoin)

5. **Sauvegarder** les modifications

---

### 2. Créer un Fichier `.env` Local

**Créer manuellement** le fichier `mobile/.env` avec le contenu suivant :

```env
# Firebase Configuration
FIREBASE_API_KEY=AIzaSyCsT-eOgyJWJT_1GcsUxVdI1wJuHevJP08
FIREBASE_AUTH_DOMAIN=eventhub-eedee.firebaseapp.com
FIREBASE_PROJECT_ID=eventhub-eedee
FIREBASE_STORAGE_BUCKET=eventhub-eedee.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=831774299826
FIREBASE_APP_ID=1:831774299826:web:c3e8f3e8f3e8f3e8f3e8f3

# API Configuration
API_URL=http://192.168.1.100:3000
```

**⚠️ IMPORTANT** : Ce fichier `.env` est déjà dans `.gitignore` et ne sera **jamais** committé sur Git.

---

### 3. Installer dotenv

```bash
cd mobile
npm install dotenv
```

---

### 4. Configuration Déjà Mise à Jour

✅ `app.config.js` utilise maintenant `process.env` pour lire les variables d'environnement
✅ `.gitignore` inclut `.env` pour éviter de le committer
✅ `.env.example` créé comme template

---

## 🚀 Pour les Autres Développeurs

Si quelqu'un clone le projet :

1. Copier `.env.example` vers `.env`
2. Remplir les valeurs avec les vraies clés API
3. Ne jamais committer le fichier `.env`

---

## 📱 Pour la Production (Expo/EAS)

Pour déployer en production, utiliser les secrets Expo :

```bash
# Ajouter les secrets
eas secret:create --scope project --name FIREBASE_API_KEY --value "votre_cle"
eas secret:create --scope project --name FIREBASE_AUTH_DOMAIN --value "votre_domaine"
# ... etc pour toutes les variables
```

---

## ✅ Checklist de Sécurité

- [ ] Révoquer/restreindre la clé API sur Google Cloud Console
- [ ] Créer le fichier `.env` localement
- [ ] Vérifier que `.env` est dans `.gitignore`
- [ ] Tester que l'application fonctionne avec les variables d'environnement
- [ ] Supprimer les clés en dur du code (si nécessaire)
- [ ] Fermer l'alerte GitHub Security

---

## 🔄 Après Sécurisation

Une fois toutes les étapes complétées :

1. Committer les changements (sans les clés sensibles)
2. Pousser sur GitHub
3. L'alerte GitHub devrait se fermer automatiquement

---

## 📞 Support

En cas de problème, vérifier :
- Que le fichier `.env` existe dans `mobile/`
- Que `dotenv` est installé
- Que les restrictions sont bien configurées sur Google Cloud
