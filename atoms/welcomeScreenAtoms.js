/**
 * welcomeScreenAtoms.js
 *
 * L5 Jotai atoms for ephemeral UI state owned by the Welcome screen.
 *
 * Architecture note:
 * - isOpeningEmergencyAtom: controls the primary CTA label + disabled state
 *   during the brief navigation transition to the map. Named terminal values
 *   (false → true) make this a machine-like state → Jotai (L5), not useState.
 *   Survives remount if the router keeps WelcomeScreen mounted during transition.
 */

import { atom } from "jotai";

export const isOpeningEmergencyAtom = atom(false);
