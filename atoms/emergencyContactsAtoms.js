import { atom } from "jotai";
import { isValidName, isValidPhone } from "../utils/validation";

// PULLBACK NOTE: EmergencyContacts five-layer pass - Layer 5 (Jotai UI state)
// Owns: editor visibility/mode, draft, wizard step, selection, and save-pending state.
// Does NOT own: canonical contact records, fetch lifecycle, or migration legality.

export const createEmergencyContactDraft = () => ({
  name: "",
  relationship: "",
  phone: "",
});

export const emergencyContactsEditorVisibleAtom = atom(false);
export const emergencyContactsEditorModeAtom = atom("create");
export const emergencyContactsEditingIdAtom = atom(null);
export const emergencyContactsDraftAtom = atom(createEmergencyContactDraft());
export const emergencyContactsWizardStepAtom = atom(0);
export const emergencyContactsSelectedIdsAtom = atom([]);
export const emergencyContactsSavingAtom = atom(false);

export const emergencyContactsSelectionCountAtom = atom(
  (get) => get(emergencyContactsSelectedIdsAtom).length,
);

// Derived validation stays in atoms so the editor UI can react without duplicating field rules in components.
export const emergencyContactsCanSaveAtom = atom((get) => {
  const draft = get(emergencyContactsDraftAtom);
  return isValidName(draft?.name) && isValidPhone(draft?.phone);
});
