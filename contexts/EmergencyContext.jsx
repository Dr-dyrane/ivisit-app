import { createContext, useContext } from "react";
import { useEmergencyLogic } from "../hooks/emergency/useEmergencyLogic";
import { EmergencyMode } from "../constants/emergency";

// Emergency Context
const EmergencyContext = createContext();

export { EmergencyMode };

export function EmergencyProvider({ children }) {
	const value = useEmergencyLogic();

	return (
		<EmergencyContext.Provider value={value}>
			{children}
		</EmergencyContext.Provider>
	);
}

export function useEmergency() {
	const context = useContext(EmergencyContext);
	if (context === undefined) throw new Error("useEmergency must be used within an EmergencyProvider");
	return context;
}
