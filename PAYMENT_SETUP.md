# 💳 Configuration du Système de Paiement Stripe

Ce guide explique comment configurer le système de paiement Stripe pour EventHub.

---

## 📋 Prérequis

1. **Compte Stripe** : Créer un compte sur [https://stripe.com](https://stripe.com)
2. **Node.js** et **npm** installés
3. **Expo CLI** pour le mobile

---

## 🔧 Configuration Backend

### 1. Variables d'Environnement

Créer ou modifier le fichier `backend/.env` avec vos clés Stripe :

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

#### Obtenir les clés :

**Clé secrète (Secret Key) :**
1. Aller sur [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
2. Copier la **Secret key** (commence par `sk_test_`)
3. ⚠️ **IMPORTANT** : Utiliser la clé de **test** pour le développement

**Secret du Webhook :**
1. Aller sur [https://dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)
2. Cliquer sur **"Add endpoint"**
3. URL du endpoint : `http://votre-serveur:5000/api/payments/webhook`
   - Pour le développement local : `http://localhost:5000/api/payments/webhook`
   - Pour la production : `https://votre-domaine.com/api/payments/webhook`
4. Sélectionner les événements à écouter :
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
5. Copier le **Signing secret** (commence par `whsec_`)

### 2. Démarrer le Backend

```bash
cd backend
npm install
npm run dev
```

Le serveur démarre sur `http://localhost:5000`

---

## 📱 Configuration Mobile

### 1. Clé Publique Stripe

Modifier `mobile/App.tsx` ligne 10 :

```typescript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51xxxxxxxxxxxxx';
```

#### Obtenir la clé publique :
1. Aller sur [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
2. Copier la **Publishable key** (commence par `pk_test_`)

### 2. Installer les Dépendances

```bash
cd mobile
npm install
```

### 3. Démarrer l'Application

```bash
npm start
```

---

## 🧪 Test du Système de Paiement

### Cartes de Test Stripe

Utiliser ces numéros de carte pour tester :

| Carte | Numéro | Résultat |
|-------|--------|----------|
| **Visa (succès)** | `4242 4242 4242 4242` | ✅ Paiement réussi |
| **Visa (échec)** | `4000 0000 0000 0002` | ❌ Carte refusée |
| **Mastercard** | `5555 5555 5555 4444` | ✅ Paiement réussi |
| **Amex** | `3782 822463 10005` | ✅ Paiement réussi |

**Autres informations de test :**
- **Date d'expiration** : N'importe quelle date future (ex: 12/34)
- **CVC** : N'importe quel 3 chiffres (ex: 123)
- **Code postal** : N'importe quel code (ex: 75001)

### Scénario de Test Complet

1. **Créer un événement payant** :
   - Se connecter comme organisateur
   - Créer un événement avec `isFree: false` et `price: 10`

2. **Réserver un billet** :
   - Se connecter comme participant
   - Ouvrir l'événement
   - Cliquer sur "Réserver"
   - Le système crée un billet avec statut `pending_payment`

3. **Effectuer le paiement** :
   - L'app redirige vers l'écran de paiement
   - Entrer les informations de carte de test
   - Cliquer sur "Payer"
   - Le paiement est traité par Stripe
   - Le statut du billet passe à `confirmed`

4. **Vérifier le billet** :
   - Aller dans "Mes billets"
   - Le billet apparaît avec statut "Confirmé"

---

## 🔄 Flux de Paiement

```
┌─────────────────┐
│  Utilisateur    │
│  réserve un     │
│  événement      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend crée   │
│  un billet avec │
│  status:        │
│  pending_payment│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend       │
│  navigue vers   │
│  PaymentScreen  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend crée   │
│  PaymentIntent  │
│  via Stripe API │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend       │
│  affiche le     │
│  formulaire de  │
│  carte          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Utilisateur    │
│  entre les      │
│  infos de carte │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Stripe traite  │
│  le paiement    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend        │
│  confirme et    │
│  met à jour le  │
│  billet:        │
│  status:        │
│  confirmed      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Utilisateur    │
│  reçoit son     │
│  billet         │
└─────────────────┘
```

---

## 📁 Fichiers Créés

### Backend
- `backend/src/types/payments.ts` - Types TypeScript
- `backend/src/config/stripe.ts` - Configuration Stripe
- `backend/src/controllers/paymentController.ts` - Logique de paiement
- `backend/src/routes/paymentRoutes.ts` - Routes API

### Mobile
- `mobile/src/services/paymentService.ts` - Service API
- `mobile/src/screens/Payment/PaymentScreen.tsx` - Écran de paiement

---

## 🔌 API Endpoints

### POST `/api/payments/create-payment-intent`
Créer un PaymentIntent pour un événement.

**Headers :**
```
Authorization: Bearer <token>
```

**Body :**
```json
{
  "eventId": "event123",
  "amount": 10.00,
  "currency": "eur"
}
```

**Response :**
```json
{
  "paymentIntentId": "pi_xxxxx",
  "clientSecret": "pi_xxxxx_secret_xxxxx",
  "amount": 10.00,
  "currency": "eur"
}
```

### POST `/api/payments/confirm`
Confirmer un paiement et mettre à jour le billet.

**Headers :**
```
Authorization: Bearer <token>
```

**Body :**
```json
{
  "paymentIntentId": "pi_xxxxx",
  "ticketId": "ticket123"
}
```

**Response :**
```json
{
  "message": "Payment confirmed successfully",
  "ticketId": "ticket123",
  "status": "confirmed"
}
```

### GET `/api/payments/status/:paymentIntentId`
Récupérer le statut d'un paiement.

**Headers :**
```
Authorization: Bearer <token>
```

**Response :**
```json
{
  "paymentIntentId": "pi_xxxxx",
  "status": "succeeded",
  "amount": 10.00,
  "currency": "eur",
  "eventId": "event123",
  "ticketId": "ticket123"
}
```

### GET `/api/payments/my-payments`
Récupérer l'historique des paiements de l'utilisateur.

**Headers :**
```
Authorization: Bearer <token>
```

**Response :**
```json
{
  "payments": [
    {
      "id": "pi_xxxxx",
      "amount": 10.00,
      "currency": "eur",
      "status": "succeeded",
      "eventId": "event123",
      "eventTitle": "Concert Rock",
      "ticketId": "ticket123",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:31:00Z"
    }
  ]
}
```

### POST `/api/payments/webhook`
Webhook Stripe (pas d'authentification JWT, vérification par signature).

**Headers :**
```
stripe-signature: t=xxxxx,v1=xxxxx
```

**Body :** Raw body de Stripe

---

## 🔒 Sécurité

### Bonnes Pratiques

1. **Ne jamais exposer la clé secrète** :
   - ✅ Stocker dans `.env`
   - ❌ Ne jamais commit dans Git
   - ❌ Ne jamais envoyer au frontend

2. **Vérifier les webhooks** :
   - ✅ Utiliser `stripe.webhooks.constructEvent()`
   - ✅ Vérifier la signature Stripe

3. **Valider côté serveur** :
   - ✅ Vérifier que l'utilisateur est authentifié
   - ✅ Vérifier que l'événement existe
   - ✅ Vérifier que le montant est correct

4. **Utiliser HTTPS en production** :
   - ✅ Obligatoire pour les webhooks Stripe
   - ✅ Protège les données sensibles

---

## 🚀 Passage en Production

### 1. Obtenir les Clés de Production

1. Activer le compte Stripe (vérification d'identité)
2. Aller sur [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
3. Basculer en mode **Live** (en haut à droite)
4. Copier les clés de production :
   - Secret key : `sk_live_xxxxx`
   - Publishable key : `pk_live_xxxxx`

### 2. Configurer le Webhook de Production

1. Créer un nouveau webhook avec l'URL de production
2. Copier le nouveau signing secret
3. Mettre à jour `.env` avec les clés de production

### 3. Variables d'Environnement de Production

```env
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 4. Mettre à Jour l'App Mobile

```typescript
const STRIPE_PUBLISHABLE_KEY = 'pk_live_xxxxx';
```

---

## ❓ Dépannage

### Le paiement échoue toujours

**Vérifier :**
- Les clés Stripe sont correctes
- Le mode (test/live) est cohérent entre backend et frontend
- Le montant est > 0
- L'événement existe et est payant

### Le webhook ne fonctionne pas

**Vérifier :**
- L'URL du webhook est accessible publiquement
- Le signing secret est correct
- Les événements sont bien sélectionnés
- Le serveur renvoie un status 200

### Erreur "Invalid API Key"

**Solution :**
- Vérifier que `STRIPE_SECRET_KEY` est défini dans `.env`
- Vérifier que la clé commence par `sk_test_` ou `sk_live_`
- Redémarrer le serveur après modification de `.env`

---

## 📚 Ressources

- [Documentation Stripe](https://stripe.com/docs)
- [Stripe React Native](https://stripe.com/docs/payments/accept-a-payment?platform=react-native)
- [Webhooks Stripe](https://stripe.com/docs/webhooks)
- [Cartes de test](https://stripe.com/docs/testing)
- [Dashboard Stripe](https://dashboard.stripe.com)

---

## ✅ Checklist de Configuration

- [ ] Compte Stripe créé
- [ ] Clés API obtenues (test)
- [ ] `STRIPE_SECRET_KEY` ajouté dans `backend/.env`
- [ ] `STRIPE_PUBLISHABLE_KEY` ajouté dans `mobile/App.tsx`
- [ ] Webhook configuré
- [ ] `STRIPE_WEBHOOK_SECRET` ajouté dans `backend/.env`
- [ ] Backend démarré et fonctionnel
- [ ] Mobile démarré et fonctionnel
- [ ] Test avec carte `4242 4242 4242 4242` réussi
- [ ] Billet confirmé après paiement
- [ ] Webhook reçu et traité

---

**🎉 Félicitations ! Le système de paiement est maintenant configuré !**
