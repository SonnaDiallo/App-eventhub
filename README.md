# EventHub

Plateforme mobile de découverte et gestion d'événements avec système de billetterie intégré.

## 📱 Description

EventHub est une application mobile qui permet aux utilisateurs de :
- Découvrir des événements (concerts, festivals, conférences, gastronomie, sport, etc.)
- Réserver et acheter des billets (paiement Stripe)
- Créer et gérer ses propres événements
- Scanner des billets (organisateurs)
- Discuter avec d'autres participants
- Gérer ses amis et favoris
- Noter et laisser des avis sur les événements
- S'inscrire à des événements externes (Ticketmaster, Paris Open Data)

## 🏗️ Architecture

### Frontend Mobile (Expo / React Native)
- **Technologie** : Expo 54 + React Native + TypeScript
- **Navigation** : React Navigation
- **Thème** : Système de thème clair/sombre
- **Authentification** : Firebase Auth (email, Google Sign-In)
- **UI** : expo-linear-gradient, expo-blur, Stripe React Native

### Backend (Node.js)
- **Technologie** : Node.js + Express 5 + TypeScript
- **Base de données** : Firebase Firestore uniquement
- **APIs externes** : Ticketmaster, Paris Open Data, Unsplash
- **Authentification** : Firebase Admin + JWT
- **Paiements** : Stripe
- **Images** : Cloudinary
- **PDF** : Génération de billets (PDFKit, QR codes)

### Admin (Vite + React)
- **Technologie** : Vite 6 + React 19 + TypeScript
- **Rôle** : Dashboard admin, gestion événements, utilisateurs, avis

### Services Cloud
- **Firebase** : Auth, Firestore, Storage, Functions
- **Firebase Functions** : Création d'événements, billets, emails (Nodemailer), Stripe

## 📁 Structure du Projet

```
eventhub/
├── mobile/                 # Application Expo / React Native
│   ├── src/
│   │   ├── screens/       # Écrans (Auth, Events, Chat, Admin, etc.)
│   │   ├── components/    # Composants réutilisables
│   │   ├── navigation/    # AuthNavigator, EventNavigator
│   │   ├── services/      # API, Firebase, Stripe, etc.
│   │   ├── hooks/         # useEvents, useUserRole, useNotifications
│   │   ├── theme/         # Thème et ThemeContext
│   │   ├── utils/         # eventFilters, eventHelpers
│   │   └── config/        # constants
│   ├── app.config.js      # Config Expo (variables d'environnement)
│   └── package.json
├── backend/               # API Node.js
│   ├── src/
│   │   ├── controllers/   # auth, event, ticket, payment, admin, etc.
│   │   ├── routes/        # Routes Express
│   │   ├── services/      # externalEvents, imageService, pdfService
│   │   ├── middleware/    # requireAuth, requireRole, rateLimit
│   │   └── config/        # firebaseAdmin, stripe, validateEnv
│   └── server.ts
├── admin/                 # Interface admin web (Vite + React)
│   ├── src/
│   │   ├── pages/         # Dashboard, Users, Events, Login
│   │   ├── components/    # Layout
│   │   └── contexts/     # AuthContext
│   └── package.json
├── functions/             # Firebase Cloud Functions
│   └── src/
│       └── index.ts       # createEvent, createTicket, sendEmail, etc.
├── firebase.json          # Config Firebase (Firestore, Storage, Functions)
├── firestore.rules
└── storage.rules
```

## 🚀 Installation et Démarrage

### Prérequis

- Node.js (v18+)
- npm ou yarn
- Compte Firebase
- Compte Stripe (pour les paiements)
- Clé API Ticketmaster (optionnel, pour événements externes)

### 1. Cloner le projet

```bash
git clone https://github.com/SonnaDiallo/App-eventhub
cd eventhub
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Éditer .env : PORT, FIREBASE_SERVICE_ACCOUNT_PATH, JWT_SECRET, STRIPE_*, TICKETMASTER_API_KEY
npm run dev
```

Le serveur démarre sur le port 5000. L'URL API locale s'affiche (ex: `http://192.168.x.x:5000/api`).

### 3. Mobile (Expo)

```bash
cd mobile
npm install
cp .env.example .env
# Éditer .env : API_URL (ex: http://192.168.x.x:5000/api), Firebase, GOOGLE_WEB_CLIENT_ID
npx expo start --go
```

Utiliser Expo Go sur téléphone ou émulateur pour tester.

### 4. Admin (optionnel)

```bash
cd admin
npm install
cp .env.example .env
# Éditer .env : API_URL, Firebase
npm run dev
```

### 5. Firebase Functions (optionnel)

```bash
cd functions
npm install
cp .env.example .env
# Éditer .env : STRIPE_SECRET_KEY, TICKETMASTER_API_KEY, EMAIL_USER, EMAIL_PASS
npm run deploy
```

## 🔧 Variables d'Environnement

### Backend (`backend/.env`)

```env
PORT=5000
NODE_ENV=development

# Firebase Admin (chemin vers le fichier JSON service account)
FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/serviceAccountKey.json

# JWT
JWT_SECRET=your_jwt_secret_here

# Admins (emails séparés par des virgules)
ADMIN_EMAILS=admin@example.com

# APIs externes
TICKETMASTER_API_KEY=your_ticketmaster_key
UNSPLASH_ACCESS_KEY=your_unsplash_key

# Stripe (obligatoire pour paiements)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Mobile (`mobile/.env`)

```env
API_URL=http://192.168.x.x:5000/api

FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...

GOOGLE_WEB_CLIENT_ID=...apps.googleusercontent.com
```

### Functions (`functions/.env`)

```env
STRIPE_SECRET_KEY=sk_test_xxx
TICKETMASTER_API_KEY=...
EMAIL_USER=votre-email@gmail.com
EMAIL_PASS=mot-de-passe-app
```

## 📊 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur (JWT)

### Événements
- `GET /api/events` - Lister les événements
- `POST /api/events` - Créer un événement
- `GET /api/events/:id` - Détails événement
- `PUT /api/events/:id` - Modifier événement
- `POST /api/events/:id/join` - Rejoindre
- `POST /api/events/:id/leave` - Quitter

### Billets
- `GET /api/tickets/my` - Mes billets
- `GET /api/tickets/code/:code` - Billet par code
- `POST /api/tickets/verify` - Vérifier/Scanner billet

### Paiements
- `POST /api/payments/create-intent` - Créer PaymentIntent Stripe
- `POST /api/payments/confirm` - Confirmer paiement
- `POST /api/payments/webhook` - Webhook Stripe

### Avis
- `POST /api/reviews` - Créer un avis
- `GET /api/reviews/event/:eventId` - Avis d'un événement

### Amis
- `GET /api/friends` - Liste d'amis
- `POST /api/friends/request` - Demande d'ami
- `PUT /api/friends/accept/:id` - Accepter

### Utilisateurs (admin)
- `GET /api/users` - Liste des utilisateurs
- `PATCH /api/users/:id/role` - Modifier le rôle
- `DELETE /api/users/:id` - Supprimer un utilisateur

### Admin
- `GET /api/admin/stats` - Statistiques dashboard
- `GET /api/admin/events` - Liste événements
- `DELETE /api/admin/events/:id` - Supprimer événement
- `GET /api/admin/reviews` - Liste avis
- `DELETE /api/admin/reviews/:id` - Supprimer avis

### Événements externes
- `GET /api/external-events` - Événements Ticketmaster / Paris Open Data
- `POST /api/external-events/register` - S'inscrire à un événement externe

## 🛠️ Technologies Utilisées

### Mobile
- Expo 54, React Native 0.81
- TypeScript
- React Navigation 7
- Firebase (Auth, Firestore)
- Stripe React Native
- expo-linear-gradient, expo-blur, expo-notifications
- react-native-svg, react-native-qrcode-svg

### Backend
- Node.js, Express 5
- TypeScript
- Firebase Admin
- Stripe
- Cloudinary
- PDFKit, QRCode
- Nodemailer
- Socket.io

### Admin
- Vite 6, React 19
- React Router 7
- Firebase
- Axios

## 📱 Catégories d'événements

- **Musique** - Concerts, festivals
- **Sport** - Événements sportifs
- **Arts** - Expositions, théâtre, danse
- **Gastronomie** - Événements culinaires
- **Famille** - Activités familiales
- **Autre**

## 🔔 Notifications Push

Les notifications sont gérées via `expo-notifications` et `notificationService.ts`.

Types : rappels d'événements, confirmation de billet, nouveaux messages, etc.

## 📦 Déploiement

### Backend
```bash
cd backend
npm run build
npm start
```

### Mobile (EAS Build)
```bash
cd mobile
npx eas build --platform android
npx eas build --platform ios
```

### Admin
```bash
cd admin
npm run build
# Déployer le dossier dist/ sur un hébergeur statique
```

### Firebase
```bash
firebase deploy
```

## 🗺️ Roadmap

- [x] Notifications push ✅
- [x] Paiement en ligne (Stripe) ✅
- [x] Système d'avis et notes ✅
- [x] Interface admin (web) ✅
- [x] Événements externes (Ticketmaster, Paris Open Data) ✅
- [ ] Carte interactive des événements
- [ ] Intégration réseaux sociaux
- [ ] Mode hors-ligne partiel

## 📄 Licence

Ce projet est sous licence propriétaire - tous droits réservés. Voir [LICENSE](LICENSE).

---

**EventHub** - Votre plateforme d'événements préférée 🎉
