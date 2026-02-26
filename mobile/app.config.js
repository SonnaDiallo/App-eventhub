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
      apiKey: "AIzaSyCsT-eOgyJWJT_1GcsUxVdI1wJuHevJP08",
      authDomain: "eventhub-eedee.firebaseapp.com",
      projectId: "eventhub-eedee",
      storageBucket: "eventhub-eedee.firebasestorage.app",
      messagingSenderId: "831774299826",
      appId: "1:831774299826:web:c3e8f3e8f3e8f3e8f3e8f3"
    }
  }
};
