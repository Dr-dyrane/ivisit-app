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
  const googleMapsWebApiKey =
    cleanEnvValue(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) ||
    cleanEnvValue(process.env.GOOGLE_MAPS_API_KEY);
  const googleMapsWebMapId =
    cleanEnvValue(process.env.EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID) ||
    cleanEnvValue(process.env.EXPO_PUBLIC_GOOGLE_MAP_ID) ||
    cleanEnvValue(process.env.GOOGLE_MAPS_MAP_ID);
  const googleMapsAndroidApiKey =
    cleanEnvValue(process.env.GOOGLE_MAPS_ANDROID_API_KEY) ?? googleMapsWebApiKey;
  const mapboxAccessToken =
    cleanEnvValue(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN) ||
    cleanEnvValue(process.env.MAPBOX_ACCESS_TOKEN);

  return {
    ...config,
    name: "iVisit",
    slug: "ivisit",
    scheme: "ivisit",
    // 1.0.8 is the current runtime (bumped 2026-07-15: marker fix is BUILD-ONLY; see ANDROID_MARKER_DENSITY_AUDIT). IVISIT_RUNTIME_OVERRIDE lets `eas update` publish
    // the same bundle to an OLDER runtime too (e.g. 1.0.6) so existing installs keep
    // getting OTAs in parallel -- see scripts/ota-publish-dual.js. Builds never set it.
    version: process.env.IVISIT_RUNTIME_OVERRIDE || "1.0.8",
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
      usesAppleSignIn: true,
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
        LSApplicationQueriesSchemes: ["ivisit", "uber", "maps", "comgooglemaps"],
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
      "expo-apple-authentication",
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
      // PULLBACK NOTE: APP-REVIEW-PASSKIT-2026-06-17
      // OLD: configured a Stripe merchantIdentifier, which enabled Apple Pay/PassKit without a visible Apple Pay surface.
      // NEW: keep Stripe card support but do not declare Apple Pay until an Apple Pay UI is reviewed and shipped.
      ["@stripe/stripe-react-native", {}],
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
      EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: mapboxAccessToken,
      MAPBOX_ACCESS_TOKEN: mapboxAccessToken,
      webAppUrl: getWebAppUrl(),
    },
    runtimeVersion: {
      policy: "appVersion",
    },
  };
};
