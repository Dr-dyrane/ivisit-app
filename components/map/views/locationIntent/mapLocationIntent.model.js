import MAP_LOCATION_INTENT_COPY from "./mapLocationIntent.content";

export const LOCATION_INTENT_MODES = Object.freeze({
	DEFAULT: "default",
	ADDRESS_SEARCH: "addressSearch",
	// PULLBACK NOTE: [LS-5] OLD: PLACE_SELECTED: "placeSelected" // NEW: unified CANDIDATE_DECISION
	CANDIDATE_DECISION: "candidateDecision",
	MANUAL_STEP: "manualStep",
	PIN_ADJUST: "pinAdjust",
	CONFIRM: "confirm",
	SAVE_CATEGORY: "saveCategory",
	SAVE_DETAILS: "saveDetails",
	SAVED_MANAGE: "savedManage",
	// PULLBACK NOTE: [LS-10] NEW: dedicated places hub phase
	PLACES_HUB: "placesHub",
	// PULLBACK NOTE: [LS-11] NEW: dedicated recents hub phase
	RECENTS_HUB: "recentsHub",
});

// Per-country override for the "state / province" subdivision level.
// Defaults to "State or province" when not listed.
export const COUNTRY_SUBDIVISION_TERM = {
	NG: { label: "State", question: "Which state?", placeholder: "Search state...", helperText: null },
	AE: { label: "Emirate", question: "Which emirate?", placeholder: "Search emirate...", helperText: "Dubai, Abu Dhabi, Sharjah, etc." },
	JP: { label: "Prefecture", question: "Which prefecture?", placeholder: "Search prefecture...", helperText: "Tokyo-to, Osaka-fu, Kyoto-fu, etc." },
	IN: { label: "State or Union Territory", question: "State or Union Territory?", placeholder: "Search state or UT...", helperText: null },
	CN: { label: "Province or municipality", question: "Province or municipality?", placeholder: "Search province...", helperText: null },
	BR: { label: "State (Estado)", question: "Which estado?", placeholder: "Search estado...", helperText: null },
	AU: { label: "State or territory", question: "State or territory?", placeholder: "Search state or territory...", helperText: null },
	RU: { label: "Oblast / Krai / Republic", question: "Oblast, Krai, or Republic?", placeholder: "Search region...", helperText: null },
	MX: { label: "State (Estado)", question: "Which estado?", placeholder: "Search estado...", helperText: null },
	ZA: { label: "Province", question: "Which province?", placeholder: "Search province...", helperText: null },
	KE: { label: "County", question: "Which county?", placeholder: "Search county...", helperText: null },
	GH: { label: "Region", question: "Which region?", placeholder: "Search region...", helperText: null },
	EG: { label: "Governorate", question: "Which governorate?", placeholder: "Search governorate...", helperText: null },
	SA: { label: "Region", question: "Which region?", placeholder: "Search region...", helperText: null },
	ET: { label: "Region", question: "Which region?", placeholder: "Search region...", helperText: null },
	PK: { label: "Province", question: "Which province?", placeholder: "Search province...", helperText: null },
	BD: { label: "Division", question: "Which division?", placeholder: "Search division...", helperText: null },
};

export const COUNTRY_AREA_TERM = {
	NG: { label: "LGA or area", question: "Which LGA or area?", placeholder: "Search LGA or area...", helperText: "This helps narrow down places inside the city." },
};

/**
 * Returns localised subdivision term for a given ISO country code.
 * Falls back to the model's default adminArea step labels.
 */
export function getSubdivisionLabelForCountry(countryCode) {
	if (!countryCode) return null;
	return COUNTRY_SUBDIVISION_TERM[countryCode.toUpperCase()] || null;
}

export function getAreaLabelForCountry(countryCode) {
	if (!countryCode) return null;
	return COUNTRY_AREA_TERM[countryCode.toUpperCase()] || null;
}

/**
 * Assembles a readable address string from the current manual draft.
 * Used for the live "address as it builds" preview strip.
 */
export function buildDraftAddressLine(draft = {}) {
	const parts = [
		draft.placeOrAddress,
		draft.districtArea,
		draft.city,
		draft.adminArea,
		draft.country,
	].filter(Boolean);
	return parts.join(", ");
}

export const MANUAL_LOCATION_STEPS = [
	{
		key: "country",
		label: "Country or region",
		question: "Which country or region?",
		helperText: "Used to narrow results.",
		placeholder: "Search countries...",
		inputType: "country",
		affordance: "select-search",
		required: true,
	},
	{
		key: "adminArea",
		label: "Region",
		question: "State, province, or region?",
		helperText: null,
		placeholder: "Search region...",
		autoCapitalize: "words",
		affordance: "search-drop",
		mapboxTypes: ["region", "district"],
	},
	{
		key: "city",
		label: "City",
		question: "What city?",
		placeholder: "Search city...",
		required: true,
		autoCapitalize: "words",
		affordance: "search-drop",
		mapboxTypes: ["place", "region"],
	},
	{
		key: "districtArea",
		label: "Area",
		question: "What area or district?",
		helperText: null,
		placeholder: "Search area or district...",
		autoCapitalize: "words",
		affordance: "search-drop",
		mapboxTypes: ["district", "locality", "neighborhood", "place"],
		optional: true,
	},
	{
		key: "placeOrAddress",
		label: "Place or address",
		question: "Street, landmark, or place name?",
		helperText: "Street, building, junction, or landmark.",
		placeholder: "Search street, place, or landmark...",
		required: true,
		autoCapitalize: "words",
		affordance: "search-drop",
		mapboxTypes: ["address", "poi", "place"],
	},
	{
		key: "unit",
		label: "Apartment, unit, or landmark",
		question: "Apartment, unit, or landmark?",
		placeholder: "Apt 7B, near the front desk",
		autoCapitalize: "sentences",
		affordance: "text",
		optional: true,
	},
	{
		key: "responderNote",
		label: "Note for responders",
		question: "Any note for responders?",
		placeholder: "Gate code, entry notes, or safest entrance",
		autoCapitalize: "sentences",
		affordance: "textarea",
		multiline: true,
		optional: true,
	},
];

function coerceText(value, fallback = "") {
	return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function buildSourceMeta({ source, requiresLocationSelection, shouldOpenSettings }) {
	if (requiresLocationSelection) {
		return {
			label: MAP_LOCATION_INTENT_COPY.sourceLabels.missing,
			metaLabel: MAP_LOCATION_INTENT_COPY.sourceMetaLabels.missing,
			iconName: "location-outline",
		};
	}

	const safeSource = coerceText(source, "device");
	const iconNameBySource = {
		device: "locate-outline",
		session_manual: "create-outline",
		saved_manual_fallback: "bookmark-outline",
		saved_device_fallback: "time-outline",
	};
	return {
		label:
			MAP_LOCATION_INTENT_COPY.sourceLabels[safeSource] ||
			MAP_LOCATION_INTENT_COPY.sourceLabels.device,
		metaLabel:
			MAP_LOCATION_INTENT_COPY.sourceMetaLabels[safeSource] ||
			MAP_LOCATION_INTENT_COPY.sourceMetaLabels.device,
		iconName: shouldOpenSettings
			? "settings-outline"
			: iconNameBySource[safeSource] || "locate-outline",
	};
}

export function buildMapLocationIntentModel({
	currentLocation,
	locationControl,
	mode = LOCATION_INTENT_MODES.DEFAULT,
} = {}) {
	const requiresLocationSelection = Boolean(
		locationControl?.requiresLocationSelection ||
			currentLocation?.requiresLocationSelection,
	);
	const shouldOpenSettings = Boolean(locationControl?.shouldOpenSettings);
	const sourceMeta = buildSourceMeta({
		source: currentLocation?.source || locationControl?.locationSource,
		requiresLocationSelection,
		shouldOpenSettings,
	});
	const headerTitle = coerceText(
		currentLocation?.primaryText,
		MAP_LOCATION_INTENT_COPY.fallbackTitle,
	);
	const headerSubtitle = coerceText(
		currentLocation?.secondaryText,
		MAP_LOCATION_INTENT_COPY.fallbackSubtitle,
	);
	const deviceActionTitle = shouldOpenSettings
		? MAP_LOCATION_INTENT_COPY.deviceSettingsTitle
		: coerceText(
				locationControl?.currentLocationActionLabel,
				MAP_LOCATION_INTENT_COPY.deviceActionTitle,
			);
	const searchActionTitle = coerceText(
		locationControl?.manualEntryActionLabel,
		MAP_LOCATION_INTENT_COPY.searchActionTitle,
	);
	const countryCode = coerceText(
		currentLocation?.countryCode || locationControl?.currentCountryCode,
		"",
	).toUpperCase();

	const heroMetaItems = [sourceMeta.metaLabel];
	if (countryCode) {
		heroMetaItems.push(countryCode);
	}

	return {
		mode,
		requiresLocationSelection,
		shouldOpenSettings,
		headerTitle,
		headerSubtitle,
		sourceLabel: sourceMeta.label,
		hero: {
			title: headerTitle,
			subtitle: requiresLocationSelection
				? MAP_LOCATION_INTENT_COPY.heroSubtitleMissing
				: MAP_LOCATION_INTENT_COPY.heroSubtitleReady,
			rightMeta: sourceMeta.label,
			iconName: sourceMeta.iconName,
			metaItems: heroMetaItems.filter(Boolean),
		},
		actions: [
			{
				key: "device",
				title: deviceActionTitle,
				subtitle: shouldOpenSettings
					? MAP_LOCATION_INTENT_COPY.deviceSettingsSubtitle
					: MAP_LOCATION_INTENT_COPY.deviceActionSubtitle,
				iconName: shouldOpenSettings ? "settings-outline" : "locate-outline",
				trailingIconName: "chevron-forward",
				tone: "device",
			},
			{
				key: "search",
				title: searchActionTitle,
				subtitle: MAP_LOCATION_INTENT_COPY.searchActionSubtitle,
				iconName: "search-outline",
				trailingIconName: "chevron-forward",
				tone: "search",
			},
			{
				key: "saved",
				title: MAP_LOCATION_INTENT_COPY.savedActionTitle,
				subtitle: MAP_LOCATION_INTENT_COPY.savedActionSubtitle,
				iconName: "bookmark-outline",
				trailingIconName: "chevron-forward",
				tone: "saved",
			},
		],
		searchPlaceholder: "Search address or place",
		recentsTitle: "Recents",
		placesTitle: "Places",
		manualIntroTitle: "Can't find it?",
		manualIntroBody: "Enter location details one step at a time.",
		manualActionLabel: "Enter manually",
		adjustOnMapLabel: "Adjust on map",
		info: {
			title: requiresLocationSelection
				? MAP_LOCATION_INTENT_COPY.infoTitleMissing
				: MAP_LOCATION_INTENT_COPY.infoTitleReady,
			body: requiresLocationSelection
				? MAP_LOCATION_INTENT_COPY.infoBodyMissing
				: MAP_LOCATION_INTENT_COPY.infoBodyReady,
			rows: [
				{
					label: MAP_LOCATION_INTENT_COPY.infoRows.nearby,
					value: MAP_LOCATION_INTENT_COPY.infoValues.nearby,
					iconName: "medkit-outline",
				},
				{
					label: MAP_LOCATION_INTENT_COPY.infoRows.pricing,
					value:
						countryCode || MAP_LOCATION_INTENT_COPY.infoValues.pricingFallback,
					iconName: "cash-outline",
				},
				{
					label: MAP_LOCATION_INTENT_COPY.infoRows.saved,
					value: MAP_LOCATION_INTENT_COPY.infoValues.saved,
					iconName: "bookmark-outline",
				},
			],
		},
	};
}

export default buildMapLocationIntentModel;
