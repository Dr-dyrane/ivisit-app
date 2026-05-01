import { atom } from "jotai";

// PULLBACK NOTE: Help Support Layer 5.
// Owns: composer visibility, draft text, and expand-collapse UI only.

export const helpSupportComposeVisibleAtom = atom(false);
export const helpSupportSubjectAtom = atom("");
export const helpSupportMessageAtom = atom("");
export const helpSupportExpandedFaqIdsAtom = atom([]);
export const helpSupportExpandedTicketIdsAtom = atom([]);

export const helpSupportCanSubmitAtom = atom((get) => {
  const subject = get(helpSupportSubjectAtom);
  const message = get(helpSupportMessageAtom);
  return subject.trim().length > 0 && message.trim().length > 0;
});
