// contexts/VisitsContext.jsx - Visits state management

import { createContext, useContext } from "react";
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
        completeVisit 
    } = useVisitsData();

	// Calculate stats based on visits
	const stats = {
		total: visits.length,
		upcoming: visits.filter(v => v.status === "upcoming").length,
		completed: visits.filter(v => v.status === "completed").length,
		cancelled: visits.filter(v => v.status === "cancelled").length,
		inProgress: visits.filter(v => v.status === "in_progress").length,
	};

	const value = {
		visits,
        isLoading,
		stats,
		addVisit,
		updateVisit,
		cancelVisit,
		completeVisit,
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
