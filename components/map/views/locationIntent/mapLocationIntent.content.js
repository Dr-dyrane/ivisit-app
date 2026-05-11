export const MAP_LOCATION_INTENT_COPY = {
	fallbackTitle: "Set pickup area",
	fallbackSubtitle: "Choose a pickup to continue.",
	heroSubtitleReady: "Used for pickup, routing, and nearby care.",
	heroSubtitleMissing: "Set a pickup so the map starts in the right area.",
	infoTitleReady: "Used across the map",
	infoTitleMissing: "Why we ask",
	infoBodyReady: "Nearby care, routing, and pricing stay in sync.",
	infoBodyMissing: "A pickup keeps results grounded to the right area.",
	deviceActionTitle: "Use device location",
	deviceActionSubtitle: "Use GPS for live pickup.",
	deviceSettingsTitle: "Turn on location",
	deviceSettingsSubtitle: "Turn on GPS for live pickup.",
	searchActionTitle: "Search address or place",
	searchActionSubtitle: "Search a street, area, or landmark.",
	savedActionTitle: "Saved places",
	savedActionSubtitle: "Home, Work, Family, and custom places.",
	placesOrbLabels: {
		home: "Home",
		work: "Work",
		family: "Family",
		add: "Add",
	},
	placesOrbColors: {
		home: ["#FB923C", "#F97316"], // Orange — home warmth
		work: ["#A78BFA", "#8B5CF6"], // Purple — work
		family: ["#F472B6", "#DB2777"], // Pink/magenta gradient
		school: ["#38BDF8", "#0284C7"],
		pharmacy: ["#34D399", "#059669"],
		care: ["#FB7185", "#E11D48"],
		add: ["#EF4444", "#DC2626"], // Bluish-red gradient (matches map polyline/hospital marker)
	},
	placesOrbSubtext: {
		home: {
			unset: "Add",
			set: "Close by",
		},
		work: {
			unset: "Add",
			set: "Close by",
		},
		family: {
			unset: "Add",
			set: "Close by",
		},
		add: "",
	},
	infoRows: {
		nearby: "Nearby care",
		pricing: "Pricing",
		saved: "Saved places",
	},
	infoValues: {
		nearby: "Uses this area",
		pricingFallback: "Country-aware when available",
		saved: "Managed in Profile",
	},
	sourceLabels: {
		device: "Live",
		session_manual: "Manual",
		saved_manual_fallback: "Saved",
		saved_device_fallback: "Last known",
		missing: "Needed",
	},
	sourceMetaLabels: {
		device: "Using device",
		session_manual: "Manual pickup",
		saved_manual_fallback: "Saved pickup",
		saved_device_fallback: "Last known area",
		missing: "Pickup not set",
	},
};

export default MAP_LOCATION_INTENT_COPY;
