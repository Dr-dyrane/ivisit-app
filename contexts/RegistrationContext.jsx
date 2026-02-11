// contexts/RegistrationContext

/**
 * Global Registration Flow Context
 * Manages state across all registration steps for iVisit
 * Allows users to navigate back/forth while preserving data
 * Includes error handling and loading states
 */

import { createContext, useContext } from "react";
import { useRegistrationLogic } from "../hooks/auth/useRegistrationLogic";
import { REGISTRATION_STEPS } from "../constants/registrationSteps";

const RegistrationContext = createContext();

export function RegistrationProvider({ children }) {
    const registrationLogic = useRegistrationLogic();

    return (
        <RegistrationContext.Provider value={registrationLogic}>
            {children}
        </RegistrationContext.Provider>
    );
}

// --- Hook to use registration context
export function useRegistration() {
    const context = useContext(RegistrationContext);
    if (!context)
        throw new Error("useRegistration must be used within RegistrationProvider");
    return context;
}

export { REGISTRATION_STEPS };
