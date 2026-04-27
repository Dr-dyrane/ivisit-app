import { COLORS } from "../../../../constants/colors";

export function buildTrackingThemeTokens({
	isDarkMode,
	stageMetrics,
	triageIsComplete,
	triageAnsweredCount,
	telemetryHeroTone,
	routeVisualProgress = 0,
	trackingKind,
	isBottomCompletionAction,
}) {
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "rgba(226,232,240,0.78)" : "#64748B";
	const surfaceColor = isDarkMode ? "rgba(15,23,42,0.74)" : "rgba(255,255,255,0.88)";
	const elevatedSurfaceColor = isDarkMode
		? "rgba(8,15,27,0.88)"
		: "rgba(255,255,255,0.96)";
	const actionSurfaceColor = isDarkMode
		? "rgba(255,255,255,0.07)"
		: "rgba(255,255,255,0.82)";
	const triageProgressTone = triageIsComplete
		? "complete"
		: triageAnsweredCount > 0
			? "partial"
			: "empty";
	const triageActionSurface =
		triageProgressTone === "complete"
			? isDarkMode
				? "rgba(34,197,94,0.18)"
				: "rgba(22,163,74,0.12)"
			: triageProgressTone === "partial"
				? isDarkMode
					? "rgba(245,158,11,0.20)"
					: "rgba(245,158,11,0.14)"
				: isDarkMode
					? "rgba(180,35,24,0.18)"
					: "rgba(180,35,24,0.10)";
	const triageActionIconColor =
		triageProgressTone === "complete"
			? isDarkMode
				? "#86EFAC"
				: "#16A34A"
			: triageProgressTone === "partial"
				? isDarkMode
					? "#FCD34D"
					: "#D97706"
				: COLORS.brandPrimary;
	const triageTrackColor =
		triageProgressTone === "complete"
			? isDarkMode
				? "rgba(134,239,172,0.24)"
				: "rgba(22,163,74,0.20)"
			: triageProgressTone === "partial"
				? isDarkMode
					? "rgba(252,211,77,0.22)"
					: "rgba(217,119,6,0.18)"
				: isDarkMode
					? "rgba(180,35,24,0.22)"
					: "rgba(180,35,24,0.16)";
	const routeGradientColors = isDarkMode
		? [
				"rgba(255,255,255,0.04)",
				"rgba(255,255,255,0.00)",
				"rgba(255,255,255,0.02)",
			]
		: [
				"rgba(15,23,42,0.02)",
				"rgba(15,23,42,0.00)",
				"rgba(15,23,42,0.03)",
			];
	const detailGradientColors = isDarkMode
		? ["rgba(255,255,255,0.03)", "rgba(255,255,255,0.01)"]
		: ["rgba(248,250,252,0.92)", "rgba(255,255,255,0.82)"];
	const routeFadeColors = isDarkMode
		? ["rgba(15,23,42,0.00)", "rgba(15,23,42,0.92)"]
		: ["rgba(255,255,255,0.00)", "rgba(255,255,255,0.98)"];
	const requestSurfaceColor = isDarkMode
		? "rgba(255,255,255,0.08)"
		: "rgba(255,255,255,0.88)";
	const connectorTrackColor = isDarkMode
		? "rgba(255,255,255,0.14)"
		: "rgba(15,23,42,0.12)";
	const connectorProgressColor = isDarkMode
		? "rgba(252,165,165,0.84)"
		: "rgba(180,35,24,0.78)";
	const teamHeroSurface = isDarkMode
		? "rgba(15,23,42,0.72)"
		: "rgba(255,255,255,0.9)";
	// PULLBACK NOTE: Phase G — G-2 (Status palette refinement).
	// OLD: ambulance hero progress fill was iVisit-red tinted, signalling "alarm"
	//      throughout the entire normal trip even when nothing was wrong.
	// NEW: ambulance + bed both use the calm `accent` (sky) tint during normal
	//      operation. Red is reserved for `critical` / `warning` telemetry tones
	//      handled by `teamHeroWarningProgressColor` below — so the user only
	//      sees red when something actually warrants attention.
	const teamHeroProgressColor =
		trackingKind === "bed"
			? isDarkMode
				? "rgba(56,189,248,0.30)"
				: "rgba(37,99,235,0.14)"
			: isDarkMode
				? "rgba(56,189,248,0.30)"
				: "rgba(14,165,233,0.18)";
	const teamHeroWarningSurface =
		telemetryHeroTone === "critical"
			? isDarkMode
				? "rgba(69,10,10,0.72)"
				: "rgba(254,226,226,0.94)"
			: telemetryHeroTone === "warning"
				? isDarkMode
					? "rgba(69,42,10,0.72)"
					: "rgba(254,243,199,0.94)"
				: teamHeroSurface;
	const teamHeroWarningProgressColor =
		telemetryHeroTone === "critical"
			? isDarkMode
				? "rgba(239,68,68,0.24)"
				: "rgba(239,68,68,0.16)"
			: telemetryHeroTone === "warning"
				? isDarkMode
					? "rgba(251,191,36,0.20)"
					: "rgba(251,191,36,0.14)"
				: teamHeroProgressColor;
	// PULLBACK NOTE: Phase G — visual hierarchy correction.
	// OLD: red brand-tinted surface competed with the (now calm) hero card and
	//      pulled the eye away from the primary progress channel. The CTA group
	//      read as a second hero, breaking Apple HIG single-focal-point discipline.
	// NEW: near-transparent neutral elevation surface — sits quietly beneath the
	//      hero card so the user's eye flows hero → CTA group → bottom action
	//      without colour whiplash.
	const secondaryCtaSurface = isDarkMode
		? "rgba(255,255,255,0.04)"
		: "rgba(15,23,42,0.04)";
	const stopIconSurface = isDarkMode
		? "rgba(255,255,255,0.07)"
		: "rgba(248,250,252,0.92)";
	const hospitalIconSurfaceColor =
		trackingKind === "ambulance"
			? isDarkMode
				? `rgba(180,35,24,${(0.14 + (1 - routeVisualProgress) * 0.1).toFixed(3)})`
				: `rgba(180,35,24,${(0.1 + (1 - routeVisualProgress) * 0.08).toFixed(3)})`
			: stopIconSurface;
	const pickupIconSurfaceColor =
		trackingKind === "ambulance"
			? isDarkMode
				? `rgba(180,35,24,${(0.08 + routeVisualProgress * 0.24).toFixed(3)})`
				: `rgba(180,35,24,${(0.06 + routeVisualProgress * 0.2).toFixed(3)})`
			: stopIconSurface;
	const bedCareBlueColor = isDarkMode ? "#38BDF8" : "#2563EB";
	const shareActionColor = isDarkMode ? "#4ADE80" : "#16A34A";
	const transportActionColor = isDarkMode ? "#FDA29B" : "#B42318";
	const infoActionColor = isDarkMode ? "#FDA29B" : "#B42318";
	const routeCardRadius = stageMetrics?.route?.cardStyle?.borderRadius || 28;
	const detailCardRadius = stageMetrics?.panel?.cardStyle?.borderRadius || 26;
	const bottomActionGradientColors = isBottomCompletionAction
		? isDarkMode
			? ["#941412", COLORS.brandPrimary]
			: ["#A11412", COLORS.brandPrimary]
		: isDarkMode
			? ["rgba(92,24,28,0.9)", "rgba(54,18,22,0.94)"]
			: ["rgba(180,35,24,0.18)", "rgba(180,35,24,0.11)"];
	const bottomActionTextColor = isBottomCompletionAction
		? "#FFFFFF"
		: isDarkMode
			? "#FECACA"
			: "#9F1D18";

	return {
		titleColor,
		mutedColor,
		surfaceColor,
		elevatedSurfaceColor,
		actionSurfaceColor,
		triageActionSurface,
		triageActionIconColor,
		triageRingColor: triageActionIconColor,
		triageTrackColor,
		routeGradientColors,
		detailGradientColors,
		routeFadeColors,
		requestSurfaceColor,
		connectorTrackColor,
		connectorProgressColor,
		teamHeroWarningSurface,
		teamHeroWarningProgressColor,
		secondaryCtaSurface,
		hospitalIconSurfaceColor,
		pickupIconSurfaceColor,
		bedCareBlueColor,
		shareActionColor,
		transportActionColor,
		infoActionColor,
		routeCardRadius,
		detailCardRadius,
		bottomActionGradientColors,
		bottomActionTextColor,
		bottomActionSpinnerColor: bottomActionTextColor,
	};
}

export default buildTrackingThemeTokens;
