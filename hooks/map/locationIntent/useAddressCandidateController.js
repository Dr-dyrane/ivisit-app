import { useCallback, useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { locationCandidateAtom, locationSaveFlowAtom } from "../../../atoms/locationIntentAtoms";
import { normalizeAddressCandidate, mapCandidateToPickupPayload } from "../../../services/locationAddressService";

// PULLBACK NOTE: [LS-1] // OLD: selectedLocation useState in MapLocationIntentStageBase
// NEW: Jotai atom-backed candidate owned by this controller hook

export default function useAddressCandidateController({
	manualDraft = {},
	locationControl = null,
} = {}) {
	const [candidate, setCandidate] = useAtom(locationCandidateAtom);
	const saveFlow = useAtomValue(locationSaveFlowAtom);
	const pendingPlaceLabel = saveFlow?.pendingPlaceLabel || null;

	const buildCandidate = useCallback(
		(payload) =>
			normalizeAddressCandidate(
				{
					...payload,
					unit: payload?.unit || manualDraft.unit || undefined,
					responderNote:
						payload?.responderNote || manualDraft.responderNote || undefined,
					pendingSaveCategory:
						payload?.pendingSaveCategory ||
						payload?.pendingPlaceLabel ||
						pendingPlaceLabel ||
						undefined,
					countryCode:
						payload?.countryCode ||
						manualDraft.countryCode ||
						locationControl?.currentCountryCode ||
						undefined,
				},
				{
					source: payload?.source || "manual",
					confidence: payload?.confidence || "medium",
				},
			),
		[
			locationControl?.currentCountryCode,
			manualDraft.countryCode,
			manualDraft.responderNote,
			manualDraft.unit,
			pendingPlaceLabel,
		],
	);

	const setActiveCandidate = useCallback(
		(payload) => {
			const normalized = buildCandidate(payload);
			setCandidate(normalized);
			return normalized;
		},
		[buildCandidate, setCandidate],
	);

	const clearCandidate = useCallback(() => {
		setCandidate(null);
	}, [setCandidate]);

	const pickupPayload = useMemo(
		() => (candidate ? mapCandidateToPickupPayload(candidate) : null),
		[candidate],
	);

	return useMemo(
		() => ({
			candidate,
			pickupPayload,
			setActiveCandidate,
			buildCandidate,
			clearCandidate,
		}),
		[buildCandidate, candidate, clearCandidate, pickupPayload, setActiveCandidate],
	);
}
