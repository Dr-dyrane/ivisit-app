const cleanEnvValue = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getWebAppUrl = () => {
  const explicitUrl = cleanEnvValue(process.env.EXPO_PUBLIC_WEB_APP_URL);
  if (explicitUrl) return explicitUrl;

  const productionHost = cleanEnvValue(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (productionHost) {
    return productionHost.startsWith("http") ? productionHost : `https://${productionHost}`;
  }

  const previewHost = cleanEnvValue(process.env.VERCEL_URL);
  if (previewHost) {
    return previewHost.startsWith("http") ? previewHost : `https://${previewHost}`;
  }

  return "https://app.ivisit.ng";
};

module.exports = ({ config }) => {
  const googleMapsWebApiKey = cleanEnvValue(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);
  const googleMapsWebMapId =
    cleanEnvValue(process.env.EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID) ||
    cleanEnvValue(process.env.EXPO_PUBLIC_GOOGLE_MAP_ID);
  const googleMapsAndroidApiKey =
    cleanEnvValue(process.env.GOOGLE_MAPS_ANDROID_API_KEY) ?? googleMapsWebApiKey;

  return {
    ...config,
    name: "iVisit",
    slug: "ivisit",
    scheme: "ivisit",
    version: "1.0.5",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#00000000",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.dyrane.ivisit",
      infoPlist: {
        NSCameraUsageDescription:
          "This app needs access to your camera to allow you to take photos for your profile and scan business cards/documents for text extraction.",
        NSPhotoLibraryUsageDescription:
          "This app needs access to your photo library to select profile images.",
        NSLocationWhenInUseUsageDescription:
          "iVisit needs your location to find nearby hospitals and dispatch emergency services to your exact position.",
        NSContactsUsageDescription:
          "iVisit uses your contacts to help you quickly add emergency contacts from your address book.",
        ITSAppUsesNonExemptEncryption: false,
        LSApplicationQueriesSchemes: ["ivisit"],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#000000",
      },
      package: "com.dyrane.ivisit",
      newArchEnabled: true,
      userInterfaceStyle: "dark",
      ...(googleMapsAndroidApiKey
        ? {
            config: {
              googleMaps: {
                apiKey: googleMapsAndroidApiKey,
              },
            },
          }
        : {}),
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "CAMERA",
        "READ_CONTACTS",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "INTERNET",
        "RECORD_AUDIO",
        "MODIFY_AUDIO_SETTINGS",
      ],
      intentFilters: [
        {
          action: "VIEW",
          data: {
            scheme: "ivisit",
          },
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-font",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#ffffff",
          image: "./assets/splash.png",
          dark: {
            image: "./assets/splash.png",
            backgroundColor: "#000000",
          },
          enableFullScreenImage_legacy: true,
          resizeMode: "contain",
        },
      ],
      "expo-web-browser",
      "react-native-vision-camera",
      [
        "@stripe/stripe-react-native",
        {
          merchantIdentifier: "merchant.com.ivisit",
        },
      ],
    ],
    updates: {
      fallbackToCacheTimeout: 0,
      enabled: true,
      checkAutomatically: "ON_LOAD",
      url: "https://u.expo.dev/a3777b70-b973-4b3b-ba59-ed32bf5662e0",
    },
    extra: {
      eas: {
        projectId: "a3777b70-b973-4b3b-ba59-ed32bf5662e0",
      },
      googleMapsApiKey: googleMapsWebApiKey,
      googleMapsMapId: googleMapsWebMapId,
      webAppUrl: getWebAppUrl(),
    },
    runtimeVersion: {
      policy: "appVersion",
    },
  };
};
