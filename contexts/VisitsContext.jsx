// contexts/VisitsContext.jsx - Visits state management

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { VISITS, VISIT_STATUS, VISIT_FILTERS } from "../data/visits";
import { database, StorageKeys } from "../database";
import { normalizeVisit, normalizeVisitsList } from "../utils/domainNormalize";
import { usePreferences } from "./PreferencesContext";
import { visitsService } from "../services";

// Create the visits context
const VisitsContext = createContext();

/**
 * VisitsProvider - Manages visits state
 */
export function VisitsProvider({ children }) {
  // Core state
  const [visits, setVisits] = useState([]);
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [filter, setFilter] = useState("all"); // "all" | "upcoming" | "completed"
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { preferences } = usePreferences();
  const demoModeEnabled = preferences?.demoModeEnabled !== false;

  const loadVisits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (demoModeEnabled) {
        // DEMO MODE: Load from local storage or seed
        const key = StorageKeys.DEMO_VISITS;
        const stored = await database.read(key, null);
        
        if (Array.isArray(stored) && stored.length > 0) {
            const normalized = normalizeVisitsList(stored);
            setVisits(normalized);
        } else {
            // Seed demo data
            const seeded = normalizeVisitsList(VISITS);
            setVisits(seeded);
            await database.write(key, seeded);
        }
      } else {
        // REAL MODE: Load from Supabase
        // First load from local cache for speed
        const cached = await database.read(StorageKeys.VISITS, []);
        if (Array.isArray(cached) && cached.length > 0) {
             setVisits(normalizeVisitsList(cached));
        }

        // Then fetch from API
        const remoteVisits = await visitsService.list();
        const normalized = normalizeVisitsList(remoteVisits);
        setVisits(normalized);
        // Update cache
        await database.write(StorageKeys.VISITS, normalized);
      }
    } catch (e) {
      console.error("Failed to load visits", e);
      setError(e?.message ?? "Failed to load visits");
    } finally {
      setIsLoading(false);
    }
  }, [demoModeEnabled]);

  // Initial load
  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  // Sync state to local storage (Only for Demo mode or caching)
  // For real mode, we update DB in the actions directly.
  useEffect(() => {
    if (!Array.isArray(visits)) return;
    const normalized = normalizeVisitsList(visits);
    
    if (demoModeEnabled) {
        database.write(StorageKeys.DEMO_VISITS, normalized).catch(() => {});
    } else {
        // We also cache real visits
        database.write(StorageKeys.VISITS, normalized).catch(() => {});
    }
  }, [demoModeEnabled, visits]);

  // Derived state - selected visit object
  const selectedVisit = useMemo(() => {
    if (!visits || visits.length === 0) return null;
    return visits.find(v => v?.id === selectedVisitId) || null;
  }, [visits, selectedVisitId]);

  // Derived state - filtered visits
  const filteredVisits = useMemo(() => {
    if (!visits || visits.length === 0) return [];
    if (!filter || filter === "all") return visits;
    if (filter === "upcoming") {
      return visits.filter(v => 
        v?.status === VISIT_STATUS.UPCOMING || 
        v?.status === VISIT_STATUS.IN_PROGRESS
      );
    }
    if (filter === "completed") {
      return visits.filter(v => 
        v?.status === VISIT_STATUS.COMPLETED || 
        v?.status === VISIT_STATUS.CANCELLED
      );
    }
    if (filter === "cancelled") {
      return visits.filter(v =>
        v?.status === VISIT_STATUS.CANCELLED ||
        v?.status === VISIT_STATUS.NO_SHOW
      );
    }
    return visits;
  }, [visits, filter]);

  // Derived state - counts for badges
  const visitCounts = useMemo(() => {
    if (!visits || visits.length === 0) {
      return { all: 0, upcoming: 0, completed: 0 };
    }
    return {
      all: visits.length,
      upcoming: visits.filter(v => 
        v?.status === VISIT_STATUS.UPCOMING || 
        v?.status === VISIT_STATUS.IN_PROGRESS
      ).length,
      completed: visits.filter(v => 
        v?.status === VISIT_STATUS.COMPLETED || 
        v?.status === VISIT_STATUS.CANCELLED
      ).length,
    };
  }, [visits]);

  // Actions
  const selectVisit = useCallback((visitId) => {
    setSelectedVisitId(visitId);
  }, []);

  const clearSelectedVisit = useCallback(() => {
    setSelectedVisitId(null);
  }, []);

  const setFilterType = useCallback((filterType) => {
    setFilter(filterType);
  }, []);

  // Add a new visit
  const addVisit = useCallback(async (newVisit) => {
    if (!newVisit) return;
    const normalized = normalizeVisit(newVisit);
    if (!normalized) return;

    // Optimistic update
    setVisits(prev => [normalized, ...prev]);

    if (!demoModeEnabled) {
        try {
            const created = await visitsService.create(normalized);
            // Update with server response (e.g. real ID)
            setVisits(prev => prev.map(v => v.id === normalized.id ? created : v));
        } catch (error) {
            console.error("Failed to create visit:", error);
            // Revert on error? Or show toast. For now, keep optimistic but warn.
            setError("Failed to save visit to server");
        }
    }
  }, [demoModeEnabled]);

  // Cancel a visit
  const cancelVisit = useCallback(async (visitId) => {
    if (!visitId) return;
    
    // Optimistic update
    setVisits(prev => prev.map(v => 
        String(v?.id) === String(visitId) 
          ? { ...v, status: VISIT_STATUS.CANCELLED }
          : v
      ));

    if (!demoModeEnabled) {
        try {
            await visitsService.cancel(visitId);
        } catch (error) {
            console.error("Failed to cancel visit:", error);
            setError("Failed to update visit status");
        }
    }
  }, [demoModeEnabled]);

  const completeVisit = useCallback(async (visitId) => {
    if (!visitId) return;

    // Optimistic update
    setVisits(prev => prev.map(v =>
        String(v?.id) === String(visitId)
          ? { ...v, status: VISIT_STATUS.COMPLETED }
          : v
      ));

    if (!demoModeEnabled) {
        try {
            await visitsService.complete(visitId);
        } catch (error) {
            console.error("Failed to complete visit:", error);
            setError("Failed to update visit status");
        }
    }
  }, [demoModeEnabled]);

  // Update visits (for API sync)
  const updateVisits = useCallback((newVisits) => {
    if (!newVisits || !Array.isArray(newVisits)) return;
    setVisits(newVisits);
  }, []);

  const refreshVisits = useCallback(async () => {
      await loadVisits();
  }, [loadVisits]);

  const value = {
    // State
    visits,
    selectedVisit,
    selectedVisitId,
    filteredVisits,
    filter,
    filters: VISIT_FILTERS,
    visitCounts,
    isLoading,
    error,
    
    // Actions
    selectVisit,
    clearSelectedVisit,
    setFilterType,
    addVisit,
    cancelVisit,
    completeVisit,
    updateVisits,
    refreshVisits,
  };

  return (
    <VisitsContext.Provider value={value}>
      {children}
    </VisitsContext.Provider>
  );
}

// Hook for consuming visits context
export function useVisits() {
  const context = useContext(VisitsContext);
  if (!context) {
    throw new Error("useVisits must be used within a VisitsProvider");
  }
  return context;
}

export default VisitsContext;
