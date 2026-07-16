import { Platform, StyleSheet } from "react-native";
import { COLORS } from "../../../../constants/colors";

const HERO_TITLE_TEXT = Platform.select({
	ios: { fontSize: 22, lineHeight: 26, fontWeight: "700", letterSpacing: -0.45 },
	android: { fontSize: 22, lineHeight: 26, fontWeight: "700", letterSpacing: -0.45 },
	web: { fontSize: 21, lineHeight: 25, fontWeight: "700", letterSpacing: -0.3 },
	default: { fontSize: 22, lineHeight: 26, fontWeight: "700", letterSpacing: -0.45 },
});

const styles = StyleSheet.create({
	bodyContent: {
		paddingBottom: 28,
	},
	webWideContentInset: {
		paddingHorizontal: 20,
	},
	topSlot: {
		paddingHorizontal: 12,
		paddingTop: 4,
		paddingBottom: 10,
	},
	webWideTopSlotInset: {
		paddingHorizontal: 18,
	},
	midSwitchSpacingTop: {
		height: 0,
	},
	midSwitchSpacingBottom: {
		height: 14,
	},
	sectionGap: {
		height: 14,
	},
	heroCard: {
		borderRadius: 28,
		borderCurve: "continuous",
		paddingHorizontal: 16,
		paddingTop: 13,
		paddingBottom: 13,
		minHeight: 158,
		overflow: "hidden",
	},
	heroPressable: {
		borderRadius: 28,
	},
	heroArtworkLayer: {
		position: "absolute",
		right: -10,
		bottom: -4,
		left: 48,
		top: 6,
		alignItems: "center",
		justifyContent: "center",
	},
	heroHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-end",
		marginBottom: 9,
		zIndex: 2,
	},
	heroDetailChip: {
		width: 30,
		height: 30,
		alignItems: "center",
		justifyContent: "center",
	},
	heroDetailChipText: {
		fontSize: 12,
		lineHeight: 14,
		fontWeight: "500",
	},
	heroRow: {
		flexDirection: "row",
		alignItems: "flex-end",
		zIndex: 2,
	},
	heroCopy: {
		flex: 1,
		paddingRight: 16,
		maxWidth: "58%",
	},
	heroTitle: {
		...HERO_TITLE_TEXT,
	},
	heroTitleFade: {
		alignSelf: "stretch",
	},
	heroSummary: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: "500",
	},
	heroMetaRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginTop: 11,
	},
	metaPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		height: 30,
		paddingHorizontal: 11,
		borderRadius: 15,
		borderCurve: "continuous",
	},
	metaLabel: {
		fontSize: 12,
		lineHeight: 14,
		fontWeight: "500",
	},
	switchRow: {
		flexDirection: "row",
		alignItems: "stretch",
		gap: 8,
		width: "100%",
	},
	switchPill: {
		minHeight: 42,
		flex: 1,
		minWidth: 0,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 16,
		borderCurve: "continuous",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		gap: 1,
		position: "relative",
	},
	switchPillLabel: {
		fontSize: 11,
		lineHeight: 12,
		fontWeight: "400",
		textAlign: "center",
		flexShrink: 1,
		maxWidth: "100%",
	},
	switchPillLabelFade: {
		alignSelf: "stretch",
	},
	routeCard: {
		borderRadius: 26,
		borderCurve: "continuous",
		paddingHorizontal: 16,
		paddingVertical: 10,
	},
	routeRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	routeTrack: {
		alignItems: "center",
		marginRight: 12,
	},
	routeNode: {
		width: 32,
		height: 32,
		borderRadius: 12,
		borderCurve: "continuous",
		alignItems: "center",
		justifyContent: "center",
	},
	routeConnector: {
		width: 2,
		height: 26,
		borderRadius: 999,
		marginVertical: 3,
	},
	routeStops: {
		flex: 1,
		minWidth: 0,
	},
	routeStop: {
		minHeight: 28,
		justifyContent: "center",
	},
	routeStopGap: {
		height: 18,
	},
	routeStopTitle: {
		fontSize: Platform.OS === "web" ? 15 : 16,
		lineHeight: Platform.OS === "web" ? 18 : 19,
		fontWeight: Platform.OS === "web" ? "500" : "500",
		letterSpacing: -0.18,
		marginBottom: 1,
	},
	routeStopMetaWrap: {
		position: "relative",
		paddingRight: 18,
		minWidth: 0,
	},
	routeStopMeta: {
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "400",
	},
	routeMetrics: {
		marginLeft: 10,
		alignItems: "flex-end",
		justifyContent: "center",
		maxWidth: 82,
	},
	routeActionButton: {
		width: 36,
		height: 36,
		marginTop: 8,
		alignItems: "center",
		justifyContent: "center",
		alignSelf: "flex-end",
		borderRadius: 14,
		borderCurve: "continuous",
		backgroundColor: "rgba(134,16,14,0.08)",
	},
	routeActionButtonPressed: {
		opacity: 0.88,
		transform: [{ scale: 0.97 }],
	},
	routeMetricPrimary: {
		fontSize: Platform.OS === "web" ? 15 : 16,
		lineHeight: Platform.OS === "web" ? 19 : 20,
		fontWeight: Platform.OS === "web" ? "700" : "700",
		textAlign: "right",
	},
	routeMetricSecondary: {
		fontSize: 12,
		lineHeight: 15,
		fontWeight: "500",
		textAlign: "right",
		marginTop: 2,
	},
	expandedChoicesWrap: {
		gap: 10,
	},
	expandedChoiceCard: {
		minHeight: 78,
		borderRadius: 20,
		borderCurve: "continuous",
		paddingHorizontal: 14,
		paddingVertical: 10,
		flexDirection: "row",
		alignItems: "center",
	},
	expandedChoiceInfo: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		minWidth: 0,
	},
	expandedChoiceIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 18,
		borderCurve: "continuous",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 10,
	},
	expandedChoiceCopy: {
		flex: 1,
		minWidth: 0,
		paddingRight: 10,
	},
	expandedChoiceTitle: {
		fontSize: 17,
		lineHeight: 21,
		fontWeight: "700",
		letterSpacing: -0.25,
	},
	expandedChoiceMeta: {
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "400",
		marginTop: 4,
	},
	expandedChoiceArtworkWrap: {
		width: 88,
		minHeight: 60,
		alignItems: "center",
		justifyContent: "center",
		marginHorizontal: 8,
	},
	expandedChoiceActionWrap: {
		width: 24,
		height: 24,
		alignItems: "center",
		justifyContent: "center",
	},
	optionStatePill: {
		minHeight: 28,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 14,
		borderCurve: "continuous",
		alignItems: "center",
		justifyContent: "center",
	},
	optionStateText: {
		fontSize: 11,
		lineHeight: 13,
		fontWeight: "700",
		color: COLORS.brandPrimary,
	},
	detailsCard: {
		borderRadius: 24,
		borderCurve: "continuous",
		paddingHorizontal: 16,
		paddingVertical: 14,
	},
	detailsHeader: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 8,
		marginBottom: 10,
	},
	detailsConfidencePill: {
		height: 28,
		paddingHorizontal: 10,
		borderRadius: 14,
		borderCurve: "continuous",
		alignItems: "center",
		justifyContent: "center",
	},
	detailsConfidenceText: {
		fontSize: 11,
		lineHeight: 13,
		fontWeight: "500",
		color: COLORS.brandPrimary,
	},
	detailsSummary: {
		fontSize: 14,
		lineHeight: 19,
		fontWeight: "500",
		marginBottom: 10,
	},
	detailsFeatureRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		marginTop: 8,
	},
	detailsFeatureDot: {
		width: 6,
		height: 6,
		borderRadius: 999,
		backgroundColor: "rgba(134,16,14,0.72)",
		marginTop: 6,
		marginRight: 10,
	},
	detailsFeatureText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "400",
	},
	emptyCard: {
		borderRadius: 26,
		borderCurve: "continuous",
		paddingHorizontal: 20,
		paddingVertical: 18,
	},
	emptyTitle: {
		fontSize: 20,
		lineHeight: 24,
		fontWeight: "700",
		letterSpacing: -0.35,
		marginBottom: 6,
	},
	emptyBody: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: "500",
	},
	// PULLBACK NOTE: Remove horizontal padding from footer dock for full-width CTA row
	// OLD: paddingHorizontal: 12
	// NEW: paddingHorizontal: 0
	footerDock: {
		paddingHorizontal: 0,
		paddingTop: 8,
		paddingBottom: 10,
	},
	// PULLBACK NOTE: UX footer — horizontal row layout
	// OLD: primaryButton fullWidth + secondaryAction stacked below
	// NEW: footerRow flex-row, secondaryAction pill shrinks left, primaryButtonFlex grows right
	footerRow: {
		flexDirection: "row",
		alignItems: "stretch",
		gap: 8,
	},
	primaryButton: {
		shadowOffset: { width: 0, height: 10 },
		shadowRadius: 18,
	},
	primaryButtonFlex: {
		flex: 1,
		minWidth: 0,
		// Hard cap: the CTA can never spill past its share of the footer row,
		// whatever the sheet/container is doing upstream (overlap fix, 2026-07-15).
		maxWidth: "72%",
		shadowOffset: { width: 0, height: 10 },
		shadowRadius: 18,
	},
	secondaryAction: {
		minHeight: 50,
		minWidth: 96,
		maxWidth: "48%",
		paddingHorizontal: 12,
		borderCurve: "continuous",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 5,
		flexShrink: 1,
	},
	secondaryActionText: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "700",
		color: COLORS.brandPrimary,
		flexShrink: 1,
		minWidth: 0,
	},
	// PULLBACK NOTE: UX-A — skeleton + expand affordance styles added (mirrors bed decision)
	// OLD: missing — caused RN warning on undefined style key
	// NEW: matches bed metaSkeleton / expandAffordance definitions exactly
	metaSkeleton: {
		height: 10,
		borderRadius: 999,
		backgroundColor: "rgba(148,163,184,0.32)",
	},
	metaSkeletonMedium: {
		width: 66,
	},
	expandAffordance: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		paddingVertical: 10,
		paddingHorizontal: 16,
	},
	expandAffordanceLabel: {
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "500",
	},
});

export default styles;
