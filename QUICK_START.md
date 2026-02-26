# 🚀 EventHub - Guide de Démarrage Rapide

Bienvenue sur **EventHub** ! Ce guide vous permettra de démarrer rapidement votre projet.

---

## 📦 Installation

### 1. Backend

```bash
cd backend
npm install
```

### 2. Mobile

```bash
cd mobile
npm install
```

---

## ⚙️ Configuration

### 1. Firebase

1. Créer un projet sur [Firebase Console](https://console.firebase.google.com)
2. Télécharger le fichier `serviceAccountKey.json`
3. Placer le fichier dans `backend/`
4. Activer **Firestore** et **Authentication**

### 2. Variables d'Environnement Backend

Créer `backend/.env` :

```env
PORT=5000
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
JWT_SECRET=votre_secret_jwt_ici

# Stripe (pour les paiements)
STRIPE_SECRET_KEY=sk_test_votre_cle_stripe
STRIPE_WEBHOOK_SECRET=whsec_votre_webhook_secret

# Optionnel
TICKETMASTER_API_KEY=
UNSPLASH_ACCESS_KEY=
```

### 3. Clé Stripe Mobile

Modifier `mobile/App.tsx` ligne 10 :

```typescript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_votre_cle_publique_stripe';
```

---

## 🏃 Démarrage

### Backend

```bash
cd backend
npm run dev
```

Le serveur démarre sur `http://localhost:5000`

### Mobile

```bash
cd mobile
npm start
```

Choisir :
- **a** pour Android
- **i** pour iOS
- **w** pour Web

---

## ✨ Fonctionnalités Implémentées

### ✅ Système d'Authentification
- Inscription / Connexion avec Firebase
- Gestion des profils utilisateurs
- Rôles : Participant / Organisateur

### ✅ Gestion des Événements
- Créer des événements (gratuits ou payants)
- Catégories d'événements
- Recherche et filtres
- Favoris
- Événements externes (Ticketmaster)

### ✅ Système de Réservation
- Réserver des billets
- QR Code unique par billet
- Scan de billets (organisateurs)
- Statut : confirmé / en attente de paiement

### ✅ Système d'Avis ⭐ (NOUVEAU)
- Donner une note (1-5 étoiles)
- Écrire un commentaire
- Afficher la note moyenne
- Modifier/supprimer son avis
- Visible uniquement pour les participants

### ✅ Système de Paiement 💳 (NOUVEAU)
- Intégration Stripe
- Paiement sécurisé par carte
- Confirmation automatique des billets
- Webhooks pour synchronisation
- Historique des paiements

### ✅ Fonctionnalités Sociales
- Système d'amis
- Chat en temps réel
- Voir les participants
- Profils publics

### ✅ Dashboard Organisateur
- Vue d'ensemble des événements
- Statistiques de participation
- Scan de billets
- Gestion des participants

---

## 🧪 Test Rapide

### 1. Créer un Compte

- Ouvrir l'app mobile
- S'inscrire avec email/mot de passe
- Choisir le rôle (Participant ou Organisateur)

### 2. Créer un Événement (Organisateur)

- Aller dans "Dashboard Organisateur"
- Cliquer sur "Créer un événement"
- Remplir les informations
- Pour tester le paiement : décocher "Gratuit" et mettre un prix

### 3. Réserver un Billet (Participant)

- Parcourir les événements
- Cliquer sur un événement
- Cliquer sur "Réserver"
- Si payant : effectuer le paiement avec `4242 4242 4242 4242`

### 4. Donner un Avis

- Après avoir réservé, retourner sur l'événement
- Scroller jusqu'à la section "Avis"
- Cliquer sur "Donner mon avis"
- Sélectionner une note et écrire un commentaire

---

## 📱 Cartes de Test Stripe

| Numéro | Résultat |
|--------|----------|
| `4242 4242 4242 4242` | ✅ Succès |
| `4000 0000 0000 0002` | ❌ Échec |

**Autres infos :** Date future (12/34), CVC (123), Code postal (75001)

---

## 📚 Documentation Complète

- **Configuration Paiement** : Voir `PAYMENT_SETUP.md`
- **Architecture** : Voir `README.md`
- **API Backend** : `http://localhost:5000/api/`

---

## 🔧 Commandes Utiles

### Backend

```bash
npm run dev      # Démarrer en mode développement
npm run build    # Compiler TypeScript
npm start        # Démarrer en production
```

### Mobile

```bash
npm start        # Démarrer Expo
npm run android  # Lancer sur Android
npm run ios      # Lancer sur iOS
```

---

## 🐛 Problèmes Courants

### Backend ne démarre pas

**Solution :**
- Vérifier que le fichier `serviceAccountKey.json` existe
- Vérifier que les variables `.env` sont correctes
- Vérifier que le port 5000 est libre

### Mobile ne se connecte pas au backend

**Solution :**
- Vérifier l'URL dans `mobile/src/config/constants.ts`
- Pour Android : utiliser l'IP locale (pas localhost)
- Vérifier que le backend est démarré

### Paiement ne fonctionne pas

**Solution :**
- Vérifier les clés Stripe dans `.env` et `App.tsx`
- Utiliser les cartes de test Stripe
- Vérifier les logs du backend

---

## 📊 Structure du Projet

```
eventhub/
├── backend/                 # API Node.js + Express + TypeScript
│   ├── src/
│   │   ├── controllers/    # Logique métier
│   │   ├── routes/         # Routes API
│   │   ├── services/       # Services (Firebase, Stripe, etc.)
│   │   ├── types/          # Types TypeScript
│   │   ├── config/         # Configuration
│   │   └── middleware/     # Middlewares
│   └── .env               # Variables d'environnement
│
├── mobile/                  # App React Native + Expo
│   ├── src/
│   │   ├── screens/        # Écrans de l'app
│   │   ├── components/     # Composants réutilisables
│   │   ├── services/       # Services API
│   │   ├── navigation/     # Navigation
│   │   ├── theme/          # Thème et styles
│   │   └── contexts/       # Contextes React
│   └── App.tsx            # Point d'entrée
│
├── PAYMENT_SETUP.md        # Guide configuration paiement
├── QUICK_START.md          # Ce fichier
└── README.md               # Documentation principale
```

---

## 🎯 Prochaines Étapes

1. **Tester toutes les fonctionnalités**
2. **Personnaliser le design** (couleurs, logo)
3. **Configurer Stripe en production**
4. **Déployer le backend** (Heroku, Railway, etc.)
5. **Publier l'app mobile** (App Store, Play Store)

---

## 📞 Support

Pour toute question ou problème :

1. Consulter `README.md` pour l'architecture
2. Consulter `PAYMENT_SETUP.md` pour Stripe
3. Vérifier les logs du backend et du mobile
4. Vérifier la console Firebase

---

**🎉 Bon développement avec EventHub !**
