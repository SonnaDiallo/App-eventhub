/**
 * app.config.js - Configuration Expo dynamique.
 * 
 * Charge les variables d'environnement via dotenv pour configurer :
 * - Les métadonnées de l'app (nom, version, orientation)
 * - Le deep linking (scheme "eventhub", associated domains iOS, intent filters Android)
 * - Les identifiants Firebase et l'URL du backend via process.env
 */

require('dotenv').config();

module.exports = {
  name: "EventHub",
  slug: "eventhub",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  /** Schéma d'URL personnalisé pour les deep links (eventhub://) */
  scheme: "eventhub",
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.eventhub.app",
    /** Domaines associés pour Universal Links (vérification email Firebase) */
    associatedDomains: [
      "applinks:eventhub-eedee.firebaseapp.com",
      "applinks:eventhub-eedee.page.link"
    ]
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#7B5CFF"
    },
    package: "com.eventhub.app",
    /** Intent filters pour intercepter les liens Firebase sur Android */
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: "eventhub-eedee.firebaseapp.com",
            pathPrefix: "/"
          },
          {
            scheme: "https",
            host: "eventhub-eedee.page.link",
            pathPrefix: "/"
          }
        ],
        category: ["BROWSABLE", "DEFAULT"]
      }
    ]
  },
  /** Variables exposées à l'app via Constants.expoConfig.extra */
  extra: {
    eas: {
      projectId: "831774299826"
    },
    /** URL du backend API, injectée depuis .env */
    apiUrl: process.env.API_URL,
    /** Configuration Firebase, toutes les clés proviennent de .env */
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID
    },
    /** Google OAuth Client IDs pour l'authentification sociale */
    GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID,
    GOOGLE_IOS_CLIENT_ID: process.env.GOOGLE_IOS_CLIENT_ID,
    GOOGLE_ANDROID_CLIENT_ID: process.env.GOOGLE_ANDROID_CLIENT_ID
  }
};
