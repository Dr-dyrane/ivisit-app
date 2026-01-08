// contexts/VisitsContext.jsx - Visits state management

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { VISITS, VISIT_STATUS, VISIT_FILTERS } from "../data/visits";

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
  const [visits, setVisits] = useState(VISITS);
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [filter, setFilter] = useState("all"); // "all" | "upcoming" | "completed"
  
  // Loading state for future API integration
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
      if (!prev) return [{ ...newVisit, id: String(Date.now()) }];
      return [{ ...newVisit, id: String(Date.now()) }, ...prev];
    });
  }, []);

  // Cancel a visit
  const cancelVisit = useCallback((visitId) => {
    if (!visitId) return;
    setVisits(prev => {
      if (!prev || prev.length === 0) return prev;
      return prev.map(v => 
        v?.id === visitId 
          ? { ...v, status: VISIT_STATUS.CANCELLED }
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setVisits(VISITS);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

