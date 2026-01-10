import { EmergencyMode } from "../contexts/EmergencyContext";

export const ROUTES = {
	TABS_ROOT: "/(user)/(tabs)",
	TAB_VISITS: "/(user)/(tabs)/visits",
	TAB_MORE: "/(user)/(tabs)/more",
	STACK_SEARCH: "/(user)/(stacks)/search",
	STACK_NOTIFICATIONS: "/(user)/(stacks)/notifications",
	STACK_SETTINGS: "/(user)/(stacks)/settings",
	STACK_MEDICAL_PROFILE: "/(user)/(stacks)/medical-profile",
	STACK_PROFILE: "/(user)/(stacks)/profile",
	STACK_VISIT_DETAILS: (id) => `/(user)/(stacks)/visit/${String(id)}`,
};

function nav(router, method, target) {
	const fn = method === "replace" ? router?.replace : router?.push;
	if (!fn) return;
	fn(target);
}

export function navigateToSOS({
	router,
	setEmergencyMode,
	mode = EmergencyMode.EMERGENCY,
	method = "replace",
}) {
	setEmergencyMode?.(mode);
	nav(router, method, ROUTES.TABS_ROOT);
}

export function navigateToVisits({ router, filter, method = "push" }) {
	const v = typeof filter === "string" && filter.trim() ? filter.trim() : null;
	if (!v) {
		nav(router, method, ROUTES.TAB_VISITS);
		return;
	}
	nav(router, method, { pathname: ROUTES.TAB_VISITS, params: { filter: v } });
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

export function navigateToEmergencyContacts({ router, method = "push" }) {
	nav(router, method, "/(user)/(stacks)/emergency-contacts");
}

export function navigateToInsurance({ router, method = "push" }) {
	nav(router, method, "/(user)/(stacks)/insurance");
}

export function navigateToHelpSupport({ router, method = "push" }) {
	nav(router, method, "/(user)/(stacks)/help-support");
}

export function navigateToChangePassword({ router, method = "push" }) {
	nav(router, method, "/(user)/(stacks)/change-password");
}

export function navigateToCreatePassword({ router, method = "push" }) {
	nav(router, method, "/(user)/(stacks)/create-password");
}

export function navigateToMore({ router, method = "push" }) {
	nav(router, method, ROUTES.TAB_MORE);
}

