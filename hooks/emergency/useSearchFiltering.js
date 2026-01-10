import { useCallback, useMemo } from "react";

export const useSearchFiltering = ({
	hospitals,
	filteredHospitals,
	mode,
	selectedSpecialty,
	searchQuery,
	setSearchQuery,
	mapRef,
	timing,
}) => {
	const filterByQuery = useCallback(
		(query, baseHospitals) => {
			if (!query.trim()) return baseHospitals;

			const q = query.toLowerCase();
			return baseHospitals.filter((h) => {
				const name = typeof h?.name === "string" ? h.name.toLowerCase() : "";
				const address =
					typeof h?.address === "string" ? h.address.toLowerCase() : "";
				const specialtiesMatch =
					Array.isArray(h?.specialties) &&
					h.specialties.some((s) =>
						(typeof s === "string" ? s.toLowerCase() : "").includes(q)
					);
				const typeMatch =
					typeof h?.type === "string" && h.type.toLowerCase().includes(q);

				return (
					name.includes(q) ||
					address.includes(q) ||
					specialtiesMatch ||
					typeMatch
				);
			});
		},
		[]
	);

	const getBaseHospitals = useCallback(
		(currentMode, specialty, allHospitals, filtered) => {
			return currentMode === "booking"
				? specialty
					? allHospitals.filter((h) =>
							h?.specialties?.includes?.(specialty)
					  )
					: allHospitals
				: filtered;
		},
		[]
	);

	const searchFilteredHospitals = useMemo(() => {
		const base = getBaseHospitals(
			mode,
			selectedSpecialty,
			hospitals,
			filteredHospitals
		);
		return filterByQuery(searchQuery, base);
	}, [
		filterByQuery,
		filteredHospitals,
		getBaseHospitals,
		hospitals,
		mode,
		searchQuery,
		selectedSpecialty,
	]);

	const handleSearch = useCallback(
		(query) => {
			timing?.startTiming?.("search_filter");
			setSearchQuery(query);

			if (query.length > 2 && mapRef?.current) {
				const base = getBaseHospitals(
					mode,
					selectedSpecialty,
					hospitals,
					filteredHospitals
				);
				const matches = filterByQuery(query, base);

				if (matches.length === 1) {
					mapRef.current.animateToHospital(matches[0]);
				}
			}

			timing?.endTiming?.("search_filter");
		},
		[
			filteredHospitals,
			filterByQuery,
			getBaseHospitals,
			hospitals,
			mapRef,
			mode,
			selectedSpecialty,
			setSearchQuery,
			timing,
		]
	);

	return {
		searchFilteredHospitals,
		handleSearch,
		filterByQuery,
	};
};
