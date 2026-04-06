export const REQUEST_HELP_SERVICE = "ambulance";

export const EMERGENCY_FLOW_STATES = {
	request_started: {
		key: "request_started",
		title: "Finding your location...",
		support: "",
	},
	confirm_location: {
		key: "confirm_location",
		title: "Confirm location",
		support: "",
		primaryAction: "Use this location",
		secondaryAction: "Change location",
	},
	finding_nearby_help: {
		key: "finding_nearby_help",
		title: "Finding nearby responders",
		support: "",
	},
	proposed_hospital: {
		key: "proposed_hospital",
		title: "Closest help nearby",
		support: "",
		primaryAction: "Continue",
		secondaryAction: "Choose another",
	},
	responder_matched: {
		key: "responder_matched",
		title: "Help is on the way",
		support: "Responder assigned nearby.",
		secondaryAction: "Share more details",
	},
	tracking_arrival: {
		key: "tracking_arrival",
		title: "Tracking arrival",
		support: "We'll keep this updated until help gets to you.",
	},
	location_failed: {
		key: "location_failed",
		title: "We couldn't confirm your location",
		support: "Try again or search for an address.",
		primaryAction: "Try again",
		secondaryAction: "Change location",
	},
	no_responder_yet: {
		key: "no_responder_yet",
		title: "Still checking nearby help",
		support: "We're looking for the nearest available ambulance.",
	},
	connection_unstable: {
		key: "connection_unstable",
		title: "Connection is unstable",
		support: "We're still trying and will keep your place.",
	},
};

export const EMERGENCY_FLOW_ORDER = [
	EMERGENCY_FLOW_STATES.request_started.key,
	EMERGENCY_FLOW_STATES.confirm_location.key,
	EMERGENCY_FLOW_STATES.finding_nearby_help.key,
	EMERGENCY_FLOW_STATES.proposed_hospital.key,
	EMERGENCY_FLOW_STATES.responder_matched.key,
	EMERGENCY_FLOW_STATES.tracking_arrival.key,
];
