# EventHub Firebase Cloud Functions

## Installation

```bash
cd functions
npm install
```

## Configuration Email

Pour envoyer des emails, tu dois configurer un compte Gmail avec un "App Password" :

1. Va sur https://myaccount.google.com/security
2. Active la vérification en 2 étapes si ce n'est pas fait
3. Va dans "Mots de passe des applications"
4. Crée un nouveau mot de passe pour "Mail" > "Autre (EventHub)"
5. Copie le mot de passe généré (16 caractères)

Ensuite configure Firebase :

```bash
firebase functions:config:set email.user="ton-email@gmail.com" email.pass="xxxx-xxxx-xxxx-xxxx"
```

## Déploiement

```bash
npm run deploy
```

Ou depuis la racine du projet :

```bash
firebase deploy --only functions
```

## Test local

```bash
npm run serve
```

## Fonctionnement

La fonction `sendTicketEmail` est déclenchée automatiquement quand un nouveau document est créé dans la collection `tickets` de Firestore.

Elle envoie un email HTML avec :
- Les détails de l'événement
- Le QR code du billet
- Le code unique du billet
