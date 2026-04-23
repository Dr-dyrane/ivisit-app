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
		dangerBg: isDarkMode ? "rgba(239,68,68,0.14)" : "rgba(134,16,14,0.10)",
		dangerText: isDarkMode ? "#FCA5A5" : "#86100E",
	};
}

export function getMiniProfileTones(isDarkMode) {
	return {
		care: {
			bg: isDarkMode ? "rgba(134,16,14,0.28)" : "rgba(134,16,14,0.13)",
			icon: isDarkMode ? "#FCA5A5" : COLORS.brandPrimary,
		},
		profile: {
			bg: isDarkMode ? "rgba(248,113,113,0.22)" : "rgba(248,113,113,0.18)",
			icon: isDarkMode ? "#FCA5A5" : "#C2410C",
		},
		payment: {
			bg: isDarkMode ? "rgba(56,189,248,0.22)" : "rgba(14,165,233,0.16)",
			icon: isDarkMode ? "#7DD3FC" : "#0284C7",
		},
		contacts: {
			bg: isDarkMode ? "rgba(34,197,94,0.22)" : "rgba(34,197,94,0.14)",
			icon: isDarkMode ? "#86EFAC" : "#16A34A",
		},
		system: {
			bg: isDarkMode ? "rgba(148,163,184,0.18)" : "rgba(100,116,139,0.12)",
			icon: isDarkMode ? "#CBD5E1" : "#64748B",
		},
		map: {
			bg: isDarkMode ? "rgba(251,146,60,0.20)" : "rgba(251,146,60,0.14)",
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
			paddingHorizontal: round(clamp(horizontalInset - 16, 2, isDrawer ? 12 : 8)),
			paddingTop: round(clamp(sectionGap - 9, 0, 5)),
			paddingBottom: round(clamp(sectionGap + 6, 18, 26)),
		},
		identity: {
			avatarSize,
			marginBottom: round(clamp(sectionGap + 5, 16, 20)),
			avatarMarginBottom: round(clamp(sectionGap + 2, 14, 18)),
			nameSize: round(clamp(titleSize + 1, 26, 29)),
			nameLineHeight: round(clamp(titleSize + 6, 31, 34)),
			nameWeight: "800",
			emailSize: round(clamp((viewportMetrics?.type?.caption || 13) + 1, 14, 15)),
			emailLineHeight: 18,
			emailWeight: "600",
		},
		groups: {
			gap: round(clamp(sectionGap - 4, 8, 10)),
			radius: viewportMetrics?.radius?.card || 28,
		},
		row: {
			minHeight: 56,
			paddingLeft: 10,
			paddingRight: 8,
			orbSize: 38,
			orbGap: 16,
			iconSize: 23,
			contentGap: 10,
			labelSize: rowLabelSize,
			labelLineHeight: rowLabelSize + 5,
			labelWeight: "500",
			badgeMinHeight: 24,
			badgePaddingHorizontal: 9,
			badgeSize,
			badgeLineHeight: badgeSize + 4,
			badgeWeight: "500",
			chevronSize: 17,
		},
		signOut: {
			marginTop: round(clamp(sectionGap - 2, 10, 14)),
			minHeight: 50,
			radius: 24,
			iconSize: 20,
			textSize: rowLabelSize,
			textLineHeight: rowLabelSize + 5,
			textWeight: "500",
		},
	};
}
