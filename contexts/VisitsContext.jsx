import { createContext, useContext } from "react";
import { useVisitsFacade } from "../hooks/visits/useVisitsFacade";

// PULLBACK NOTE: VisitsContext is now a thin compatibility boundary.
// Owns: provider requirement for legacy consumers across map, booking, search,
// and notifications.
// Does NOT own: query orchestration, realtime, or local collection state.

const VisitsContext = createContext(undefined);

export function VisitsProvider({ children }) {
  const value = useVisitsFacade();
  return (
    <VisitsContext.Provider value={value}>{children}</VisitsContext.Provider>
  );
}

export function VisitsBoundary({ children }) {
  const context = useContext(VisitsContext);
  if (context !== undefined) return children;
  return <VisitsProvider>{children}</VisitsProvider>;
}

export function useVisits() {
  const context = useContext(VisitsContext);
  if (context === undefined) {
    throw new Error("useVisits must be used within a VisitsProvider");
  }
  return context;
}

export default VisitsContext;
