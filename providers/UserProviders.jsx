import React from "react";
import { TabBarVisibilityProvider } from "../contexts/TabBarVisibilityContext";
import { HeaderStateProvider } from "../contexts/HeaderStateContext";
import { FABProvider } from "../contexts/FABContext";
import { VisitsBoundary } from "../contexts/VisitsContext";
import { EmergencyUIProvider } from "../contexts/EmergencyUIContext";

/**
 * UserProviders
 *
 * File Path: providers/UserProviders.jsx
 *
 * Wraps the user stack with necessary context providers.
 */
export const UserProviders = ({ children }) => {
  return (
    <TabBarVisibilityProvider>
      <HeaderStateProvider>
        <FABProvider>
          <VisitsBoundary>
            <EmergencyUIProvider>{children}</EmergencyUIProvider>
          </VisitsBoundary>
        </FABProvider>
      </HeaderStateProvider>
    </TabBarVisibilityProvider>
  );
};
