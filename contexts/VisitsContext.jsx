// contexts/VisitsContext.jsx - Visits state management

import { createContext, useContext, useState, useMemo, useCallback } from "react";
import { useVisitsData } from "../hooks/visits/useVisitsData";

// Create the visits context
const VisitsContext = createContext();

// Visits provider component
export function VisitsProvider({ children }) {
    const { 
        visits, 
        isLoading, 
        addVisit, 
        updateVisit, 
        cancelVisit, 
        completeVisit,
        deleteVisit,
        refetch: refreshVisits
    } = useVisitsData();

    const [filter, setFilter] = useState("all");
    const [selectedVisitId, setSelectedVisitId] = useState(null);

	// Calculate stats based on visits
	const stats = useMemo(() => ({
		total: visits.length,
		upcoming: visits.filter(v => v.status === "upcoming").length,
		completed: visits.filter(v => v.status === "completed").length,
		cancelled: visits.filter(v => v.status === "cancelled").length,
		inProgress: visits.filter(v => v.status === "in_progress").length,
	}), [visits]);

    // Available filters
    const filters = useMemo(() => [
        { id: "all", label: "All", icon: "apps" },
        { id: "upcoming", label: "Upcoming", icon: "calendar" },
        { id: "completed", label: "Completed", icon: "checkmark-done" },
        { id: "cancelled", label: "Cancelled", icon: "close" },
    ], []);

    // Filtered visits based on current filter
    const filteredVisits = useMemo(() => {
        if (!Array.isArray(visits)) return [];
        
        switch (filter) {
            case "upcoming":
                return visits.filter(v => v.status === "upcoming");
            case "completed":
                return visits.filter(v => v.status === "completed");
            case "cancelled":
                return visits.filter(v => v.status === "cancelled");
            default:
                return visits;
        }
    }, [visits, filter]);

    // Visit counts per filter
    const visitCounts = useMemo(() => ({
        all: visits.length,
        upcoming: stats.upcoming,
        completed: stats.completed,
        cancelled: stats.cancelled,
    }), [visits.length, stats.upcoming, stats.completed, stats.cancelled]);

    const selectVisit = useCallback((visitId) => {
        setSelectedVisitId(visitId);
    }, []);

    const setFilterType = useCallback((filterType) => {
        setFilter(filterType);
        setSelectedVisitId(null);
    }, []);

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
        // New properties for VisitsScreen
        filteredVisits,
        filter,
        filters,
        visitCounts,
        selectedVisitId,
        selectVisit,
        setFilterType,
	};

	return (
		<VisitsContext.Provider value={value}>{children}</VisitsContext.Provider>
	);
}

// Custom hook to use the visits context
export function useVisits() {
	const context = useContext(VisitsContext);
	if (context === undefined) {
		throw new Error("useVisits must be used within a VisitsProvider");
	}
	return context;
}

export default VisitsContext;
