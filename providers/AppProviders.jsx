import React from "react";
import { AuthProvider } from "../contexts/AuthContext";
import { OTAUpdatesProvider } from "../contexts/OTAUpdatesContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { PreferencesProvider } from "../contexts/PreferencesContext";
import { UnifiedScrollProvider } from "../contexts/UnifiedScrollContext";
import { TabBarVisibilityProvider } from "../contexts/TabBarVisibilityContext";
import { ScrollAwareHeaderProvider } from "../contexts/ScrollAwareHeaderContext";
import { HeaderStateProvider } from "../contexts/HeaderStateContext";
import { EmergencyProvider } from "../contexts/EmergencyContext";
import { EmergencyUIProvider } from "../contexts/EmergencyUIContext";
import { NotificationsProvider } from "../contexts/NotificationsContext";
import { VisitsProvider } from "../contexts/VisitsContext";
import { SearchProvider } from "../contexts/SearchContext";
import ToastProvider from "../contexts/ToastContext";
import { FABProvider } from "../contexts/FABContext";
import { StripeProvider } from "@stripe/stripe-react-native";
import { Provider as JotaiProvider } from "jotai";
import { QueryProvider } from "./QueryProvider";

/**
 * AppProviders
 *
 * File Path: providers/AppProviders.jsx
 *
 * Wraps the application with all necessary context providers.
 * Order matters:
 * 1. AuthProvider (Top level state)
 * 2. QueryProvider (TanStack Query client)
 * 3. JotaiProvider (Jotai atom store)
 * 4. OTAUpdatesProvider (Shared update state)
 * 5. ThemeProvider (UI Theming)
 * 6. UnifiedScrollProvider (Synchronized scroll animations)
 * 7. Feature Providers (TabBar, Headers, Search, Emergency, EmergencyUI, FAB, Toast)
 */
export const AppProviders = ({ children }) => {
  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.ivisit" // Required for Apple Pay
    >
      <AuthProvider>
        <QueryProvider>
          <JotaiProvider>
            <OTAUpdatesProvider>
              <ThemeProvider>
                <PreferencesProvider>
                  <ToastProvider>
                    <UnifiedScrollProvider>
                      <TabBarVisibilityProvider>
                        <ScrollAwareHeaderProvider>
                          <HeaderStateProvider>
                            <NotificationsProvider>
                              <VisitsProvider>
                                <SearchProvider>
                                  <EmergencyProvider>
                                    <EmergencyUIProvider>
                                      <FABProvider>{children}</FABProvider>
                                    </EmergencyUIProvider>
                                  </EmergencyProvider>
                                </SearchProvider>
                              </VisitsProvider>
                            </NotificationsProvider>
                          </HeaderStateProvider>
                        </ScrollAwareHeaderProvider>
                      </TabBarVisibilityProvider>
                    </UnifiedScrollProvider>
                  </ToastProvider>
                </PreferencesProvider>
              </ThemeProvider>
            </OTAUpdatesProvider>
          </JotaiProvider>
        </QueryProvider>
      </AuthProvider>
    </StripeProvider>
  );
};
