/**
 * Commit Atoms
 *
 * Atomic state for commit details flow (multi-step wizard).
 * Replaces useState in useMapCommitDetailsController.
 */

import { atom } from "jotai";

// =============================================================================
// WIZARD STEP STATE
// =============================================================================

export type CommitWizardStep = "email" | "otp" | "phone" | "details" | "complete";

/**
 * Current step in the commit wizard
 */
export const commitWizardStepAtom = atom<CommitWizardStep>("email");

/**
 * History of steps for back navigation
 */
export const commitStepHistoryAtom = atom<CommitWizardStep[]>([]);

// =============================================================================
// FORM DRAFT STATE
// =============================================================================

export interface CommitDraft {
  email: string;
  phone: string;
  otp: string;
  fullName?: string;
  contactPhone?: string;
}

/**
 * Current form draft data
 */
export const commitDraftAtom = atom<CommitDraft>({
  email: "",
  phone: "",
  otp: "",
});

// =============================================================================
// OTP STATE
// =============================================================================

/**
 * OTP expiration timestamp
 */
export const commitOtpExpiresAtAtom = atom<number | null>(null);

/**
 * Whether OTP is currently being verified
 */
export const commitOtpVerifyingAtom = atom(false);

/**
 * OTP countdown tick for UI updates
 */
export const commitOtpCountdownTickAtom = atom(0);

// =============================================================================
// SUBMISSION STATE
// =============================================================================

/**
 * Whether form is being submitted
 */
export const commitSubmittingAtom = atom(false);

/**
 * Current error message
 */
export const commitErrorMessageAtom = atom("");

/**
 * Current success message
 */
export const commitSuccessMessageAtom = atom("");

// =============================================================================
// DERIVED ATOMS
// =============================================================================

/**
 * Whether email step is complete
 */
export const commitEmailCompleteAtom = atom((get) => {
  const draft = get(commitDraftAtom);
  return draft.email.length > 0 && draft.email.includes("@");
});

/**
 * Whether phone step is complete
 */
export const commitPhoneCompleteAtom = atom((get) => {
  const draft = get(commitDraftAtom);
  return draft.phone.length >= 10;
});

/**
 * Whether OTP step is complete
 */
export const commitOtpCompleteAtom = atom((get) => {
  const draft = get(commitDraftAtom);
  return draft.otp.length >= 4;
});

/**
 * Whether current step is valid and can proceed
 */
export const commitCanProceedAtom = atom((get) => {
  const step = get(commitWizardStepAtom);
  const isSubmitting = get(commitSubmittingAtom);

  if (isSubmitting) return false;

  switch (step) {
    case "email":
      return get(commitEmailCompleteAtom);
    case "otp":
      return get(commitOtpCompleteAtom);
    case "phone":
      return get(commitPhoneCompleteAtom);
    case "details":
      return get(commitEmailCompleteAtom) && get(commitPhoneCompleteAtom);
    default:
      return true;
  }
});

/**
 * Whether wizard can go back
 */
export const commitCanGoBackAtom = atom((get) => {
  const history = get(commitStepHistoryAtom);
  return history.length > 0;
});
