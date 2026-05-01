// app/runtime/RootRuntimeGate.jsx
import React, { useState, useEffect } from "react";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { appMigrationsService } from "../services/appMigrationsService";
// PULLBACK NOTE: Phase 6a — hydrate modeStore on startup before app renders
// OLD: mode was hydrated inside EmergencyContext on mount (deferred, race-prone)
// NEW: hydrateModeStore() runs in prepare() — deterministic, before first render
import { hydrateModeStore } from "../stores/modeStore";
// PULLBACK NOTE: Phase 6b — hydrate coverageStore + locationStore on startup
// OLD: coverageMode/userLocation hydrated inside EmergencyContext useEffect (deferred, race-prone)
// NEW: both run in prepare() — deterministic, before first render
import { hydrateCoverageStore } from "../stores/coverageStore";
import { hydrateEmergencyContactsStore } from "../stores/emergencyContactsStore";
import { hydrateLocationStore } from "../stores/locationStore";
import { hydrateNotificationsStore } from "../stores/notificationsStore";
import { hydrateVisitsStore } from "../stores/visitsStore";
import { hydrateMedicalProfileStore } from "../stores/medicalProfileStore";

// Global guard to ensure splash prevention only runs once across re-mounts
let isSplashPrevented = false;

/**
 * RootRuntimeGate
 *
 * Handles startup readiness before the app renders:
 * - Splash screen management
 * - Database migrations
 * - Schema reload
 * - Core persisted-store hydration before first paint
 */
export function RootRuntimeGate({ children }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function prepare() {
      try {
        if (!isSplashPrevented) {
          await SplashScreen.preventAutoHideAsync().catch((e) => {
            console.warn("[RootRuntimeGate] SplashScreen error:", e.message);
          });
          isSplashPrevented = true;
        }

        // Run migrations and schema reload on startup
        await appMigrationsService.run();

        // Phase 6a/6b — hydrate Zustand stores before first render
        await Promise.all([
          hydrateModeStore(),
          hydrateCoverageStore(),
          hydrateEmergencyContactsStore(),
          hydrateNotificationsStore(),
          hydrateVisitsStore(),
          hydrateMedicalProfileStore(),
          hydrateLocationStore(),
        ]);

        if (isMounted) setIsReady(true);
      } catch (err) {
        console.warn("[RootRuntimeGate] Prepare exception:", err);
        if (isMounted) setIsReady(true);
      }
    }

    prepare();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isReady) {
      const timer = setTimeout(() => {
        SplashScreen.hideAsync().catch((err) => {
          console.warn("[RootRuntimeGate] hideAsync error:", err.message);
        });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  // Render children only when ready
  return <View style={{ flex: 1 }}>{isReady ? children : null}</View>;
}
