import { useMedicalProfileFacade } from "../medicalProfile/useMedicalProfileFacade";

// PULLBACK NOTE: Compatibility alias.
// OLD: owned local fetch/save state directly.
// NEW: forwards consumers to the canonical medical-profile facade.

export function useMedicalProfile() {
  return useMedicalProfileFacade();
}

export default useMedicalProfile;
