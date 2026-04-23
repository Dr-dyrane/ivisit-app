import { EmergencyMode } from "../contexts/EmergencyContext";

export const ROUTES = {
	USER_HOME: "/(user)",
	STACK_MORE: "/(user)/(stacks)/more",
	STACK_SEARCH: "/(user)/(stacks)/search",
	STACK_NOTIFICATIONS: "/(user)/(stacks)/notifications",
	STACK_NOTIFICATION_DETAILS: (id) => `/(user)/(stacks)/notification-details?id=${String(id)}`,
	STACK_SETTINGS: "/(user)/(stacks)/settings",
	STACK_MEDICAL_PROFILE: "/(user)/(stacks)/medical-profile",
	STACK_PROFILE: "/(user)/(stacks)/profile",
	STACK_PAYMENT: "/(user)/(stacks)/payment",
	STACK_VISITS: "/(user)/(stacks)/visits",
	STACK_VISIT_DETAILS: (id) => `/(user)/(stacks)/visit/${String(id)}`,
	STACK_EMERGENCY_REQUEST_AMBULANCE: "/(user)/(stacks)/emergency/request-ambulance",
	STACK_EMERGENCY_BOOK_BED: "/(user)/(stacks)/emergency/book-bed",
};

let isNavigating = false;

function nav(router, method, target) {
	if (isNavigating) return;

	const fn = method === "replace" ? router?.replace : router?.push;
	if (!fn) return;

	isNavigating = true;
	fn(target);

	// Reset flag after a short delay (e.g., 500ms) to allow next navigation
	setTimeout(() => {
		isNavigating = false;
	}, 500);
}

export function navigateBack({ router, fallbackRoute = null }) {
	if (isNavigating) return;
	const canGoBack = typeof router?.canGoBack === "function" ? router.canGoBack() : false;
	if (canGoBack && typeof router?.back === "function") {
		isNavigating = true;
		router.back();
		setTimeout(() => {
			isNavigating = false;
		}, 500);
		return;
	}

	if (typeof fallbackRoute === "string" && fallbackRoute.trim() && typeof router?.replace === "function") {
		nav(router, "replace", fallbackRoute);
	}
}

export function navigateToSOS({
	router,
	setEmergencyMode,
	setEmergencySearch,
	searchQuery,
	mode = EmergencyMode.EMERGENCY,
	method = "replace",
}) {
	setEmergencyMode?.(mode);
	if (typeof searchQuery === "string" && searchQuery.trim()) {
		setEmergencySearch?.(searchQuery);
	}
	nav(router, method, ROUTES.USER_HOME);
}

export function navigateToVisits({ router, filter, method = "push" }) {
	const v = typeof filter === "string" && filter.trim() ? filter.trim() : null;
	if (!v) {
		nav(router, method, ROUTES.STACK_VISITS);
		return;
	}
	nav(router, method, { pathname: ROUTES.STACK_VISITS, params: { filter: v } });
}

export function navigateToNotifications({ router, filter, method = "push" }) {
	const v = typeof filter === "string" && filter.trim() ? filter.trim() : null;
	if (!v) {
		nav(router, method, ROUTES.STACK_NOTIFICATIONS);
		return;
	}
	nav(router, method, { pathname: ROUTES.STACK_NOTIFICATIONS, params: { filter: v } });
}

export function navigateToVisitDetails({ router, visitId, method = "push" }) {
	if (!visitId) return;
	nav(router, method, ROUTES.STACK_VISIT_DETAILS(visitId));
}

export function navigateToSettings({ router, method = "push" }) {
	nav(router, method, ROUTES.STACK_SETTINGS);
}

export function navigateToMedicalProfile({ router, method = "push" }) {
	nav(router, method, ROUTES.STACK_MEDICAL_PROFILE);
}

export function navigateToProfile({ router, method = "push" }) {
	nav(router, method, ROUTES.STACK_PROFILE);
}

export function navigateToPayment({ router, method = "push" }) {
	nav(router, method, ROUTES.STACK_PAYMENT);
}

export function navigateToEmergencyContacts({ router, method = "push" }) {
	nav(router, method, "/(user)/(stacks)/emergency-contacts");
}

export function navigateToInsurance({ router, method = "push" }) {
	nav(router, method, "/(user)/(stacks)/insurance");
}

export function navigateToHelpSupport({ router, ticketId, method = "push" }) {
	if (ticketId) {
		nav(router, method, { pathname: "/(user)/(stacks)/help-support", params: { ticketId } });
		return;
	}
	nav(router, method, "/(user)/(stacks)/help-support");
}

export function navigateToChangePassword({ router, method = "push" }) {
	nav(router, method, "/(user)/(stacks)/change-password");
}

export function navigateToCreatePassword({ router, method = "push" }) {
	nav(router, method, "/(user)/(stacks)/create-password");
}

export function navigateToNotificationDetails({ router, notificationId, method = "push" }) {
	if (!notificationId) return;
	nav(router, method, ROUTES.STACK_NOTIFICATION_DETAILS(notificationId));
}

export function navigateToMore({ router, method = "push", screen }) {
	if (screen === "insurance") {
		nav(router, method, "/(user)/(stacks)/insurance");
		return;
	}
	nav(router, method, ROUTES.STACK_MORE);
}

export function navigateToRequestAmbulance({
	router,
	hospitalId,
	method = "push",
	params = null,
}) {
	if (!hospitalId) return;
	nav(router, method, {
		pathname: ROUTES.STACK_EMERGENCY_REQUEST_AMBULANCE,
		params: {
			hospitalId: String(hospitalId),
			...(params && typeof params === "object" ? params : {}),
		},
	});
}

export function navigateToBookBed({
	router,
	hospitalId,
	method = "push",
	params = null,
}) {
	if (!hospitalId) return;
	nav(router, method, {
		pathname: ROUTES.STACK_EMERGENCY_BOOK_BED,
		params: {
			hospitalId: String(hospitalId),
			...(params && typeof params === "object" ? params : {}),
		},
	});
}

