// Pure helpers for the single protected route that auth may resume.

export const PROTECTED_VISIT_ROUTE_PATH = "/(user)";
export const PROTECTED_VISIT_SHEET = "visit_detail";

const AUTH_RETURN_ROUTE_MAX_LENGTH = 256;
const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readSingleString(value) {
	if (Array.isArray(value)) {
		if (value.length !== 1) return null;
		return readSingleString(value[0]);
	}

	return typeof value === "string" ? value : null;
}

function normalizeProtectedPath(pathname) {
	if (typeof pathname !== "string") return null;

	const trimmedPath = pathname.trim();
	if (trimmedPath === PROTECTED_VISIT_ROUTE_PATH) {
		return PROTECTED_VISIT_ROUTE_PATH;
	}
	if (trimmedPath === `${PROTECTED_VISIT_ROUTE_PATH}/`) {
		return PROTECTED_VISIT_ROUTE_PATH;
	}
	if (trimmedPath === "(user)" || trimmedPath === "(user)/") {
		return PROTECTED_VISIT_ROUTE_PATH;
	}

	return null;
}

function normalizeVisitKey(value) {
	const visitKey = readSingleString(value);
	if (!visitKey || !UUID_PATTERN.test(visitKey)) return null;
	return visitKey.toLowerCase();
}

/**
 * Build the only protected route that may cross the auth boundary.
 */
export function buildProtectedVisitReturnRoute(pathname, params = {}) {
	if (!normalizeProtectedPath(pathname)) return null;

	const mapSheet = readSingleString(params?.mapSheet);
	const visitKey = normalizeVisitKey(params?.visitKey);
	if (mapSheet !== PROTECTED_VISIT_SHEET || !visitKey) return null;

	return `${PROTECTED_VISIT_ROUTE_PATH}?mapSheet=${PROTECTED_VISIT_SHEET}&visitKey=${visitKey}`;
}

/**
 * Validate stored input and rebuild it instead of forwarding arbitrary text.
 */
export function normalizeProtectedAuthReturnRoute(route) {
	if (typeof route !== "string") return null;

	const trimmedRoute = route.trim();
	if (
		!trimmedRoute ||
		trimmedRoute.length > AUTH_RETURN_ROUTE_MAX_LENGTH ||
		!trimmedRoute.startsWith("/") ||
		trimmedRoute.startsWith("//") ||
		trimmedRoute.includes("\\") ||
		trimmedRoute.includes("#")
	) {
		return null;
	}

	const queryIndex = trimmedRoute.indexOf("?");
	if (queryIndex <= 0 || queryIndex !== trimmedRoute.lastIndexOf("?")) {
		return null;
	}

	const pathname = trimmedRoute.slice(0, queryIndex);
	const query = trimmedRoute.slice(queryIndex + 1);
	if (!query) return null;

	const searchParams = new URLSearchParams(query);
	const keys = Array.from(searchParams.keys());
	if (
		keys.length !== 2 ||
		searchParams.getAll("mapSheet").length !== 1 ||
		searchParams.getAll("visitKey").length !== 1 ||
		keys.some((key) => key !== "mapSheet" && key !== "visitKey")
	) {
		return null;
	}

	return buildProtectedVisitReturnRoute(pathname, {
		mapSheet: searchParams.get("mapSheet"),
		visitKey: searchParams.get("visitKey"),
	});
}

export function isProtectedAuthReturnRoute(route) {
	return normalizeProtectedAuthReturnRoute(route) !== null;
}
