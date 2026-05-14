// app/runtime/RootProviders.jsx
// PULLBACK NOTE: Pass 1B - Extracted from app/_layout.js
// OLD: RootLayout contained provider nesting
// NEW: RootProviders owns provider order only

import React from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProviders } from "../providers/AppProviders";
import { GlobalLocationProvider } from "../contexts/GlobalLocationContext";
import { useTheme } from "../contexts/ThemeContext";
import GlobalErrorBoundary from "../components/GlobalErrorBoundary";
import ThemeToggle from "../components/ThemeToggle";
import { RootBootstrapEffects } from "./RootBootstrapEffects";
import { getRootSurfaceColor } from "../constants/appSurfaces";

function RootProviderSurface({ children }) {
  const { isDarkMode } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: getRootSurfaceColor(isDarkMode) }}>
      <RootBootstrapEffects />
      {children}
      <ThemeToggle showLabel={false} />
    </View>
  );
}

/**
 * RootProviders - Provider composition + runtime bootstrap host
 *
 * Responsibilities:
 * - Nest providers in correct order
 * - Mount runtime-only bootstrap effects that require the provider graph
 * - No screen logic or route orchestration
 *
 * Provider Order (outside to inside):
 * 1. GestureHandlerRootView (gesture system)
 * 2. GlobalErrorBoundary (error catching)
 * 3. GlobalLocationProvider (location services)
 * 4. AppProviders (auth, theme, toast, etc.)
 * 5. View wrapper (flex: 1)
 * 6. RootBootstrapEffects (global side-effect hosts)
 * 7. Children (the app)
 * 8. ThemeToggle (floating)
 */
export function RootProviders({ children }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GlobalErrorBoundary>
        <GlobalLocationProvider>
          <AppProviders>
            <RootProviderSurface>{children}</RootProviderSurface>
          </AppProviders>
        </GlobalLocationProvider>
      </GlobalErrorBoundary>
    </GestureHandlerRootView>
  );
}
