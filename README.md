# EventHub

Plateforme mobile de découverte et gestion d'événements avec système de billetterie intégré.

## 📱 Description

EventHub est une application mobile qui permet aux utilisateurs de :
- Découvrir des événements (concerts, festivals, conférences, etc.)
- Réserver et acheter des billets
- Créer et gérer ses propres événements
- Scanner des billets (organisateurs)
- Discuter avec d'autres participants
- Gérer ses amis et favoris

## 🏗️ Architecture

### Frontend Mobile (React Native)
- **Technologie** : React Native + TypeScript
- **Navigation** : React Navigation
- **Thème** : Système de thème clair/sombre
- **Authentification** : Firebase Auth

### Backend (Node.js)
- **Technologie** : Node.js + Express + TypeScript
- **Base de données** : MongoDB + Firebase Firestore
- **APIs externes** : Ticketmaster, Paris Open Data
- **Authentification** : JWT

### Services Cloud
- **Firebase** : Authentification, Firestore, Functions
- **MongoDB** : Base de données principale
- **Stockage** : Firebase Storage

## 📁 Structure du Projet

```
eventhub/
├── mobile/                 # Application React Native
│   ├── src/
│   │   ├── screens/       # Écrans de l'application
│   │   ├── components/    # Composants réutilisables
│   │   ├── navigation/    # Configuration navigation
│   │   ├── services/      # Services API
│   │   ├── theme/         # Thème et styles
│   │   └── contexts/      # Contextes React
│   └── App.tsx           # Point d'entrée
├── backend/               # Serveur Node.js
│   ├── src/
│   │   ├── controllers/   # Contrôleurs API
│   │   ├── models/        # Modèles de données
│   │   ├── routes/        # Routes Express
│   │   ├── services/      # Services métier
│   │   └── middleware/    # Middlewares
│   └── server.ts         # Point d'entrée
├── functions/            # Fonctions Firebase
│   └── src/
│       └── email/        # Service d'envoi d'emails
└── firebase.json         # Configuration Firebase
```

## 🚀 Installation et Démarrage

### Prérequis

- Node.js (v18+)
- npm ou yarn
- React Native CLI
- Android Studio / Xcode
- MongoDB Atlas
- Firebase project

### Configuration Backend

1. **Cloner le projet**
```bash
git clone https://github.com/SonnaDiallo/App-eventhub
cd eventhub
```

2. **Installer les dépendances backend**
```bash
cd backend
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos clés d'API et configurations
```

4. **Démarrer le serveur backend**
```bash
npm run dev
```

### Configuration Mobile

1. **Installer les dépendances mobile**
```bash
cd mobile
npm install
```

2. **Configurer Firebase**
```bash
# Ajouter votre fichier de configuration Firebase
# Suivre la documentation React Native Firebase
```

3. **Démarrer l'application**
```bash
npm start
```

### Configuration Firebase Functions

1. **Installer les dépendances**
```bash
cd functions
npm install
```

2. **Configurer l'email**
```bash
firebase functions:config:set email.user="votre-email@gmail.com" email.pass="mot-de passe-app"
```

3. **Déployer**
```bash
npm run deploy
```

## 🔧 Variables d'Environnement

### Backend (.env)
```env
# Base de données
MONGODB_URI=mongodb+srv://...
FIREBASE_PROJECT_ID=your-project-id

# Authentification
JWT_SECRET=your-jwt-secret

# APIs externes
TICKETMASTER_API_KEY=your-ticketmaster-key

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Serveur
PORT=5000
NODE_ENV=development
```

## Fonctionnalités Principales

### Utilisateur
- Authentification (email/mot de passe)
- Profil personnalisé
- Mes billets et réservations
- Événements favoris
- Messagerie instantanée
- Gestion des amis

### Organisateur
- Création d'événements
- Gestion des billets
- Scan de tickets QR
- Dashboard statistiques
- Gestion des participants

### Système
- Multi-langues (Français/Anglais)
- Thème clair/sombre
- Recherche avancée
- Catégories d'événements
- Synchronisation temps réel

## 🛠️ Technologies Utilisées

### Frontend
- React Native
- TypeScript
- React Navigation
- Firebase (Auth, Firestore)
- Expo
- React Native Vector Icons

### Backend
- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose
- Firebase Admin
- JWT
- Nodemailer

### DevOps
- Firebase Functions
- GitHub Actions (optionnel)
- ESLint
- Prettier

## 📊 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/profile` - Profil utilisateur

### Événements
- `GET /api/events` - Lister les événements
- `POST /api/events` - Créer un événement
- `GET /api/events/:id` - Détails événement
- `PUT /api/events/:id` - Modifier événement

### Billets
- `POST /api/tickets` - Acheter billet
- `GET /api/tickets/my` - Mes billets
- `POST /api/tickets/scan` - Scanner billet

### Amis
- `GET /api/friends` - Liste d'amis
- `POST /api/friends/request` - Demande d'ami
- `PUT /api/friends/accept/:id` - Accepter ami

## 🧪 Tests

```bash
# Backend tests
cd backend
npm test

# Mobile tests
cd mobile
npm test
```

## 📦 Déploiement

### Backend
```bash
cd backend
npm run build
npm start
```

### Mobile
```bash
# Build production
cd mobile
npm run build

# Pour iOS
npx react-native run-ios --configuration Release

# Pour Android
npx react-native run-android --variant=release
```

### Firebase Functions
```bash
cd functions
npm run deploy
```

## Contribuer

1. Fork le projet
2. Créer une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -am 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créer une Pull Request

##  Licence

Ce projet est sous licence propriétaire - tous droits réservés. Voir le fichier [LICENSE](LICENSE) pour les détails.

##  Support

Pour toute question ou problème :
- Créer une issue sur GitHub
- Contacter l'équipe de développement

## � Notifications Push

### Configuration

Les notifications push sont implémentées dans l'application mobile. Pour les activer :

#### 1. Ajouter dans `mobile/app.json`

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#7B5CFF"
        }
      ]
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#7B5CFF",
      "androidMode": "default"
    },
    "android": {
      "permissions": [
        "android.permission.POST_NOTIFICATIONS"
      ]
    },
    "ios": {
      "infoPlist": {
        "NSUserNotificationsUsageDescription": "Cette application envoie des notifications pour vous rappeler vos événements."
      }
    }
  }
}
```

### Utilisation

#### Planifier un rappel d'événement

```typescript
import { scheduleEventReminder } from './src/services/notificationService';

// Rappel 1h avant l'événement
await scheduleEventReminder(
  eventId,
  'Soirée Networking Tech',
  new Date('2024-12-25T19:00:00'),
  60 // minutes avant
);
```

#### Envoyer une notification immédiate

```typescript
import { sendImmediateNotification } from './src/services/notificationService';

await sendImmediateNotification(
  'Billet confirmé ! 🎉',
  'Votre billet a été confirmé',
  { eventId: '123', type: 'ticket_confirmed' }
);
```

#### Types de notifications

- `event_reminder` - Rappel avant un événement
- `new_event` - Nouvel événement
- `friend_joined` - Un ami s'est inscrit
- `ticket_confirmed` - Confirmation de billet
- `event_update` - Mise à jour d'événement
- `event_cancelled` - Événement annulé

### Fichiers créés

- `mobile/src/services/notificationService.ts` - Service de gestion des notifications
- `mobile/src/hooks/useNotifications.ts` - Hook React pour les notifications

## �🗺️ Roadmap

- [x] Notifications push ✅
- [ ] Paiement en ligne intégré
- [ ] Carte interactive des événements
- [ ] Système d'avis et notes
- [ ] Intégration réseaux sociaux
- [ ] Mode hors-ligne partiel

---

**EventHub** - Votre plateforme d'événements préférée 🎉
