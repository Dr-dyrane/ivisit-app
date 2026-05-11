import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { suggestForStep, DEBOUNCE_MS, MIN_QUERY_LENGTH } from "../../../services/addressAssistService";
import { MANUAL_LOCATION_STEPS } from "../../../components/map/views/locationIntent/mapLocationIntent.model";
import useDebounce from "../../ui/useDebounce";

// PULLBACK NOTE: [LS-3]
// OLD: useEffect + manualDropTimerRef + mapboxService.suggestAddresses in MapLocationIntentStageBase
//      (defect class 2.18 — direct provider API call from render component, timer-based debounce).
// NEW: TanStack query with useDebounce. Results cached, deduped, no manual timer management.

export default function useManualDropController({
	manualStepIndex = 0,
	manualDraft = {},
	locationBias = null,
} = {}) {
	const [manualDropQuery, setManualDropQueryState] = useState("");

	const currentStep = MANUAL_LOCATION_STEPS[manualStepIndex] || null;
	const isDropStep = currentStep?.affordance === "search-drop";

	useEffect(() => {
		setManualDropQueryState("");
	}, [manualStepIndex]);

	// Debounce the query before passing to TanStack — prevents query key churn on every keystroke.
	const debouncedQuery = useDebounce(manualDropQuery, DEBOUNCE_MS);
	const trimmedQuery = debouncedQuery.trim();
	const shouldSearch = isDropStep && trimmedQuery.length >= MIN_QUERY_LENGTH;

	const context = useMemo(
		() => ({
			city: manualDraft.city || "",
			districtArea: manualDraft.districtArea || "",
			adminArea: manualDraft.adminArea || "",
			country: manualDraft.country || "",
		}),
		[manualDraft.adminArea, manualDraft.city, manualDraft.country, manualDraft.districtArea],
	);

	const { data: manualDropResults = [], isFetching: isSearchingManualDrop } = useQuery({
		queryKey: [
			"manualDrop",
			trimmedQuery,
			currentStep?.key,
			manualDraft.countryCode,
			context.city,
			context.districtArea,
			context.adminArea,
			context.country,
		],
		queryFn: () =>
			suggestForStep({
				query: trimmedQuery,
				mapboxTypes: currentStep?.mapboxTypes,
				countryCode: manualDraft.countryCode || undefined,
				proximity: locationBias || null,
				context,
			}),
		enabled: shouldSearch,
		staleTime: 30_000,
		gcTime: 60_000,
	});

	const setManualDropQuery = useCallback((query) => {
		setManualDropQueryState(query);
	}, []);

	const clearManualDrop = useCallback(() => {
		setManualDropQueryState("");
	}, []);

	// Contextual hint shown in the drop input placeholder (e.g. "Lagos, Nigeria")
	const manualDropContextHint = useMemo(() => {
		const parts = [context.districtArea, context.city, context.adminArea, context.country].filter(Boolean);
		return parts.length > 0 ? parts.join(", ") : "";
	}, [context.adminArea, context.city, context.country, context.districtArea]);

	// True when the user has typed enough to search but the debounce hasn't fired yet.
	// Lets the UI show a spinner immediately instead of a blank gap.
	const rawTrimmed = manualDropQuery.trim();
	const isPendingSearch = isDropStep
		&& rawTrimmed.length >= MIN_QUERY_LENGTH
		&& rawTrimmed !== trimmedQuery;

	return useMemo(
		() => ({
			manualDropQuery,
			manualDropResults: isDropStep ? manualDropResults : [],
			isSearchingManualDrop: isDropStep && (isSearchingManualDrop || isPendingSearch),
			manualDropContextHint,
			setManualDropQuery,
			clearManualDrop,
		}),
		[
			clearManualDrop,
			isDropStep,
			isSearchingManualDrop,
			isPendingSearch,
			manualDropContextHint,
			manualDropQuery,
			manualDropResults,
			setManualDropQuery,
		],
	);
}
