// PULLBACK NOTE: [X-2] Extracted from MapLocationIntentStageBase.jsx
// OLD: 10 manual handler useCallbacks + manualNextActionLabel useMemo all
//      lived inline in MapLocationIntentStageBase (~200 lines).
// NEW: single hook call; state stays in StageBase (so useManualDropController
//      can also read it), setters are passed into this hook as params.

import { useCallback, useMemo } from "react";
import { MAP_SHEET_SNAP_STATES } from "../../../components/map/core/mapSheet.constants";
import {
	buildManualAddressLabel,
	buildManualAddressParts,
	getManualStepActionLabel,
	validateManualLocationStep,
} from "../../../components/map/views/locationIntent/mapLocationIntent.helpers";
import { MANUAL_LOCATION_STEPS } from "../../../components/map/views/locationIntent/mapLocationIntent.model";
import addressAssistService from "../../../services/addressAssistService";

export default function useManualEntryHandlers({
	// state values
	manualStepIndex,
	manualDraft,
	isResolvingManual,
	// state setters
	setManualStepIndex,
	setManualDraft,
	setManualError,
	setIsResolvingManual,
	// nav + context
	locationBias,
	pendingPlaceLabel,
	buildSelectedLocation,
	setActiveCandidate,
	navigateToCandidateDecision,
	navigateToManualStep,
	navigateToDefaultAndClearSearch,
	onSnapStateChange,
	clearManualDrop,
	setManualDropQuery,
	manualDropQuery,
}) {

	const handleOpenManualStep = useCallback(() => {
		setManualError(null);
		setManualStepIndex(0);
		navigateToManualStep();
		onSnapStateChange?.(MAP_SHEET_SNAP_STATES.EXPANDED);
	}, [navigateToManualStep, onSnapStateChange]);

	const handleManualCountrySelectInline = useCallback(({ name, code }) => {
		if (!name) return;
		setManualDraft((prev) => ({
			...prev,
			country: name,
			countryCode: code || prev.countryCode || "",
			adminArea: "",
			city: "",
			districtArea: "",
			placeOrAddress: "",
		}));
		setManualError(null);
		setManualStepIndex((prev) => (prev === 0 ? 1 : prev));
	}, []);

	const handleManualConfirm = useCallback(async () => {
		const requiredError = MANUAL_LOCATION_STEPS
			.map((step) => validateManualLocationStep(step, manualDraft))
			.find(Boolean);
		if (requiredError) {
			const nextIndex = MANUAL_LOCATION_STEPS.findIndex((step) =>
				validateManualLocationStep(step, manualDraft),
			);
			setManualStepIndex(Math.max(0, nextIndex));
			setManualError(requiredError);
			return;
		}

		const label = buildManualAddressLabel(manualDraft);
		const address = buildManualAddressParts(manualDraft).join(", ");

		if (!address) {
			setManualError("Add a little more detail so responders know where to go.");
			return;
		}

		setIsResolvingManual(true);
		setManualError(null);

		try {
			const geocoded = await addressAssistService.resolveManualDraft(address, {
				countryCode: manualDraft.countryCode || undefined,
				proximity: locationBias || undefined,
			});

			// PULLBACK NOTE: [LS-9] Gap 2 fix - weak or missing geocode result.
			// OLD: throw or fall back to current GPS.
			// NEW: no fabricated coordinates; stay in manual recovery unless provider returns finite coords.
			// Relevance <0.4 = Mapbox couldn't confidently match the street.
			const isWeakResult =
				typeof geocoded?.relevance === "number" && geocoded.relevance < 0.4;

			if (!geocoded) {
				const fallbackAddress = [
					manualDraft.districtArea,
					manualDraft.city,
					manualDraft.adminArea,
					manualDraft.country,
				].filter(Boolean).join(", ");
				const fallbackGeocoded = fallbackAddress
					? await addressAssistService.resolveManualDraft(fallbackAddress, {
						countryCode: manualDraft.countryCode || undefined,
						proximity: locationBias || undefined,
					})
					: null;
				if (!fallbackGeocoded) {
					const placeIndex = MANUAL_LOCATION_STEPS.findIndex(
						(step) => step.key === "placeOrAddress",
					);
					setManualStepIndex(placeIndex >= 0 ? placeIndex : 0);
					setManualError(
						"We couldn't place the pin yet. Add a nearby landmark or area.",
					);
					return;
				}
				const fallbackNormalized = buildSelectedLocation({
					source: "manual",
					label,
					address,
					coords: {
						latitude: fallbackGeocoded.latitude,
						longitude: fallbackGeocoded.longitude,
					},
					countryCode: fallbackGeocoded.countryCode || manualDraft.countryCode || null,
					confidence: "low",
					unit: manualDraft.unit || undefined,
					responderNote: manualDraft.responderNote || undefined,
					pendingPlaceLabel,
				});
				setActiveCandidate(fallbackNormalized);
				navigateToCandidateDecision();
				onSnapStateChange?.(MAP_SHEET_SNAP_STATES.EXPANDED);
				return;
			}

			const { latitude, longitude } = geocoded;
			const normalized = buildSelectedLocation({
				source: "manual",
				label,
				address: geocoded.formattedAddress || address,
				coords: { latitude, longitude },
				countryCode: geocoded.countryCode || manualDraft.countryCode || null,
				confidence: isWeakResult ? "low" : "medium",
				unit: manualDraft.unit || undefined,
				responderNote: manualDraft.responderNote || undefined,
				pendingPlaceLabel,
			});
			setActiveCandidate(normalized);
			navigateToCandidateDecision();
			onSnapStateChange?.(MAP_SHEET_SNAP_STATES.EXPANDED);
		} catch (_error) {
			const placeIndex = MANUAL_LOCATION_STEPS.findIndex(
				(step) => step.key === "placeOrAddress",
			);
			setManualStepIndex(placeIndex >= 0 ? placeIndex : 0);
			setManualError(
				"We couldn't place the pin yet. Add a nearby landmark or area.",
			);
		} finally {
			setIsResolvingManual(false);
		}
	}, [buildSelectedLocation, locationBias, manualDraft, navigateToCandidateDecision, onSnapStateChange, pendingPlaceLabel, setActiveCandidate]);

	const handleManualDraftChange = useCallback((key, value) => {
		if (key === "__jumpTo__") {
			const targetIdx = Number(value);
			if (Number.isFinite(targetIdx)) {
				setManualError(null);
				clearManualDrop();
				setManualStepIndex(targetIdx);
			}
			return;
		}
		setManualDraft((prev) => ({ ...prev, [key]: value }));
		setManualError(null);
	}, [clearManualDrop]);

	const handleManualDropQueryChange = useCallback((query) => {
		setManualDropQuery(query);
		setManualError(null);
	}, [setManualDropQuery]);

	const handleManualDropSelect = useCallback((key, value, cascadeFields) => {
		setManualDraft((prev) => {
			const next = { ...prev, [key]: value };
			if (key === "adminArea") {
				next.city = "";
				next.districtArea = "";
				next.placeOrAddress = "";
			}
			if (key === "city") {
				next.districtArea = "";
				next.placeOrAddress = "";
			}
			if (key === "districtArea") {
				next.placeOrAddress = "";
			}
			if (cascadeFields) {
				Object.entries(cascadeFields).forEach(([cKey, cVal]) => {
					if (cVal && !next[cKey]) next[cKey] = cVal;
				});
			}
			return next;
		});
		clearManualDrop();
		setManualError(null);
		setManualStepIndex((prev) => Math.min(prev + 1, MANUAL_LOCATION_STEPS.length - 1));
	}, [clearManualDrop]);

	const handleManualUseTypedQuery = useCallback((key, value) => {
		const trimmed = String(value || "").trim();
		if (!trimmed) return;
		setManualDraft((prev) => {
			const next = { ...prev, [key]: trimmed };
			if (key === "adminArea") {
				next.city = "";
				next.districtArea = "";
				next.placeOrAddress = "";
			}
			if (key === "city") {
				next.districtArea = "";
				next.placeOrAddress = "";
			}
			if (key === "districtArea") {
				next.placeOrAddress = "";
			}
			return next;
		});
		clearManualDrop();
		setManualError(null);
		setManualStepIndex((prev) =>
			Math.min(prev + 1, MANUAL_LOCATION_STEPS.length - 1),
		);
	}, [clearManualDrop]);

	const handleNextManualStep = useCallback(() => {
		const currentStep = MANUAL_LOCATION_STEPS[manualStepIndex];
		const typedManualQuery = String(manualDropQuery || "").trim();
		if (
			currentStep?.affordance === "search-drop" &&
			typedManualQuery.length >= 2 &&
			!manualDraft[currentStep.key]
		) {
			handleManualUseTypedQuery(currentStep.key, typedManualQuery);
			return;
		}
		const validationError = validateManualLocationStep(currentStep, manualDraft);
		if (validationError) {
			setManualError(validationError);
			return;
		}
		if (manualStepIndex >= MANUAL_LOCATION_STEPS.length - 1) {
			handleManualConfirm();
			return;
		}
		setManualError(null);
		setManualStepIndex((prev) =>
			Math.min(prev + 1, MANUAL_LOCATION_STEPS.length - 1),
		);
	}, [
		handleManualConfirm,
		handleManualUseTypedQuery,
		manualDraft,
		manualDropQuery,
		manualStepIndex,
	]);

	const handlePrevManualStep = useCallback(() => {
		setManualError(null);
		clearManualDrop();
		if (manualStepIndex <= 0) {
			navigateToDefaultAndClearSearch();
			return;
		}
		setManualStepIndex((prev) => Math.max(0, prev - 1));
	}, [clearManualDrop, manualStepIndex, navigateToDefaultAndClearSearch]);

	const manualNextActionLabel = useMemo(
		() =>
			getManualStepActionLabel({
				step: MANUAL_LOCATION_STEPS[manualStepIndex],
				stepIndex: manualStepIndex,
				stepCount: MANUAL_LOCATION_STEPS.length,
				manualDraft,
				isResolving: isResolvingManual,
			}),
		[isResolvingManual, manualDraft, manualStepIndex],
	);

	const resetManualState = useCallback(() => {
		setManualError(null);
		setManualStepIndex(0);
		setManualDraft({
			country: "",
			countryCode: "",
			adminArea: "",
			city: "",
			districtArea: "",
			placeOrAddress: "",
			unit: "",
			responderNote: "",
		});
		setIsResolvingManual(false);
	}, [setManualDraft, setManualError, setIsResolvingManual, setManualStepIndex]);

	return {
		manualNextActionLabel,
		resetManualState,
		handleOpenManualStep,
		handleManualConfirm,
		handleManualDraftChange,
		handleManualDropQueryChange,
		handleManualDropSelect,
		handleManualCountrySelectInline,
		handleManualUseTypedQuery,
		handleNextManualStep,
		handlePrevManualStep,
	};
}
