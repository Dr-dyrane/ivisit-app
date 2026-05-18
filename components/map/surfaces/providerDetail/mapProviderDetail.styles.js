// components/map/surfaces/providerDetail/mapProviderDetail.styles.js
//
// Mirrors hospital_detail's chassis tokens (hero, place header, action row,
// stats card). Every shared shape uses `squircle()` with `borderCurve: "continuous"`
// per MAP_SHEET_IMPLEMENTATION_NOTES_V1.md §11. Section content cards are
// rendered by the shared TrackingDetailsCard primitive — not styled here.

import { StyleSheet } from "react-native";

const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

export const styles = StyleSheet.create({
	// ── Outer container ──────────────────────────────────────────────────────
	scrollContent: {
		paddingHorizontal: 0,
		paddingBottom: 24,
		gap: 12,
	},

	// ── Hero (mirrors mapHospitalDetail.styles `hero` / `expandedHero`) ──────
	heroRevealFrame: {
		overflow: "hidden",
		marginHorizontal: -14,
	},
	hero: {
		height: 270,
		marginTop: 0,
		marginHorizontal: 0,
		overflow: "hidden",
		justifyContent: "space-between",
		borderTopLeftRadius: 34,
		borderTopRightRadius: 34,
		borderCurve: "continuous",
	},
	heroFallback: {
		// Neutral charcoal/cream wash for providers without an image.
		// The provider tint is applied as a soft top mask only — never a
		// full saturated background.
		flex: 1,
	},
	heroBlend: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		height: 168,
		zIndex: 1,
	},
	heroBottomMerge: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		height: 126,
		zIndex: 1,
	},
	heroTopMask: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 0,
		height: 104,
		zIndex: 1,
	},
	heroTintWash: {
		// Subtle provider-tint accent — only used when no image fallback.
		position: "absolute",
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		opacity: 0.18,
		zIndex: 0,
	},
	heroBadgeRow: {
		paddingTop: 34,
		paddingHorizontal: 14,
		paddingRight: 62,
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 6,
		zIndex: 2,
	},
	heroBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		paddingHorizontal: 9,
		paddingVertical: 6,
		...squircle(999),
	},
	heroBadgeText: {
		fontSize: 10,
		lineHeight: 13,
		fontWeight: "700",
		color: "#F8FAFC",
	},
	heroFooter: {
		height: 44,
	},

	// ── Expanded hero (revealHero === true) ──────────────────────────────────
	expandedCardWrap: {
		marginHorizontal: -14,
		overflow: "visible",
	},
	expandedHero: {
		height: 320,
		justifyContent: "space-between",
		zIndex: 1,
	},
	expandedHeroTopMask: {
		position: "absolute",
		left: 0,
		right: 0,
		top: 0,
		height: 118,
		zIndex: 1,
	},
	expandedHeroBottomMerge: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		height: 144,
		zIndex: 1,
	},
	expandedHeroBadgeRow: {
		paddingTop: 34,
		paddingHorizontal: 14,
		paddingRight: 62,
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 6,
		zIndex: 2,
	},
	expandedHeaderBlock: {
		paddingHorizontal: 20,
		paddingBottom: 10,
		alignItems: "center",
	},
	expandedHeaderMeasure: {
		width: "100%",
		alignItems: "center",
	},
	expandedPlaceMark: {
		width: 64,
		height: 64,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 10,
		shadowColor: "#0F172A",
		shadowOpacity: 0.22,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 10 },
		...squircle(19),
	},
	expandedPlaceTitle: {
		fontSize: 22,
		lineHeight: 27,
		fontWeight: "700",
		textAlign: "center",
		letterSpacing: -0.2,
	},
	expandedPlaceSubtitle: {
		marginTop: 2,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "500",
		textAlign: "center",
		paddingHorizontal: 10,
	},
	expandedBody: {
		position: "relative",
		zIndex: 2,
		paddingHorizontal: 14,
		paddingTop: 8,
		paddingBottom: 20,
		gap: 12,
	},

	// ── Detail panel (collapses underneath the hero) ─────────────────────────
	detailPanel: {
		marginTop: -76,
		marginHorizontal: -14,
		paddingHorizontal: 14,
		paddingTop: 46,
		paddingBottom: 20,
		gap: 12,
		overflow: "visible",
		shadowColor: "#0F172A",
		shadowOpacity: 0.08,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: -6 },
		...squircle(34),
	},
	detailPanelContent: {
		gap: 12,
	},
	placeHeaderReveal: {
		overflow: "hidden",
	},
	placeHeader: {
		alignItems: "center",
		paddingHorizontal: 16,
		gap: 4,
	},
	placeMark: {
		width: 64,
		height: 64,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 6,
		shadowColor: "#0F172A",
		shadowOpacity: 0.22,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 10 },
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.24)",
		...squircle(19),
	},
	placeTitle: {
		fontSize: 23,
		lineHeight: 28,
		fontWeight: "700",
		textAlign: "center",
		letterSpacing: -0.2,
	},
	placeSubtitle: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "500",
		textAlign: "center",
		paddingHorizontal: 10,
	},

	// ── Action row (4 slots) ─────────────────────────────────────────────────
	placeActionRow: {
		flexDirection: "row",
		gap: 7,
		paddingHorizontal: 0,
	},
	placeActionPressable: {
		flex: 1,
		minWidth: 0,
	},
	placeActionButton: {
		minHeight: 42,
		paddingHorizontal: 7,
		paddingVertical: 3,
		alignItems: "center",
		justifyContent: "center",
		gap: 2,
		...squircle(14),
	},
	placeActionButtonPrimary: {
		shadowOpacity: 0.22,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
	},
	placeActionButtonPressed: {
		opacity: 0.94,
		transform: [{ scale: 0.985 }],
	},
	placeActionButtonDisabled: {
		opacity: 0.48,
	},
	placeActionLabel: {
		fontSize: 13,
		lineHeight: 16,
		fontWeight: "700",
		textAlign: "center",
	},

	// ── Stats card (mirrors hospital placeStatsCard) ─────────────────────────
	placeStatsCard: {
		marginTop: 6,
		marginBottom: 10,
		paddingHorizontal: 10,
		paddingVertical: 0,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 22,
	},
	placeStatItem: {
		alignItems: "center",
		gap: 4,
		minWidth: 58,
	},
	placeStatLabel: {
		fontSize: 10,
		lineHeight: 12,
		fontWeight: "500",
	},
	placeStatValueRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 4,
	},
	placeStatValue: {
		fontSize: 13,
		lineHeight: 16,
		fontWeight: "700",
	},

	// ── Sections stack ───────────────────────────────────────────────────────
	sectionsStack: {
		gap: 10,
		marginTop: 4,
	},

	// ── Skeleton (loading provider) ──────────────────────────────────────────
	skeletonHero: {
		height: 270,
		marginHorizontal: -14,
		borderTopLeftRadius: 34,
		borderTopRightRadius: 34,
		borderCurve: "continuous",
	},
	skeletonPanel: {
		marginTop: -76,
		marginHorizontal: -14,
		paddingHorizontal: 14,
		paddingTop: 46,
		paddingBottom: 20,
		gap: 12,
		...squircle(34),
	},
	skeletonPlaceMark: {
		width: 64,
		height: 64,
		alignSelf: "center",
		marginBottom: 8,
		...squircle(19),
	},
	skeletonTitleBar: {
		height: 22,
		alignSelf: "center",
		width: "62%",
		...squircle(999),
	},
	skeletonSubtitleBar: {
		height: 12,
		alignSelf: "center",
		width: "44%",
		marginTop: 6,
		...squircle(999),
	},
	skeletonActionRow: {
		flexDirection: "row",
		gap: 7,
		marginTop: 14,
	},
	skeletonActionTile: {
		flex: 1,
		height: 42,
		...squircle(14),
	},
	skeletonSectionCard: {
		height: 120,
		marginTop: 8,
		...squircle(26),
	},
});
