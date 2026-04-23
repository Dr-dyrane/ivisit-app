// history.content.js
// Copy constants for /map history surfaces.
// Per MAP_DESIGN_SYSTEM_OVERVIEW_V1 §18: string literals and section titles must live
// outside *.jsx files so UI structure stays declarative and copy can be edited once.

export const HISTORY_REQUEST_TYPES = Object.freeze({
	AMBULANCE: "ambulance",
	BED: "bed",
	VISIT: "visit",
});

export const HISTORY_STATUS_TONE_KEYS = Object.freeze({
	ACCENT: "accent",
	SUCCESS: "success",
	WARNING: "warning",
	CRITICAL: "critical",
	MUTED: "muted",
	DEFAULT: "default",
});

export const HISTORY_MODAL_COPY = Object.freeze({
	withHistory: "Recent visits",
	empty: "Your recent visits",
	ariaLabel: "Your recent visits",
});

export const HISTORY_DETAILS_COPY = Object.freeze({
	titleByType: {
		[HISTORY_REQUEST_TYPES.AMBULANCE]: "Transport details",
		[HISTORY_REQUEST_TYPES.BED]: "Reservation details",
		[HISTORY_REQUEST_TYPES.VISIT]: "Visit details",
	},
	fallbackTitle: "Care details",
	sectionTitles: {
		details: "Details",
		moreDetails: "More details",
		journey: "Journey",
		payment: "Payment",
		preparation: "Preparation",
		triage: "Triage",
		actions: "Actions",
	},
	detailLabels: {
		when: "When",
		eta: "ETA",
		type: "Type",
		specialty: "Specialty",
		room: "Room",
		responder: "Responder",
		vehicle: "Vehicle",
		bedType: "Bed type",
		bedNumber: "Bed number",
		reference: "Reference",
		payment: "Payment",
		paid: "Paid",
		total: "Total",
		paymentStatus: "Status",
		paymentMethod: "Method",
		triageProgress: "Progress",
		triageUrgency: "Urgency",
		nextVisit: "Next visit",
		rating: "Rating",
		myRating: "My rating",
		feedback: "Feedback",
		notes: "Notes",
		fallbackClinician: "Care team",
		clinician: "Doctor",
	},
	actionLabels: {
		callClinic: "Call clinic",
		joinVideo: "Join video",
		bookAgain: "Book again",
		paymentDetails: "Payment details",
		directions: "Get directions",
		resumeTracking: "Resume tracking",
		resumeRequest: "Resume request",
		rateVisit: "Rate visit",
		cancel: "Cancel visit",
	},
	ratingSuffix: "/ 5",
});

export const HISTORY_EMPTY_STATE_COPY = Object.freeze({
	title: "No care history yet",
	body: "Your completed care, upcoming visits, and active requests will appear here.",
	primary: "Choose care",
});

export const HISTORY_RECENTS_COPY = Object.freeze({
	sectionTitle: "Recent visits",
	sectionViewAllHint: "View all",
	ariaSectionLabel: "Recent visits",
});

export const HISTORY_DEFAULT_MAX_RECENTS = 3;

// ---------- Filter contract (legacy VisitsScreen parity) ----------
// Keys map 1:1 to the filterHistoryItemsByKey selector in history.presentation.js.
export const HISTORY_FILTER_KEYS = Object.freeze({
	ALL: "all",
	ACTIVE: "active",
	UPCOMING: "upcoming",
	COMPLETED: "completed",
	CANCELLED: "cancelled",
});

export const HISTORY_FILTER_OPTIONS = Object.freeze([
	Object.freeze({ key: HISTORY_FILTER_KEYS.ALL, label: "All" }),
	Object.freeze({ key: HISTORY_FILTER_KEYS.ACTIVE, label: "Active" }),
	Object.freeze({ key: HISTORY_FILTER_KEYS.UPCOMING, label: "Upcoming" }),
	Object.freeze({ key: HISTORY_FILTER_KEYS.COMPLETED, label: "Completed" }),
	Object.freeze({ key: HISTORY_FILTER_KEYS.CANCELLED, label: "Cancelled" }),
]);

export const HISTORY_EMPTY_STATE_BY_FILTER = Object.freeze({
	[HISTORY_FILTER_KEYS.ALL]: Object.freeze({
		title: "No care history yet",
		body: "Your completed care, upcoming visits, and active requests will appear here.",
	}),
	[HISTORY_FILTER_KEYS.ACTIVE]: Object.freeze({
		title: "Nothing active right now",
		body: "Active ambulance requests, bed reservations, and live care will show here.",
	}),
	[HISTORY_FILTER_KEYS.UPCOMING]: Object.freeze({
		title: "No upcoming visits",
		body: "Book a visit to see it here with date, time, and facility.",
	}),
	[HISTORY_FILTER_KEYS.COMPLETED]: Object.freeze({
		title: "No completed care yet",
		body: "Finished visits and care events will show in this list.",
	}),
	[HISTORY_FILTER_KEYS.CANCELLED]: Object.freeze({
		title: "No cancelled events",
		body: "Any cancelled, failed, or expired care requests will appear here.",
	}),
});

export const HISTORY_MODAL_BOTTOM_ACTION_COPY = Object.freeze({
	bookVisit: "Book a visit",
	chooseCare: "Choose care",
});
