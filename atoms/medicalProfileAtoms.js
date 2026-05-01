import { atom } from "jotai";
import { normalizeMedicalProfile } from "../services/medicalProfileService";

// PULLBACK NOTE: Medical profile five-layer pass - Layer 5 ephemeral UI atoms.
// Owns: editor presentation state and in-progress draft values only.

export const medicalProfileEditorVisibleAtom = atom(false);
export const medicalProfileDraftAtom = atom(normalizeMedicalProfile({}));

export default medicalProfileEditorVisibleAtom;
