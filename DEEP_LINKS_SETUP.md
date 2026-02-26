# Configuration des Deep Links pour EventHub

Ce guide vous explique comment configurer les **Deep Links** et **Firebase Dynamic Links** pour permettre une redirection automatique depuis l'email de vérification vers l'application mobile.

## 📋 Prérequis

- Compte Firebase configuré
- Application mobile EventHub
- Accès à la console Firebase

## 🔧 Étape 1 : Configuration Firebase Dynamic Links

### 1.1 Activer Firebase Dynamic Links

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet **eventhub-eedee**
3. Dans le menu latéral, cliquez sur **Engagement** → **Dynamic Links**
4. Cliquez sur **Commencer**
5. Acceptez les conditions d'utilisation

### 1.2 Créer un domaine Dynamic Link

1. Cliquez sur **Ajouter un préfixe de domaine**
2. Entrez un nom unique, par exemple : `eventhub` ou `eventhubapp`
3. Votre domaine sera : `eventhub.page.link` (ou le nom que vous avez choisi)
4. Cliquez sur **Continuer** et **Terminer**

**Note importante** : Notez bien votre domaine Dynamic Link, vous en aurez besoin plus tard.

### 1.3 Configurer les paramètres iOS

1. Dans Dynamic Links, cliquez sur l'onglet **iOS**
2. Ajoutez les informations suivantes :
   - **Bundle ID** : `com.eventhub.app`
   - **App Store ID** : (laissez vide pour le développement)
   - **Team ID** : (votre Apple Developer Team ID si vous en avez un)

### 1.4 Configurer les paramètres Android

1. Cliquez sur l'onglet **Android**
2. Ajoutez les informations suivantes :
   - **Package name** : `com.eventhub.app`
   - **SHA-256 certificate fingerprint** : (optionnel pour le développement)

## 🔧 Étape 2 : Mettre à jour le code de l'application

### 2.1 Mettre à jour RegisterScreen.tsx

Le fichier `RegisterScreen.tsx` a déjà été mis à jour avec les `actionCodeSettings`. Vous devez juste remplacer l'URL par votre domaine Dynamic Link :

```typescript
const actionCodeSettings = {
  // REMPLACEZ par votre domaine Dynamic Link
  url: 'https://eventhub.page.link/?email=' + encodeURIComponent(email),
  handleCodeInApp: true,
  iOS: {
    bundleId: 'com.eventhub.app',
  },
  android: {
    packageName: 'com.eventhub.app',
    installApp: true,
    minimumVersion: '12',
  },
};
```

### 2.2 Fichier app.config.js créé

Le fichier `app.config.js` a été créé avec la configuration des deep links :
- **Scheme** : `eventhub://`
- **Associated Domains** (iOS) : `eventhub-eedee.firebaseapp.com`, `eventhub-eedee.page.link`
- **Intent Filters** (Android) : Configuration pour ouvrir les liens HTTPS

### 2.3 Gestionnaire de Deep Links dans App.tsx

Le fichier `App.tsx` a été mis à jour pour écouter les deep links entrants et recharger l'état de l'utilisateur.

## 🔧 Étape 3 : Configuration Firebase Authentication

### 3.1 Configurer les domaines autorisés

1. Dans Firebase Console, allez dans **Authentication** → **Settings** → **Authorized domains**
2. Ajoutez votre domaine Dynamic Link : `eventhub.page.link` (ou votre domaine)
3. Cliquez sur **Ajouter un domaine**

### 3.2 Personnaliser les templates d'email (optionnel)

1. Dans **Authentication** → **Templates**
2. Cliquez sur **Email address verification**
3. Personnalisez le message si vous le souhaitez
4. L'URL de redirection sera automatiquement gérée par les `actionCodeSettings`

## 📱 Étape 4 : Build de développement (IMPORTANT)

**⚠️ Les Deep Links ne fonctionnent PAS avec Expo Go !**

Vous devez créer un **Development Build** pour tester les deep links :

### 4.1 Installer EAS CLI

```bash
npm install -g eas-cli
```

### 4.2 Se connecter à Expo

```bash
eas login
```

### 4.3 Configurer le projet

```bash
cd mobile
eas build:configure
```

### 4.4 Créer un build de développement

Pour iOS :
```bash
eas build --profile development --platform ios
```

Pour Android :
```bash
eas build --profile development --platform android
```

### 4.5 Installer le build sur votre appareil

Une fois le build terminé, téléchargez et installez l'application sur votre appareil physique.

## 🧪 Étape 5 : Tester le flux complet

### 5.1 Test sur appareil physique

1. **Inscription** :
   - Ouvrez l'application (build de développement)
   - Créez un nouveau compte
   - Un email de vérification sera envoyé

2. **Vérification** :
   - Ouvrez l'email sur votre téléphone
   - Cliquez sur le lien de vérification
   - L'application devrait s'ouvrir automatiquement
   - Vous serez redirigé vers l'écran de connexion

3. **Connexion automatique** :
   - Si tout fonctionne, vous serez connecté automatiquement
   - Sinon, connectez-vous manuellement

### 5.2 Dépannage

Si l'application ne s'ouvre pas automatiquement :

1. **Vérifiez les logs** :
   ```bash
   npx expo start --dev-client
   ```
   Regardez les logs pour voir si le deep link est reçu

2. **Vérifiez la configuration** :
   - Bundle ID / Package name corrects
   - Domaines autorisés dans Firebase
   - Associated Domains configurés

3. **Testez manuellement le deep link** :
   ```bash
   # iOS (Simulator)
   xcrun simctl openurl booted "eventhub://verify?email=test@example.com"
   
   # Android
   adb shell am start -W -a android.intent.action.VIEW -d "eventhub://verify?email=test@example.com"
   ```

## 🎯 Alternative : Solution actuelle (sans build)

Si vous ne voulez pas créer un build de développement maintenant, la solution actuelle fonctionne bien :

1. L'utilisateur reçoit l'email de vérification
2. Il clique sur le lien (ouvre le navigateur)
3. Il retourne manuellement à l'application
4. L'écran de connexion détecte automatiquement que l'email est vérifié
5. L'utilisateur est connecté automatiquement

Cette solution fonctionne avec **Expo Go** et ne nécessite pas de configuration supplémentaire.

## 📚 Ressources

- [Firebase Dynamic Links](https://firebase.google.com/docs/dynamic-links)
- [Expo Linking](https://docs.expo.dev/guides/linking/)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Firebase Email Verification](https://firebase.google.com/docs/auth/web/email-link-auth)

## ✅ Checklist

- [ ] Firebase Dynamic Links activé
- [ ] Domaine Dynamic Link créé
- [ ] Domaines autorisés dans Firebase Auth
- [ ] app.config.js configuré
- [ ] RegisterScreen.tsx mis à jour avec le bon domaine
- [ ] App.tsx avec gestionnaire de deep links
- [ ] Build de développement créé (optionnel)
- [ ] Test sur appareil physique

---

**Note** : Pour l'instant, vous pouvez continuer à utiliser Expo Go avec la solution de détection automatique sur l'écran de connexion. Les deep links complets nécessitent un build natif.
