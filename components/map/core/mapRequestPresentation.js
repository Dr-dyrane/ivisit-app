const UUID_LIKE_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function formatMapRequestDisplayId(value, { uuidPrefix = "REQ" } = {}) {
	if (value == null) return null;
	const raw = String(value).trim();
	if (!raw) return null;

	if (UUID_LIKE_PATTERN.test(raw)) {
		return `${uuidPrefix}-${raw.slice(-6).toUpperCase()}`;
	}

	return raw.toUpperCase();
}

export default {
	formatMapRequestDisplayId,
};
