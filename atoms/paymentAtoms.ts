/**
 * Payment Atoms
 *
 * Atomic state for payment flow management.
 * Replaces useState in useMapCommitPaymentController.
 */

import { atom } from "jotai";

// =============================================================================
// PAYMENT METHOD STATE
// =============================================================================

/**
 * Currently selected payment method ID
 */
export const selectedPaymentMethodIdAtom = atom<string | null>(null);

/**
 * Available payment methods from the server
 */
export const availablePaymentMethodsAtom = atom<any[]>([]);

/**
 * Whether payment methods are being refreshed
 */
export const isRefreshingPaymentMethodsAtom = atom(false);

/**
 * Whether payment methods snapshot is ready for display
 */
export const paymentMethodsReadyAtom = atom(false);

/**
 * Payment methods refresh key (forces re-fetch)
 */
export const paymentMethodsRefreshKeyAtom = atom(0);

// =============================================================================
// COST ESTIMATION STATE
// =============================================================================

/**
 * Estimated cost for the service
 */
export interface EstimatedCost {
  totalCost?: number;
  total_cost?: number;
  baseCost?: number;
  distanceCost?: number;
  currency?: string;
  breakdown?: any;
}

export const estimatedCostAtom = atom<EstimatedCost | null>(null);

/**
 * Whether cost is being calculated
 */
export const isLoadingCostAtom = atom(false);

/**
 * Raw total cost value for calculations
 */
export const totalCostValueAtom = atom((get) => {
  const estimatedCost = get(estimatedCostAtom);
  return estimatedCost?.totalCost ?? estimatedCost?.total_cost ?? null;
});

/**
 * Formatted total cost label for display
 */
export const totalCostLabelAtom = atom((get) => {
  const totalCostValue = get(totalCostValueAtom);
  return Number.isFinite(totalCostValue)
    ? `$${Number(totalCostValue).toFixed(2)}`
    : null;
});

// =============================================================================
// TRANSACTION/SUBMISSION STATE
// =============================================================================

export type SubmissionStateKind =
  | "idle"
  | "submitting"
  | "processing"
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "dismissed";

export interface SubmissionState {
  kind: SubmissionStateKind;
  display: string;
  dismissible: boolean;
  meta?: Record<string, any>;
}

/**
 * Current payment submission transaction state
 */
export const paymentSubmissionStateAtom = atom<SubmissionState>({
  kind: "idle",
  display: "",
  dismissible: true,
});

/**
 * Whether payment is currently being submitted
 */
export const isSubmittingPaymentAtom = atom(false);

/**
 * Current submission error message
 */
export const paymentErrorMessageAtom = atom("");

/**
 * Current submission info message
 */
export const paymentInfoMessageAtom = atom("");

// =============================================================================
// DEMO MODE STATE
// =============================================================================

/**
 * Whether demo cash-only mode is active
 */
export const demoCashOnlyAtom = atom(false);

/**
 * Whether auto-approval timeout is pending
 */
export const demoAutoApprovalPendingAtom = atom(false);

// =============================================================================
// DERIVED ATOMS
// =============================================================================

/**
 * Whether a valid payment method is selected
 */
export const hasValidPaymentMethodAtom = atom((get) => {
  const selectedId = get(selectedPaymentMethodIdAtom);
  const methods = get(availablePaymentMethodsAtom);
  const selectedMethod = methods.find((m) => m.id === selectedId);
  return !!selectedMethod && selectedMethod.enabled !== false;
});

/**
 * Selected payment method object
 */
export const selectedPaymentMethodAtom = atom((get) => {
  const selectedId = get(selectedPaymentMethodIdAtom);
  const methods = get(availablePaymentMethodsAtom);
  return methods.find((m) => m.id === selectedId) || null;
});

/**
 * Whether payment can be submitted
 */
export const canSubmitPaymentAtom = atom((get) => {
  const hasMethod = get(hasValidPaymentMethodAtom);
  const isSubmitting = get(isSubmittingPaymentAtom);
  const submissionState = get(paymentSubmissionStateAtom);
  const estimatedCost = get(estimatedCostAtom);

  return (
    hasMethod &&
    !isSubmitting &&
    submissionState.kind === "idle" &&
    !!estimatedCost
  );
});

/**
 * Whether payment flow is in a terminal state (completed/failed)
 */
export const isPaymentTerminalStateAtom = atom((get) => {
  const state = get(paymentSubmissionStateAtom);
  return state.kind === "completed" || state.kind === "failed";
});
