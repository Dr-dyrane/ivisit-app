// app/runtime/RootProviders.jsx
// PULLBACK NOTE: Pass 1B - Extracted from app/_layout.js
// OLD: RootLayout contained provider nesting
// NEW: RootProviders owns provider order only

import React from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProviders } from "../providers/AppProviders";
import { GlobalLocationProvider } from "../contexts/GlobalLocationContext";
import GlobalErrorBoundary from "../components/GlobalErrorBoundary";
import ThemeToggle from "../components/ThemeToggle";
import { RootBootstrapEffects } from "./RootBootstrapEffects";

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
            <View style={{ flex: 1 }}>
              <RootBootstrapEffects />
              {children}
              <ThemeToggle showLabel={false} />
            </View>
          </AppProviders>
        </GlobalLocationProvider>
      </GlobalErrorBoundary>
    </GestureHandlerRootView>
  );
}
