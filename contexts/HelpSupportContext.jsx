import { createContext, useContext } from "react";
import { useHelpSupportFacade } from "../hooks/support/useHelpSupportFacade";

// PULLBACK NOTE: HelpSupportContext is now a thin route boundary.
// Owns: compatibility provider requirement for the help-support stack and any legacy consumers.
// Does NOT own: direct fetches, local mock shaping, or route-level UI orchestration.

const HelpSupportContext = createContext(undefined);

export function HelpSupportProvider({ children }) {
  const value = useHelpSupportFacade();
  return (
    <HelpSupportContext.Provider value={value}>
      {children}
    </HelpSupportContext.Provider>
  );
}

export function HelpSupportBoundary({ children }) {
  const context = useContext(HelpSupportContext);
  if (context !== undefined) return children;
  return <HelpSupportProvider>{children}</HelpSupportProvider>;
}

export function useHelpSupport() {
  const context = useContext(HelpSupportContext);
  if (context === undefined) {
    throw new Error("useHelpSupport must be used within a HelpSupportProvider");
  }
  return context;
}

export default HelpSupportContext;
