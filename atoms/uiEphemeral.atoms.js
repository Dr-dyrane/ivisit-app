import { atom } from "jotai";

/**
 * UI Ephemeral Atoms
 *
 * Pass 6 (sweep-local-state) — useState that must survive remount.
 * Screens: InsuranceScreen, MedicalProfileScreen, HelpSupportScreen.
 *
 * Rule: reset at the point of intent to discard (submit/cancel), NOT on mount.
 */

// =============================================================================
// INSURANCE SCREEN — add-policy wizard
// =============================================================================

// PULLBACK NOTE: Pass 6 — OLD: useState(false) — modal dismissed on remount mid-fill
// NEW: Jotai atom — survives remount so in-progress add flow is not silently lost
export const insuranceShowAddModalAtom = atom(false);

// PULLBACK NOTE: Pass 6 — OLD: useState(0) — wizard step lost on remount
// NEW: Jotai atom — step position survives background/remount
export const insuranceWizardStepAtom = atom(0);

// PULLBACK NOTE: Pass 6 — OLD: useState({...}) — all typed field values lost on remount
// NEW: Jotai atom — form draft survives background (e.g. user switches app during camera scan)
export const INSURANCE_FORM_DEFAULT = {
  provider_name: "",
  policy_number: "",
  group_number: "",
  policy_holder_name: "",
  front_image_url: "",
  back_image_url: "",
};
export const insuranceFormDataAtom = atom({ ...INSURANCE_FORM_DEFAULT });

// PULLBACK NOTE: Insurance coverage pass — OLD: useState(null) — edit target was lost on remount
// NEW: Jotai atom — add/edit wizard keeps the correct identity when the route remounts mid-flow
export const insuranceEditingIdAtom = atom(null);

// =============================================================================
// MEDICAL PROFILE SCREEN — unsaved profile edits
// =============================================================================

// PULLBACK NOTE: Pass 6 — OLD: useState({}) — all in-progress edits lost on remount
// NEW: Jotai atom — draft survives background so FAB save button stays correct
export const medicalProfileLocalAtom = atom({});

// PULLBACK NOTE: Pass 6 — OLD: useState(false) — dirty flag lost on remount, FAB vanishes
// NEW: Jotai atom — dirty state persists across remount so save affordance stays visible
export const medicalProfileHasChangesAtom = atom(false);

// =============================================================================
// HELP & SUPPORT SCREEN — ticket draft
// =============================================================================

// PULLBACK NOTE: Pass 6 — OLD: useState("") — subject text lost on nav away
// NEW: Jotai atom — draft survives navigation
export const helpSupportSubjectAtom = atom("");

// PULLBACK NOTE: Pass 6 — OLD: useState("") — message text lost on nav away
// NEW: Jotai atom — draft survives navigation
export const helpSupportMessageAtom = atom("");
