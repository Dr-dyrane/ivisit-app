import { COLORS } from "../../../constants/colors";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value) => Math.round(value);

export function buildDisplayName(user) {
	const fullName = String(user?.fullName || "").trim();
	if (fullName) return fullName;

	const parts = [user?.firstName, user?.lastName]
		.map((value) => String(value || "").trim())
		.filter(Boolean);
	if (parts.length > 0) return parts.join(" ");

	const username = String(user?.username || "").trim();
	if (username) return username;

	return null;
}

export function formatCountBadge(count, emptyLabel = "Add") {
	const value = Number(count);
	if (!Number.isFinite(value) || value <= 0) return emptyLabel;
	return String(Math.round(value));
}

export function getMiniProfileColors(isDarkMode) {
	return {
		text: isDarkMode ? "#F8FAFC" : "#101827",
		muted: isDarkMode ? "#A7B1C2" : "#687386",
		subtle: isDarkMode ? "#737D90" : "#8791A2",
		card: isDarkMode ? "rgba(255,255,255,0.065)" : "rgba(15,23,42,0.055)",
		cardStrong: isDarkMode ? "rgba(255,255,255,0.082)" : "rgba(15,23,42,0.07)",
		divider: isDarkMode ? "rgba(255,255,255,0.09)" : "rgba(15,23,42,0.09)",
		badge: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
		badgeText: isDarkMode ? "#D9E2F1" : "#475569",
		dangerBg: isDarkMode ? "rgba(239,68,68,0.11)" : "rgba(15,23,42,0.05)",
		dangerText: isDarkMode ? "#FCA5A5" : "#64748B",
		pressBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)",
	};
}

export function getMiniProfileTones(isDarkMode) {
	// desaturate icons slightly + softer accent tones
	return {
		care: {
			bg: isDarkMode ? "rgba(134,16,14,0.22)" : "rgba(134,16,14,0.11)",
			icon: isDarkMode ? "#F87171" : COLORS.brandPrimary,
		},
		profile: {
			bg: isDarkMode ? "rgba(248,113,113,0.18)" : "rgba(248,113,113,0.14)",
			icon: isDarkMode ? "#FCA5A5" : "#C2410C",
		},
		payment: {
			bg: isDarkMode ? "rgba(56,189,248,0.18)" : "rgba(14,165,233,0.13)",
			icon: isDarkMode ? "#7DD3FC" : "#0284C7",
		},
		contacts: {
			bg: isDarkMode ? "rgba(34,197,94,0.18)" : "rgba(34,197,94,0.12)",
			icon: isDarkMode ? "#86EFAC" : "#16A34A",
		},
		system: {
			bg: isDarkMode ? "rgba(148,163,184,0.14)" : "rgba(100,116,139,0.10)",
			icon: isDarkMode ? "#CBD5E1" : "#64748B",
		},
		map: {
			bg: isDarkMode ? "rgba(251,146,60,0.16)" : "rgba(251,146,60,0.12)",
			icon: isDarkMode ? "#FDBA74" : "#EA580C",
		},
	};
}

export function getMiniProfileLayout(viewportMetrics, { preferDrawerPresentation = false } = {}) {
	const sectionGap = viewportMetrics?.insets?.sectionGap || 12;
	const horizontalInset = viewportMetrics?.insets?.horizontal || 20;
	const bodySize = viewportMetrics?.type?.body || 16;
	const titleSize = viewportMetrics?.type?.headerTitle || 26;
	const isDrawer = Boolean(preferDrawerPresentation);
	const rowLabelSize = round(clamp(bodySize + 1, 17, 19));
	const badgeSize = round(clamp(rowLabelSize - 4, 13, 14));
	const avatarSize = round(clamp(isDrawer ? 82 : 78, 76, 84));

	return {
		content: {
			paddingHorizontal: round(clamp(horizontalInset - 8, 8, 12)), // restored native-like padding
			paddingTop: round(clamp(sectionGap - 9, 0, 5)),
			paddingBottom: round(clamp(sectionGap + 6, 18, 26)),
		},
		identity: {
			avatarSize,
			horizontalMargin: 0, // now governed by content padding
			marginBottom: round(clamp(sectionGap + 8, 20, 24)),
			avatarMarginBottom: round(clamp(sectionGap + 4, 14, 16)),
			nameSize: round(clamp(titleSize + 1, 26, 29)),
			nameLineHeight: round(clamp(titleSize + 6, 31, 34)),
			nameWeight: "800",
			emailSize: round(clamp((viewportMetrics?.type?.caption || 13) + 1, 14, 15)),
			emailLineHeight: 18,
			emailWeight: "600",
		},
		groups: {
			gap: round(clamp(sectionGap + 2, 14, 18)),
			horizontalMargin: 0, // governed by content padding
			radius: viewportMetrics?.radius?.card || 28,
		},
		row: {
			minHeight: 56,
			paddingLeft: 16,
			paddingRight: 12,
			orbSize: 38,
			orbGap: 16,
			iconSize: 23,
			contentGap: 10,
			labelSize: rowLabelSize,
			labelLineHeight: rowLabelSize + 5,
			labelWeight: "500",
			badgeMinHeight: 24,
			badgePaddingHorizontal: 10,
			badgeSize,
			badgeLineHeight: badgeSize + 4,
			badgeWeight: "600",
			chevronSize: 17,
		},
		signOut: {
			marginTop: round(clamp(sectionGap + 12, 24, 28)),
			horizontalMargin: 0, // governed by content padding
			minHeight: 50,
			radius: 24,
			iconSize: 20,
			textSize: rowLabelSize,
			textLineHeight: rowLabelSize + 5,
			textWeight: "500",
		},
	};
}






