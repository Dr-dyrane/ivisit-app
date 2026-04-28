// contexts/VisitsContext.jsx - Visits state management
//
// PULLBACK NOTE: Pass 12 F5 - removed list-screen-only UI state from shared provider
// OLD: exposed filter, filters, filteredVisits, visitCounts, selectedVisitId, selectVisit, setFilterType
// NEW: shared provider owns only canonical collection + lifecycle CRUD (per VISITS_REQUEST_HISTORY_PLAN �10)
//
// Rationale: legacy VisitsScreen (demoted to bridge in F4a) was the only consumer of list-UI state.
// /map consumers (MapRecentVisitsModal, MapVisitDetailsModal) read canonical `visits` and derive
// grouped/filtered views through pure selectors in hooks/visits/useVisitHistorySelectors.js.

import { createContext, useContext, useMemo } from "react";
import { VISIT_STATUS } from "../constants/visits";
import { useVisitsData } from "../hooks/visits/useVisitsData";

const VisitsContext = createContext();

export function VisitsProvider({ children }) {
const {
visits,
isLoading,
addVisit,
updateVisit,
cancelVisit,
completeVisit,
deleteVisit,
refetch: refreshVisits,
} = useVisitsData();

// Lifetime stats stay in the provider because they are cross-consumer truth.
// Per-filter list UI counts were removed; consumers derive those locally when needed.
const stats = useMemo(
() => ({
total: visits.length,
// PULLBACK NOTE: Pass 1 raw-status sweep — OLD: inline strings  NEW: VISIT_STATUS constants
upcoming: visits.filter((v) => v.status === VISIT_STATUS.UPCOMING).length,
completed: visits.filter((v) => v.status === VISIT_STATUS.COMPLETED).length,
cancelled: visits.filter((v) => v.status === VISIT_STATUS.CANCELLED).length,
inProgress: visits.filter((v) => v.status === VISIT_STATUS.IN_PROGRESS).length,
}),
[visits],
);

const value = {
visits,
isLoading,
stats,
addVisit,
updateVisit,
cancelVisit,
completeVisit,
deleteVisit,
refreshVisits,
};

return (
<VisitsContext.Provider value={value}>{children}</VisitsContext.Provider>
);
}

export function useVisits() {
const context = useContext(VisitsContext);
if (context === undefined) {
throw new Error("useVisits must be used within a VisitsProvider");
}
return context;
}

export default VisitsContext;