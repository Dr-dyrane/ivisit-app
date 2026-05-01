import { atom } from "jotai";

// PULLBACK NOTE: Map route five-layer completion - Layer 5 ephemeral UI atoms.
// Owns: route presentation preferences and transient fallback/error affordances.

export const mapRouteFitModeAtom = atom("auto");
export const mapRouteAutoFitSuppressedAtom = atom(false);
export const mapRouteRetryBannerVisibleAtom = atom(false);
export const mapRouteLastSourceAtom = atom(null);

export default mapRouteFitModeAtom;
