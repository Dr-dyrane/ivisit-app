import MAP_LOCATION_INTENT_COPY from "./mapLocationIntent.content";

export const LOCATION_INTENT_MODES = Object.freeze({
	DEFAULT: "default",
	ADDRESS_SEARCH: "addressSearch",
	PLACE_SELECTED: "placeSelected",
	MANUAL_STEP: "manualStep",
	PIN_ADJUST: "pinAdjust",
	CONFIRM: "confirm",
	SAVE_CATEGORY: "saveCategory",
	SAVE_DETAILS: "saveDetails",
	SAVED_MANAGE: "savedManage",
});

export const MANUAL_LOCATION_STEPS = [
	{
		key: "country",
		label: "Country or region",
		question: "Which country or region?",
		helperText: "This keeps pickup, pricing, and responders in the right region.",
		placeholder: "Search countries…",
		inputType: "country",
		affordance: "select-search",
		required: true,
	},
	{
		key: "stateRegion",
		label: "State or province",
		question: "State, province, or region?",
		helperText: "Helpful for addresses that repeat across cities.",
		placeholder: "Search states or provinces…",
		autoCapitalize: "words",
		affordance: "select-search",
	},
	{
		key: "city",
		label: "City",
		question: "What city?",
		placeholder: "Search city…",
		required: true,
		autoCapitalize: "words",
		affordance: "search-drop",
		mapboxTypes: ["place", "region"],
	},
	{
		key: "streetAddress",
		label: "Street address",
		question: "Street address or landmark?",
		helperText: "Use the place name if there is no house number.",
		placeholder: "Search street or place…",
		required: true,
		autoCapitalize: "words",
		affordance: "search-drop",
		mapboxTypes: ["address", "poi"],
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
