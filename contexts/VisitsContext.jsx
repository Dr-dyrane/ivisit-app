// contexts/VisitsContext.jsx - Visits state management

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { VISITS, VISIT_STATUS, VISIT_FILTERS } from "../data/visits";
import { database, StorageKeys } from "../database";
import { normalizeVisit, normalizeVisitsList } from "../utils/domainNormalize";
import { usePreferences } from "./PreferencesContext";

// Create the visits context
const VisitsContext = createContext();

/**
 * VisitsProvider - Manages visits state
 * 
 * Following EmergencyContext pattern:
 * - Centralized state management
 * - Filter/selection logic
 * - Actions for UI interactions
 */
export function VisitsProvider({ children }) {
  // Core state
  const [visits, setVisits] = useState([]);
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [filter, setFilter] = useState("all"); // "all" | "upcoming" | "completed"
  
  // Loading state for future API integration
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { preferences } = usePreferences();
  const demoModeEnabled = preferences?.demoModeEnabled !== false;

  useEffect(() => {
    let isActive = true;
    (async () => {
      setIsLoading(true);
      try {
        const key = demoModeEnabled ? StorageKeys.DEMO_VISITS : StorageKeys.VISITS;
        const stored = await database.read(key, null);
        if (!isActive) return;
        if (Array.isArray(stored)) {
          const normalized = normalizeVisitsList(stored);
          setVisits(normalized);
          if (normalized.length !== stored.length) await database.write(key, normalized);
          if (demoModeEnabled && normalized.length === 0) {
            const seeded = normalizeVisitsList(VISITS);
            setVisits(seeded);
            await database.write(key, seeded);
          }
          return;
        }
        if (demoModeEnabled) {
          const seeded = normalizeVisitsList(VISITS);
          setVisits(seeded);
          await database.write(key, seeded);
        } else {
          setVisits([]);
          await database.write(key, []);
        }
      } catch (e) {
        if (!isActive) return;
        setVisits(demoModeEnabled ? normalizeVisitsList(VISITS) : []);
        setError(e?.message ?? "Failed to load visits");
      } finally {
        if (isActive) setIsLoading(false);
      }
    })();
    return () => {
      isActive = false;
    };
  }, [demoModeEnabled]);

  useEffect(() => {
    if (!Array.isArray(visits)) return;
    const normalized = normalizeVisitsList(visits);
    const key = demoModeEnabled ? StorageKeys.DEMO_VISITS : StorageKeys.VISITS;
    database.write(key, normalized).catch(() => {});
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

  // Add a new visit (for booking flow)
  const addVisit = useCallback((newVisit) => {
    if (!newVisit) return;
    setVisits(prev => {
      const normalized = normalizeVisit(newVisit) ?? null;
      if (!normalized) return Array.isArray(prev) ? prev : [];
      const id = String(normalized.id);
      const list = Array.isArray(prev) ? prev.filter(v => v && typeof v === "object") : [];
      const rest = list.filter(v => String(v?.id ?? "") !== id);
      return [normalized, ...rest];
    });
  }, []);

  // Cancel a visit
  const cancelVisit = useCallback((visitId) => {
    if (!visitId) return;
    const id = String(visitId);
    setVisits(prev => {
      if (!prev || prev.length === 0) return prev;
      return prev.map(v => 
        String(v?.id ?? "") === id 
          ? { ...v, status: VISIT_STATUS.CANCELLED }
          : v
      );
    });
  }, []);

  const completeVisit = useCallback((visitId) => {
    if (!visitId) return;
    const id = String(visitId);
    setVisits(prev => {
      if (!prev || prev.length === 0) return prev;
      return prev.map(v =>
        String(v?.id ?? "") === id
          ? { ...v, status: VISIT_STATUS.COMPLETED }
          : v
      );
    });
  }, []);

  // Update visits (for API sync)
  const updateVisits = useCallback((newVisits) => {
    if (!newVisits || !Array.isArray(newVisits)) return;
    setVisits(newVisits);
  }, []);

  // Refresh visits (mock - for pull-to-refresh)
  const refreshVisits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const key = demoModeEnabled ? StorageKeys.DEMO_VISITS : StorageKeys.VISITS;
      const stored = await database.read(key, []);
      const normalized = normalizeVisitsList(stored);
      if (demoModeEnabled && normalized.length === 0) {
        const seeded = normalizeVisitsList(VISITS);
        setVisits(seeded);
        await database.write(key, seeded);
        return;
      }
      setVisits(normalized);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [demoModeEnabled]);

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
