import { atom } from "jotai";

// PULLBACK NOTE: Contact Dispatch CD-5 - Layer 5 (Jotai UI state)
// Owns: modal visibility, active request id, quick actions, composer focus, scroll intent.
// Does NOT own: canonical messages, participants, room data, or fetch lifecycle.

export const emergencyChatModalVisibleAtom = atom(false);
export const activeEmergencyChatRequestIdAtom = atom(null);
export const emergencyChatQuickActionsVisibleAtom = atom(true);
export const emergencyChatComposerFocusedAtom = atom(false);
export const emergencyChatScrollIntentAtom = atom(null);

// Derived atom for modal readiness (visible AND has request id)
export const emergencyChatModalReadyAtom = atom((get) => {
  const visible = get(emergencyChatModalVisibleAtom);
  const requestId = get(activeEmergencyChatRequestIdAtom);
  return visible && Boolean(requestId);
});

export default emergencyChatModalVisibleAtom;
