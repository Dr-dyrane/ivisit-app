// components/map/views/providerDetail/mapProviderDetailStage.styles.js
//
// Stage-level styles for MapProviderDetailStageBase + StageParts.
// Exact token copy of mapHospitalDetailStage.styles.js.

import { StyleSheet } from "react-native";

const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

const styles = StyleSheet.create({
	// ─── Stage scroll content (matches hospital stage token) ──────────────────
	bodyScrollContent: {
		paddingHorizontal: 14,
		paddingTop: 0,
		paddingBottom: 6,
	},

	// ─── Hero reveal frame (Animated height/opacity) ──────────────────────────
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

	// ─── Detail panel (overlaps hero) ────────────────────────────────────────
	detailPanel: {
		marginHorizontal: -14,
		paddingHorizontal: 14,
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

	// ─── Place header (mark + title + address) ────────────────────────────────
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

	// ─── Action row ───────────────────────────────────────────────────────────
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
	placeActionLabel: {
		fontSize: 13,
		lineHeight: 16,
		fontWeight: "700",
		textAlign: "center",
	},

	// ─── Stats row ────────────────────────────────────────────────────────────
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

	// ─── Info block (address / phone / website) ───────────────────────────────
	infoBlock: {
		borderTopWidth: StyleSheet.hairlineWidth,
		paddingTop: 14,
		gap: 14,
	},
	infoRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 10,
	},
	infoIcon: {
		marginTop: 1,
		flexShrink: 0,
	},
	infoText: {
		fontSize: 14,
		fontWeight: "400",
		flex: 1,
		lineHeight: 20,
	},

	// ─── Floating top slot (HALF / EXPANDED) ──────────────────────────────────
	floatingTopSlot: {
		position: "relative",
		width: "100%",
		height: 88,
		overflow: "visible",
		zIndex: 28,
		elevation: 28,
	},
	floatingTopHeader: {
		position: "absolute",
		top: 18,
		left: 16,
		right: 16,
		flexDirection: "row",
		alignItems: "center",
		zIndex: 30,
		elevation: 30,
	},
	floatingTopActionPressable: {
		width: 38,
		height: 38,
		zIndex: 31,
	},
	floatingTopActionButton: {
		width: 38,
		height: 38,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#0F172A",
		shadowOpacity: 0.12,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		...squircle(19),
	},
	floatingTopActionSpacer: {
		width: 38,
		height: 38,
	},
	floatingTopTitleWrap: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 10,
	},
	floatingTopTitle: {
		fontSize: 17,
		lineHeight: 21,
		fontWeight: "700",
		textAlign: "center",
	},
	floatingTopSubtitle: {
		marginTop: 1,
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "500",
		textAlign: "center",
	},
	floatingTopClosePressable: {
		width: 38,
		height: 38,
		zIndex: 31,
	},
	floatingTopCloseButton: {
		width: 38,
		height: 38,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#0F172A",
		shadowOpacity: 0.12,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		borderRadius: 999,
	},

	// ─── Collapsed top slot ───────────────────────────────────────────────────
	collapsedRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 14,
		paddingBottom: 4,
		paddingTop: 2,
	},
	collapsedIconButton: {
		flex: 1,
		width: 38,
		height: 38,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
		shadowColor: "#0F172A",
		shadowOpacity: 0.12,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
		borderRadius: 999,
	},
	collapsedIconButtonPrimary: {
		shadowOpacity: 0.2,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
	},
	collapsedIconButtonPressed: {
		opacity: 0.94,
		transform: [{ scale: 0.97 }],
	},
	collapsedIconButtonPressable: {
		width: 38,
		height: 38,
	},
	collapsedSummaryPressable: {
		flex: 1,
	},
	collapsedSummaryCard: {
		minHeight: 44,
		paddingHorizontal: 4,
		paddingVertical: 4,
		alignItems: "center",
		justifyContent: "center",
	},
	collapsedTitle: {
		fontSize: 16,
		lineHeight: 19,
		fontWeight: "700",
		textAlign: "center",
	},
	collapsedSubtitle: {
		marginTop: 2,
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "500",
		textAlign: "center",
	},
});

export default styles;
