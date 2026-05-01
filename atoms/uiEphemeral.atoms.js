import { atom } from "jotai";

/**
 * UI Ephemeral Atoms
 *
 * Remount-safe UI state that still belongs to a screen feature and should
 * persist across route remounts until the user completes or discards the flow.
 */

// =============================================================================
// INSURANCE SCREEN - add-policy wizard
// =============================================================================

export const insuranceShowAddModalAtom = atom(false);
export const insuranceWizardStepAtom = atom(0);

export const INSURANCE_FORM_DEFAULT = {
  provider_name: "",
  policy_number: "",
  group_number: "",
  policy_holder_name: "",
  front_image_url: "",
  back_image_url: "",
};

export const insuranceFormDataAtom = atom({ ...INSURANCE_FORM_DEFAULT });
export const insuranceEditingIdAtom = atom(null);

// =============================================================================
// MEDICAL PROFILE SCREEN - unsaved profile edits
// =============================================================================

export const medicalProfileLocalAtom = atom({});
export const medicalProfileHasChangesAtom = atom(false);
