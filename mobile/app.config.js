require('dotenv').config();

module.exports = {
  name: "EventHub",
  slug: "eventhub",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  scheme: "eventhub",
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.eventhub.app",
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
  extra: {
    eas: {
      projectId: "831774299826"
    },
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID
    }
  }
};
