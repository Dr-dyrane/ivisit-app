import { StyleSheet } from "react-native";
import { COLORS } from "../../../../constants/colors";

const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

export const styles = StyleSheet.create({
	content: {
		paddingTop: 0,
		paddingBottom: 10,
		gap: 18,
	},
	searchBar: {
		marginTop: 0,
		marginBottom: 0,
	},
	modeSwitchRow: {
		flexDirection: "row",
		gap: 10,
	},
	modeChip: {
		flex: 1,
		minHeight: 44,
		paddingHorizontal: 14,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		...squircle(16),
	},
	modeChipLabel: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "700",
	},
	section: {
		gap: 12,
	},
	sectionTitle: {
		fontSize: 18,
		lineHeight: 22,
		fontWeight: "700",
	},
	chipWrap: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
	},
	queryChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 999,
		maxWidth: "100%",
	},
	queryChipLabel: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "700",
		maxWidth: 220,
	},
	resultGroup: {
		overflow: "hidden",
		...squircle(28),
	},
	resultRow: {
		paddingHorizontal: 14,
		paddingVertical: 14,
		minHeight: 74,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12,
	},
	resultLeading: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		gap: 12,
	},
	sheetIconShell: {
		width: 40,
		height: 40,
		borderRadius: 20,
		padding: 1,
		shadowColor: "#0F172A",
		shadowOpacity: 0.05,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 3 },
	},
	sheetIconFill: {
		flex: 1,
		borderRadius: 19,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
	sheetIconHighlight: {
		position: "absolute",
		left: 1,
		right: 1,
		top: 1,
		height: "42%",
		borderRadius: 18,
		backgroundColor: "rgba(255,255,255,0.2)",
	},
	resultCopy: {
		flex: 1,
	},
	resultTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 8,
	},
	resultTitle: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "700",
		flexShrink: 1,
	},
	resultBadge: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 999,
		backgroundColor: `${COLORS.brandPrimary}18`,
	},
	resultBadgeText: {
		fontSize: 10,
		lineHeight: 12,
		fontWeight: "700",
		color: COLORS.brandPrimary,
		textTransform: "uppercase",
		letterSpacing: 0.4,
	},
	resultSubtitle: {
		marginTop: 3,
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "400",
	},
	resultMeta: {
		marginTop: 4,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "500",
	},
	rowDivider: {
		height: StyleSheet.hairlineWidth,
		marginLeft: 66,
	},
	emptyState: {
		paddingHorizontal: 18,
		paddingVertical: 22,
		alignItems: "center",
		gap: 10,
		...squircle(28),
	},
	emptyIconWrap: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: `${COLORS.brandPrimary}14`,
	},
	emptyTitle: {
		fontSize: 18,
		lineHeight: 22,
		fontWeight: "700",
		textAlign: "center",
	},
	emptyBody: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: "400",
		textAlign: "center",
		maxWidth: 320,
	},
	actionChipRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "center",
		gap: 10,
		marginTop: 2,
	},
	actionChip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 999,
	},
	actionChipLabel: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "700",
	},
	loadingRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingHorizontal: 14,
		paddingVertical: 18,
	},
	loadingText: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "400",
	},
});

export function getMapSearchSheetResponsiveStyles(viewportMetrics) {
	const tileSize = Math.max(36, Math.round(viewportMetrics.radius.card * 1.45));
	return {
		content: {
			paddingBottom: Math.max(10, viewportMetrics.insets.sectionGap - 2),
			gap: viewportMetrics.insets.largeGap,
		},
		modeSwitchRow: {
			gap: Math.max(8, viewportMetrics.insets.sectionGap - 4),
		},
		modeChip: {
			minHeight: Math.max(42, viewportMetrics.cta.secondaryHeight - 4),
			paddingHorizontal: Math.max(13, viewportMetrics.insets.horizontal - 1),
			gap: Math.max(7, Math.round(viewportMetrics.insets.sectionGap * 0.62)),
			borderRadius: viewportMetrics.radius.chip,
		},
		modeChipLabel: {
			fontSize: Math.max(13, viewportMetrics.type.caption + 1),
			lineHeight: Math.max(17, viewportMetrics.type.captionLineHeight + 1),
		},
		section: {
			gap: Math.max(10, viewportMetrics.insets.sectionGap - 2),
		},
		sectionTitle: {
			fontSize: Math.max(16, viewportMetrics.type.title),
			lineHeight: viewportMetrics.type.titleLineHeight,
		},
		chipWrap: {
			gap: Math.max(8, viewportMetrics.insets.sectionGap - 4),
		},
		queryChip: {
			gap: 8,
			paddingHorizontal: Math.max(13, viewportMetrics.insets.horizontal - 1),
			paddingVertical: Math.max(10, viewportMetrics.insets.sectionGap - 2),
		},
		queryChipLabel: {
			fontSize: Math.max(13, viewportMetrics.type.caption + 1),
			lineHeight: Math.max(17, viewportMetrics.type.captionLineHeight + 1),
			maxWidth: Math.max(180, Math.round(viewportMetrics.modal.contentPadding * 8.6)),
		},
		resultRow: {
			paddingHorizontal: Math.max(13, viewportMetrics.insets.horizontal - 1),
			paddingVertical: Math.max(13, viewportMetrics.insets.sectionGap),
			minHeight: Math.max(70, Math.round(viewportMetrics.cta.primaryHeight * 1.34)),
			gap: Math.max(10, viewportMetrics.insets.sectionGap - 2),
		},
		resultLeading: {
			gap: Math.max(10, viewportMetrics.insets.sectionGap - 2),
		},
		sheetIconShell: {
			width: tileSize,
			height: tileSize,
			borderRadius: Math.round(tileSize / 2),
		},
		sheetIconFill: {
			borderRadius: Math.round(tileSize / 2) - 1,
		},
		sheetIconHighlight: {
			borderRadius: Math.round(tileSize / 2) - 2,
		},
		resultTitleRow: {
			gap: Math.max(7, Math.round(viewportMetrics.insets.sectionGap * 0.6)),
		},
		resultTitle: {
			fontSize: Math.max(15, viewportMetrics.type.body),
			lineHeight: Math.max(20, viewportMetrics.type.bodyLineHeight - 4),
		},
		resultBadge: {
			paddingHorizontal: 8,
			paddingVertical: 3,
		},
		resultBadgeText: {
			fontSize: 10,
			lineHeight: 12,
		},
		resultSubtitle: {
			marginTop: 3,
			fontSize: viewportMetrics.type.caption,
			lineHeight: Math.max(17, viewportMetrics.type.captionLineHeight + 1),
		},
		resultMeta: {
			marginTop: 4,
			fontSize: Math.max(11, viewportMetrics.type.caption - 1),
			lineHeight: Math.max(15, viewportMetrics.type.captionLineHeight),
		},
		rowDivider: {
			marginLeft: Math.max(58, tileSize + Math.max(18, viewportMetrics.insets.sectionGap + 8)),
		},
		emptyState: {
			paddingHorizontal: Math.max(18, viewportMetrics.modal.contentPadding),
			paddingVertical: Math.max(20, viewportMetrics.insets.largeGap),
			gap: Math.max(8, viewportMetrics.insets.sectionGap - 2),
		},
		emptyIconWrap: {
			width: Math.max(40, tileSize + 2),
			height: Math.max(40, tileSize + 2),
			borderRadius: Math.round(Math.max(40, tileSize + 2) / 2),
		},
		emptyTitle: {
			fontSize: Math.max(16, viewportMetrics.type.title),
			lineHeight: viewportMetrics.type.titleLineHeight,
		},
		emptyBody: {
			fontSize: viewportMetrics.type.body,
			lineHeight: viewportMetrics.type.bodyLineHeight,
			maxWidth: Math.max(260, Math.round(viewportMetrics.modal.contentPadding * 9.4)),
		},
		actionChipRow: {
			gap: Math.max(8, viewportMetrics.insets.sectionGap - 4),
			marginTop: 2,
		},
		actionChip: {
			gap: 8,
			paddingHorizontal: Math.max(13, viewportMetrics.insets.horizontal - 1),
			paddingVertical: Math.max(10, viewportMetrics.insets.sectionGap - 2),
		},
		actionChipLabel: {
			fontSize: Math.max(13, viewportMetrics.type.caption + 1),
			lineHeight: Math.max(17, viewportMetrics.type.captionLineHeight + 1),
		},
		loadingRow: {
			gap: Math.max(8, viewportMetrics.insets.sectionGap - 4),
			paddingHorizontal: Math.max(13, viewportMetrics.insets.horizontal - 1),
			paddingVertical: Math.max(16, viewportMetrics.insets.sectionGap + 2),
		},
		loadingText: {
			fontSize: viewportMetrics.type.caption + 1,
			lineHeight: viewportMetrics.type.captionLineHeight + 2,
		},
	};
}
