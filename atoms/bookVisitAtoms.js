import { atom } from "jotai";

// PULLBACK NOTE: Book Visit Layer 5.
// Owns: ephemeral modal/search/provider UI state only.
// Does NOT own: persisted booking draft or submission legality.

export const bookVisitSpecialtySearchVisibleAtom = atom(false);
export const bookVisitSearchQueryAtom = atom("");
export const bookVisitProviderModalVisibleAtom = atom(false);
export const bookVisitSelectedProviderAtom = atom(null);
