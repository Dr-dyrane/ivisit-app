// history.theme.js
// Single source of truth for /map history surface theming.
//
// Design voice: MIRRORS components/map/views/tracking/mapTracking.theme.js.
//   - liquid-glass surfaces via translucent rgba (never solid hex)
//   - tracking's ctaGroupCard vocabulary for grouped lists
//   - subtle slate hairline (rgba(148,163,184,0.18)) only inside grouped containers
//   - requestType palette (ambulance / bed / visit) reusing tracking's semantic action colors
//
// Exports:
//   - buildHistoryThemeTokens({ isDarkMode, toneKey?, requestType?, surface? })
//     Returns the FULL resolved theme object consumed by history surfaces.
//   - resolveHistoryRowTone / resolveHistoryHeroTone
//     Granular STATUS tone resolvers (accent/success/warning/critical/muted).
//   - resolveRequestTypeTone
//     REQUEST-TYPE muted palette (ambulance/bed/visit) — the "muted yet functional
//     color coding for type of visits" from the legacy visit cards.
//   - HISTORY_STATUS_TONE_KEYS (re-export).

import { HISTORY_STATUS_TONE_KEYS } from "./history.content";

// ---------- Request-type muted palette (ambulance / bed / visit) ----------
// Mirrors tracking's transportActionColor / bedCareBlueColor / shareActionColor /
// infoActionColor. Orb + chip surfaces are translucent tints of the same hue.

const REQUEST_TYPE_TONE = {
	ambulance: (isDarkMode) => ({
		orb: isDarkMode ? "rgba(180,35,24,0.20)" : "rgba(180,35,24,0.10)",
		icon: isDarkMode ? "#FDA29B" : "#B42318",
		chip: isDarkMode ? "rgba(180,35,24,0.18)" : "rgba(180,35,24,0.10)",
		chipText: isDarkMode ? "#FDA29B" : "#B42318",
	}),
	bed: (isDarkMode) => ({
		orb: isDarkMode ? "rgba(56,189,248,0.18)" : "rgba(37,99,235,0.10)",
		icon: isDarkMode ? "#38BDF8" : "#2563EB",
		chip: isDarkMode ? "rgba(56,189,248,0.16)" : "rgba(37,99,235,0.10)",
		chipText: isDarkMode ? "#7DD3FC" : "#1D4ED8",
	}),
	visit: (isDarkMode) => ({
		orb: isDarkMode ? "rgba(74,222,128,0.16)" : "rgba(22,163,74,0.10)",
		icon: isDarkMode ? "#4ADE80" : "#16A34A",
		chip: isDarkMode ? "rgba(74,222,128,0.16)" : "rgba(22,163,74,0.10)",
		chipText: isDarkMode ? "#BBF7D0" : "#15803D",
	}),
	emergency: (isDarkMode) => ({
		orb: isDarkMode ? "rgba(244,63,94,0.20)" : "rgba(220,38,38,0.10)",
		icon: isDarkMode ? "#F87171" : "#DC2626",
		chip: isDarkMode ? "rgba(244,63,94,0.18)" : "rgba(220,38,38,0.10)",
		chipText: isDarkMode ? "#FDA4AF" : "#991B1B",
	}),
};

/**
 * Resolve muted palette for a visit's requestType ("ambulance" | "bed" | "visit" | "emergency").
 * Falls back to `visit` tones for unknown keys.
 */
export function resolveRequestTypeTone(requestType, isDarkMode) {
	const factory = REQUEST_TYPE_TONE[requestType] || REQUEST_TYPE_TONE.visit;
	return factory(isDarkMode);
}

// ---------- Status tone resolvers (accent / success / warning / critical / muted) ----------

const DEFAULT_ROW_TONE = (isDarkMode) => ({
	orb: isDarkMode ? "rgba(148,163,184,0.16)" : "rgba(148,163,184,0.10)",
	icon: isDarkMode ? "#CBD5E1" : "#64748B",
	chip: isDarkMode ? "rgba(148,163,184,0.14)" : "rgba(15,23,42,0.05)",
	chipText: isDarkMode ? "#CBD5E1" : "#334155",
});

const DEFAULT_HERO_TONE = DEFAULT_ROW_TONE;

/**
 * Resolve status-tone colors for list rows.
 * Prefer `requestType` palette for orb/icon; status tone owns chip.
 */
export function resolveHistoryRowTone(toneKey, isDarkMode) {
	switch (toneKey) {
		case HISTORY_STATUS_TONE_KEYS.ACCENT:
			return {
				orb: isDarkMode ? "rgba(239,68,68,0.16)" : "rgba(220,38,38,0.10)",
				icon: isDarkMode ? "#FCA5A5" : "#DC2626",
				chip: isDarkMode ? "rgba(239,68,68,0.16)" : "rgba(220,38,38,0.10)",
				chipText: isDarkMode ? "#FCA5A5" : "#991B1B",
			};
		case HISTORY_STATUS_TONE_KEYS.SUCCESS:
			return {
				orb: isDarkMode ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.10)",
				icon: isDarkMode ? "#86EFAC" : "#16A34A",
				chip: isDarkMode ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.08)",
				chipText: isDarkMode ? "#86EFAC" : "#166534",
			};
		case HISTORY_STATUS_TONE_KEYS.WARNING:
			return {
				orb: isDarkMode ? "rgba(245,158,11,0.16)" : "rgba(245,158,11,0.10)",
				icon: isDarkMode ? "#FCD34D" : "#B45309",
				chip: isDarkMode ? "rgba(245,158,11,0.14)" : "rgba(245,158,11,0.08)",
				chipText: isDarkMode ? "#FCD34D" : "#92400E",
			};
		case HISTORY_STATUS_TONE_KEYS.CRITICAL:
			return {
				orb: isDarkMode ? "rgba(244,63,94,0.16)" : "rgba(244,63,94,0.10)",
				icon: isDarkMode ? "#FDA4AF" : "#DC2626",
				chip: isDarkMode ? "rgba(244,63,94,0.14)" : "rgba(244,63,94,0.08)",
				chipText: isDarkMode ? "#FDA4AF" : "#9F1239",
			};
		case HISTORY_STATUS_TONE_KEYS.MUTED:
			return {
				orb: isDarkMode ? "rgba(148,163,184,0.16)" : "rgba(148,163,184,0.10)",
				icon: isDarkMode ? "#CBD5E1" : "#475569",
				chip: isDarkMode ? "rgba(148,163,184,0.14)" : "rgba(148,163,184,0.08)",
				chipText: isDarkMode ? "#CBD5E1" : "#475569",
			};
		default:
			return DEFAULT_ROW_TONE(isDarkMode);
	}
}

/**
 * Hero-surface tones (used by MapVisitDetailsModal hero chip).
 * Slightly higher opacity for presence in larger surfaces.
 */
export function resolveHistoryHeroTone(toneKey, isDarkMode) {
	switch (toneKey) {
		case HISTORY_STATUS_TONE_KEYS.ACCENT:
			return {
				orb: isDarkMode ? "rgba(239,68,68,0.20)" : "rgba(220,38,38,0.12)",
				icon: isDarkMode ? "#FCA5A5" : "#DC2626",
				chip: isDarkMode ? "rgba(239,68,68,0.20)" : "rgba(220,38,38,0.12)",
				chipText: isDarkMode ? "#FCA5A5" : "#991B1B",
			};
		case HISTORY_STATUS_TONE_KEYS.SUCCESS:
			return {
				orb: isDarkMode ? "rgba(34,197,94,0.20)" : "rgba(34,197,94,0.12)",
				icon: isDarkMode ? "#86EFAC" : "#16A34A",
				chip: isDarkMode ? "rgba(34,197,94,0.18)" : "rgba(34,197,94,0.10)",
				chipText: isDarkMode ? "#86EFAC" : "#166534",
			};
		case HISTORY_STATUS_TONE_KEYS.WARNING:
			return {
				orb: isDarkMode ? "rgba(245,158,11,0.20)" : "rgba(245,158,11,0.12)",
				icon: isDarkMode ? "#FCD34D" : "#B45309",
				chip: isDarkMode ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.10)",
				chipText: isDarkMode ? "#FCD34D" : "#92400E",
			};
		case HISTORY_STATUS_TONE_KEYS.CRITICAL:
			return {
				orb: isDarkMode ? "rgba(244,63,94,0.20)" : "rgba(244,63,94,0.12)",
				icon: isDarkMode ? "#FDA4AF" : "#DC2626",
				chip: isDarkMode ? "rgba(244,63,94,0.18)" : "rgba(244,63,94,0.10)",
				chipText: isDarkMode ? "#FDA4AF" : "#9F1239",
			};
		default:
			return DEFAULT_HERO_TONE(isDarkMode);
	}
}

/**
 * Build the full resolved theme object for a history surface.
 *
 * Key tokens (mirror tracking's ctaGroupCard vocabulary):
 *   - groupSurface       liquid-glass container (matches tracking.secondaryCtaSurface)
 *   - groupPaddingX      inner horizontal padding of the group container (12)
 *   - rowPaddingX        horizontal padding of grouped rows (8) — less than group because container pads
 *   - hairlineDivider    rgba(148,163,184,0.18) — matches tracking.ctaDivider
 *   - hairlineLeftInset  58 — matches tracking.ctaDivider.marginLeft; hairline auto-insets on
 *                            the right via group container's paddingHorizontal (no DM in DOM).
 *
 * @param {object} opts
 * @param {boolean} opts.isDarkMode
 * @param {string|null} [opts.toneKey]       Status tone key (accent/success/...)
 * @param {string|null} [opts.requestType]   Request type key (ambulance/bed/visit/emergency)
 * @param {"row"|"hero"} [opts.surface]      Which tone intensity maps onto `.tone`
 */
export function buildHistoryThemeTokens({
	isDarkMode,
	toneKey = null,
	requestType = null,
	surface = "row",
} = {}) {
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const bodyColor = isDarkMode ? "#CBD5E1" : "#475569";
	const groupTitleColor = isDarkMode ? "#94A3B8" : "#64748B";
	const sectionTitleColor = titleColor;
	// Liquid-glass container surface — mirrors explore_intent's strongCardSurface
	// (tokens/mapUI.tokens.js). User feedback: 0.9/light was too opaque; matching
	// the hero/summary-card surface keeps translucency consistent with the rest
	// of the /map voice.
	const groupSurface = isDarkMode
		? "rgba(255,255,255,0.08)"
		: "rgba(255,255,255,0.72)";
	// Surface used behind hero/large cards in detail views.
	const heroSurface = isDarkMode
		? "rgba(15,23,42,0.72)"
		: "rgba(255,255,255,0.9)";
	const heroTextPanelSurface = isDarkMode
		? "rgba(2,6,23,0.34)"
		: "rgba(255,255,255,0.72)";
	const heroBadgeSurface = isDarkMode
		? "rgba(255,255,255,0.14)"
		: "rgba(255,255,255,0.72)";
	const heroImageScrimColors = isDarkMode
		? ["rgba(2,6,23,0.08)", "rgba(2,6,23,0.42)", "rgba(2,6,23,0.92)"]
		: ["rgba(255,255,255,0.02)", "rgba(255,255,255,0.18)", "rgba(255,255,255,0.94)"];
	const heroImageTopMaskColors = isDarkMode
		? ["rgba(2,6,23,0.58)", "rgba(2,6,23,0.18)", "rgba(2,6,23,0)"]
		: ["rgba(255,255,255,0.78)", "rgba(255,255,255,0.18)", "rgba(255,255,255,0)"];
	const heroOnImageTitleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const heroOnImageBodyColor = isDarkMode
		? "rgba(248,250,252,0.94)"
		: "rgba(15,23,42,0.88)";
	const heroOnImageMutedColor = isDarkMode
		? "rgba(203,213,225,0.92)"
		: "rgba(51,65,85,0.84)";
	// Hairline color — identical to tracking's ctaDivider.
	const hairlineDivider = "rgba(148,163,184,0.18)";
	// Vocabulary for grouped list geometry (consumed by Row/Group/styles).
	const groupPaddingX = 12;
	const groupPaddingY = 6;
	const rowPaddingX = 8;
	const rowPaddingY = 12;
	const hairlineLeftInset = 58;

	const chevronColor = isDarkMode ? "#64748B" : "#94A3B8";
	const headerChevronColor = isDarkMode ? "#94A3B8" : "#64748B";
	const pressedOverlay = isDarkMode
		? "rgba(255,255,255,0.06)"
		: "rgba(15,23,42,0.04)";
	// Filter chip surfaces — mirror hospital list's specialty filter pills
	// (components/map/surfaces/hospitals/MapHospitalListContent.jsx):
	//   filterPillSurface / filterPillActive / filterCountText.
	// No borders in iVisit filters.
	const filterChipSurface = isDarkMode
		? "rgba(255,255,255,0.06)"
		: "rgba(15,23,42,0.05)";
	const filterChipSurfaceActive = isDarkMode
		? "rgba(134,16,14,0.18)"
		: "rgba(220,38,38,0.10)";
	const filterChipLabel = isDarkMode ? "#CBD5E1" : "#475467";
	const filterChipLabelActive = isDarkMode ? "#FDE8E8" : "#86100E";
	const filterChipCountText = isDarkMode ? "#CBD5E1" : "#475467";

	// Secondary surfaces (used in action rows, neutral buttons).
	const neutralActionSurface = isDarkMode
		? "rgba(255,255,255,0.08)"
		: "rgba(15,23,42,0.04)";
	const destructiveActionSurface = isDarkMode
		? "rgba(244,63,94,0.14)"
		: "rgba(244,63,94,0.08)";
	const destructiveActionText = isDarkMode ? "#FDA4AF" : "#BE123C";
	const skeletonBaseColor = isDarkMode
		? "rgba(255,255,255,0.08)"
		: "rgba(15,23,42,0.07)";
	const skeletonSoftColor = isDarkMode
		? "rgba(255,255,255,0.05)"
		: "rgba(15,23,42,0.05)";
	// Semantic action colors — tokenized so call sites never pass raw hex.
	// Mirror tracking's bedCareBlueColor / shareActionColor / transportActionColor.
	const actionCallColor = isDarkMode ? "#38BDF8" : "#2563EB";
	const actionVideoColor = isDarkMode ? "#C4B5FD" : "#7C3AED";
	const actionBookColor = isDarkMode ? "#4ADE80" : "#16A34A";
	const actionDirectionsColor = isDarkMode ? "#38BDF8" : "#2563EB";
	const actionRateColor = isDarkMode ? "#FCD34D" : "#B45309";

	const toneRow = toneKey
		? resolveHistoryRowTone(toneKey, isDarkMode)
		: DEFAULT_ROW_TONE(isDarkMode);
	const toneHero = toneKey
		? resolveHistoryHeroTone(toneKey, isDarkMode)
		: DEFAULT_HERO_TONE(isDarkMode);
	const toneStatus = surface === "hero" ? toneHero : toneRow;

	// Type-based muted palette (ambulance/bed/visit). Used by the leading orb
	// in list rows and by the hero orb in details.
	const toneType = requestType
		? resolveRequestTypeTone(requestType, isDarkMode)
		: null;

	// Merged: row orb/icon prefer TYPE palette; chip prefers STATUS palette.
	// This lets a row show its type at a glance while still signaling status
	// through the chip — exactly the legacy "muted yet functional" voice.
	const tone = toneType
		? {
				orb: toneType.orb,
				icon: toneType.icon,
				chip: toneStatus.chip,
				chipText: toneStatus.chipText,
			}
		: toneStatus;

	return {
		titleColor,
		mutedColor,
		bodyColor,
		groupTitleColor,
		sectionTitleColor,
		// Surfaces
		groupSurface,
		heroSurface,
		heroTextPanelSurface,
		heroBadgeSurface,
		heroImageScrimColors,
		heroImageTopMaskColors,
		heroOnImageTitleColor,
		heroOnImageBodyColor,
		heroOnImageMutedColor,
		filterChipSurface,
		filterChipSurfaceActive,
		filterChipLabel,
		filterChipLabelActive,
		filterChipCountText,
		// Group geometry vocabulary (tracking ctaGroupCard analog)
		groupPaddingX,
		groupPaddingY,
		rowPaddingX,
		rowPaddingY,
		hairlineLeftInset,
		hairlineDivider,
		// Interaction
		pressedOverlay,
		chevronColor,
		headerChevronColor,
		// Action surfaces
		neutralActionSurface,
		destructiveActionSurface,
		destructiveActionText,
		skeletonBaseColor,
		skeletonSoftColor,
		// Semantic action colors
		actionCallColor,
		actionVideoColor,
		actionBookColor,
		actionDirectionsColor,
		actionRateColor,
		// Tones
		tone,
		toneRow,
		toneHero,
		toneStatus,
		toneType,
	};
}

export { HISTORY_STATUS_TONE_KEYS };

export default buildHistoryThemeTokens;
