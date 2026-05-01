import { useVisitsFacade } from "./useVisitsFacade";

// PULLBACK NOTE: Compatibility alias.
// OLD: owned visits fetch/realtime/local CRUD state directly.
// NEW: forwards legacy consumers to the canonical facade.

export function useVisitsData() {
  return useVisitsFacade();
}

export default useVisitsData;
