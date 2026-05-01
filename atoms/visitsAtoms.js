import { atom } from "jotai";

// PULLBACK NOTE: Visits five-layer pass - Layer 5 ephemeral UI atoms.
// Owns: cross-surface visit history presentation state only.

export const visitHistoryFilterAtom = atom("all");

export default visitHistoryFilterAtom;
