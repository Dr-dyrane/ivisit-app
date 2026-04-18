import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
	topRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		marginBottom: 16,
		paddingHorizontal: 16,
	},
	topRowCollapsed: {
		marginBottom: 0,
	},
	searchPill: {
		flex: 1,
		minHeight: 44,
		paddingHorizontal: 14,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		overflow: "hidden",
		position: "relative",
	},
	searchPillCollapsed: {
		minHeight: 40,
		paddingHorizontal: 13,
	},
	searchText: {
		fontSize: 15,
		lineHeight: 19,
		fontWeight: "600",
	},
	bodyScrollContent: {
		paddingHorizontal: 16,
		paddingBottom: 6,
	},
	activeSearchRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		marginBottom: 10,
	},
	activeSearchBar: {
		flex: 1,
		marginBottom: 0,
	},
	closeButton: {
		width: 38,
		height: 38,
		borderRadius: 999,
		alignItems: "center",
		justifyContent: "center",
		zIndex: 2,
		overflow: "hidden",
		position: "relative",
	},
	closeButtonDisabled: {
		opacity: 0.72,
	},
});

export function getMapSearchStageResponsiveStyles(viewportMetrics) {
	return {
		topRow: {
			gap: Math.max(8, viewportMetrics.insets.sectionGap - 4),
			marginBottom: Math.max(12, viewportMetrics.insets.sectionGap),
			paddingHorizontal: viewportMetrics.insets.horizontal,
		},
		searchPill: {
			minHeight: Math.max(42, viewportMetrics.cta.secondaryHeight - 4),
			paddingHorizontal: Math.max(13, viewportMetrics.insets.horizontal - 1),
			gap: Math.max(7, Math.round(viewportMetrics.insets.sectionGap * 0.62)),
			borderRadius: viewportMetrics.radius.card,
		},
		searchPillCollapsed: {
			minHeight: Math.max(38, viewportMetrics.cta.secondaryHeight - 8),
			paddingHorizontal: Math.max(12, viewportMetrics.insets.horizontal - 2),
		},
		searchText: {
			fontSize: Math.max(14, viewportMetrics.type.body - 1),
			lineHeight: Math.max(18, viewportMetrics.type.bodyLineHeight - 5),
		},
		bodyScrollContent: {
			paddingHorizontal: viewportMetrics.insets.horizontal,
			paddingBottom: Math.max(8, viewportMetrics.insets.sectionGap - 4),
		},
		activeSearchRow: {
			gap: Math.max(8, viewportMetrics.insets.sectionGap - 4),
			marginBottom: Math.max(8, viewportMetrics.insets.sectionGap - 6),
		},
		closeButton: {
			width: viewportMetrics.modal.headerButtonSize,
			height: viewportMetrics.modal.headerButtonSize,
			borderRadius: Math.round(viewportMetrics.modal.headerButtonSize / 2),
		},
	};
}

export default styles;
