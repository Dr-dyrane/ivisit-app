export const FLOW_STEPS = ["triage", "dispatch", "route", "identity"];

export const CHOOSE_RESOURCE_COPY = {
	etaFallback: "Arriving soon",
	serviceFallback: "Emergency ambulance",
	crewFallback: "2-person medical crew",
	locationConfirmed: "Location confirmed",
	priceFallback: "Price shown before you send",
	facilityFallback: "Medical center",
	selectedBadge: "Ready",
	routeTitle: "Pickup and hospital",
	routePreview: "Route ready",
	pickupLabel: "Pickup",
	hospitalLabel: "Hospital",
	mapPlaceholder: "Map will appear once the route is ready.",
	skipLabel: "Later",
	signInCta: "Continue with Google",
	signInHelp: "Before payment",
	signedInLabel: "Signed in",
	flow: {
		triage: {
			eyebrow: "Step 1 of 4",
			title: "What happened?",
			description: "Respond now or later.",
		},
		dispatch: {
			eyebrow: "Step 2 of 4",
			title: "Confirm ambulance",
			description: "",
		},
		route: {
			eyebrow: "Step 3 of 4",
			title: "Check route",
			description: "",
		},
		identity: {
			eyebrow: "Step 4 of 4",
			title: "Your details",
			description: "",
		},
	},
};

export default CHOOSE_RESOURCE_COPY;
