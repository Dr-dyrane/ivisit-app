import { atom } from "jotai";

// PULLBACK NOTE: Help Support Layer 5.
// Owns: composer visibility, drafts, expand-collapse UI, and local Ask iVisit
// query/feedback state. Ask feedback deliberately has no server receiver.

export const helpSupportComposeVisibleAtom = atom(false);
export const helpSupportSubjectAtom = atom("");
export const helpSupportMessageAtom = atom("");
export const helpSupportExpandedFaqIdsAtom = atom([]);
export const helpSupportExpandedTicketIdsAtom = atom([]);
export const helpSupportAskQueryAtom = atom("");
export const helpSupportAskSubmittedQueryAtom = atom("");
export const helpSupportAskFeedbackByProposalAtom = atom({});

export const helpSupportCanSubmitAtom = atom((get) => {
  const subject = get(helpSupportSubjectAtom);
  const message = get(helpSupportMessageAtom);
  return subject.trim().length > 0 && message.trim().length > 0;
});
