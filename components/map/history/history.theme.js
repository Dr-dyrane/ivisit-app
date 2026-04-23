// history.theme.js
// Shared status-tone tokens for /map history surfaces.
//
// Two named variants by intensity:
//   - resolveHistoryRowTone  : subtler tones for list rows (MapRecentVisitsModal)
//   - resolveHistoryHeroTone : stronger tones for hero detail surface (MapVisitDetailsModal)
//
// Both accept the same tone key space so status semantics stay consistent
// across surfaces even when visual emphasis differs.

// PULLBACK NOTE: Centralized history status-tone tokens
// OLD: getTone / getToneColors duplicated inline in MapVisitDetailsModal.jsx and MapRecentVisitsModal.jsx
// NEW: single source of truth under components/map/history/history.theme.js

export const HISTORY_STATUS_TONE_KEYS = Object.freeze({
	ACCENT: "accent",
	SUCCESS: "success",
	WARNING: "warning",
	CRITICAL: "critical",
	MUTED: "muted",
	DEFAULT: "default",
});

const DEFAULT_ROW_TONE = (isDarkMode) => ({
	orb: isDarkMode ? "rgba(56, 189, 248, 0.16)" : "rgba(56, 189, 248, 0.10)",
	icon: "#38BDF8",
	chip: isDarkMode ? "rgba(148, 163, 184, 0.14)" : "rgba(15, 23, 42, 0.05)",
	chipText: isDarkMode ? "#CBD5E1" : "#334155",
});

const DEFAULT_HERO_TONE = (isDarkMode) => ({
	orb: isDarkMode ? "rgba(56,189,248,0.18)" : "rgba(56,189,248,0.10)",
	icon: "#38BDF8",
	chip: isDarkMode ? "rgba(148,163,184,0.16)" : "rgba(15,23,42,0.05)",
	chipText: isDarkMode ? "#CBD5E1" : "#334155",
});

/**
 * Resolve status-tone colors for /map history LIST ROW surfaces.
 * Lower opacity values; keeps row-level visual restraint.
 */
export function resolveHistoryRowTone(tone, isDarkMode) {
	switch (tone) {
		case HISTORY_STATUS_TONE_KEYS.ACCENT:
			return {
				orb: isDarkMode ? "rgba(239, 68, 68, 0.16)" : "rgba(220, 38, 38, 0.12)",
				icon: "#DC2626",
				chip: isDarkMode ? "rgba(239, 68, 68, 0.16)" : "rgba(220, 38, 38, 0.10)",
				chipText: isDarkMode ? "#FCA5A5" : "#991B1B",
			};
		case HISTORY_STATUS_TONE_KEYS.SUCCESS:
			return {
				orb: isDarkMode ? "rgba(34, 197, 94, 0.16)" : "rgba(34, 197, 94, 0.10)",
				icon: "#22C55E",
				chip: isDarkMode ? "rgba(34, 197, 94, 0.16)" : "rgba(34, 197, 94, 0.10)",
				chipText: isDarkMode ? "#86EFAC" : "#166534",
			};
		case HISTORY_STATUS_TONE_KEYS.WARNING:
			return {
				orb: isDarkMode ? "rgba(245, 158, 11, 0.16)" : "rgba(245, 158, 11, 0.12)",
				icon: "#F59E0B",
				chip: isDarkMode ? "rgba(245, 158, 11, 0.16)" : "rgba(245, 158, 11, 0.10)",
				chipText: isDarkMode ? "#FCD34D" : "#92400E",
			};
		case HISTORY_STATUS_TONE_KEYS.CRITICAL:
			return {
				orb: isDarkMode ? "rgba(251, 113, 133, 0.16)" : "rgba(244, 63, 94, 0.10)",
				icon: "#F43F5E",
				chip: isDarkMode ? "rgba(251, 113, 133, 0.16)" : "rgba(244, 63, 94, 0.10)",
				chipText: isDarkMode ? "#FDA4AF" : "#9F1239",
			};
		case HISTORY_STATUS_TONE_KEYS.MUTED:
			return {
				orb: isDarkMode ? "rgba(148, 163, 184, 0.16)" : "rgba(148, 163, 184, 0.12)",
				icon: isDarkMode ? "#CBD5E1" : "#475569",
				chip: isDarkMode ? "rgba(148, 163, 184, 0.14)" : "rgba(148, 163, 184, 0.10)",
				chipText: isDarkMode ? "#CBD5E1" : "#475569",
			};
		default:
			return DEFAULT_ROW_TONE(isDarkMode);
	}
}

/**
 * Resolve status-tone colors for /map history HERO surfaces.
 * Slightly higher opacity values for visual presence in detail/hero cards.
 * Intentionally does not include `muted` \u2014 hero surfaces should declare state clearly.
 */
export function resolveHistoryHeroTone(tone, isDarkMode) {
	switch (tone) {
		case HISTORY_STATUS_TONE_KEYS.ACCENT:
			return {
				orb: isDarkMode ? "rgba(239,68,68,0.18)" : "rgba(220,38,38,0.10)",
				icon: "#DC2626",
				chip: isDarkMode ? "rgba(239,68,68,0.18)" : "rgba(220,38,38,0.10)",
				chipText: isDarkMode ? "#FCA5A5" : "#991B1B",
			};
		case HISTORY_STATUS_TONE_KEYS.SUCCESS:
			return {
				orb: isDarkMode ? "rgba(34,197,94,0.18)" : "rgba(34,197,94,0.10)",
				icon: "#22C55E",
				chip: isDarkMode ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.10)",
				chipText: isDarkMode ? "#86EFAC" : "#166534",
			};
		case HISTORY_STATUS_TONE_KEYS.WARNING:
			return {
				orb: isDarkMode ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.10)",
				icon: "#F59E0B",
				chip: isDarkMode ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.10)",
				chipText: isDarkMode ? "#FCD34D" : "#92400E",
			};
		case HISTORY_STATUS_TONE_KEYS.CRITICAL:
			return {
				orb: isDarkMode ? "rgba(244,63,94,0.18)" : "rgba(244,63,94,0.10)",
				icon: "#F43F5E",
				chip: isDarkMode ? "rgba(244,63,94,0.18)" : "rgba(244,63,94,0.10)",
				chipText: isDarkMode ? "#FDA4AF" : "#9F1239",
			};
		default:
			return DEFAULT_HERO_TONE(isDarkMode);
	}
}
