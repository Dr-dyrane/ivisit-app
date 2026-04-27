// components/emergency/serviceRatingModal.styles.js
// StyleSheet-based styling following map surfaces pattern
// Replaces Tailwind classes for web responsiveness

import { StyleSheet } from "react-native";

const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

export const styles = StyleSheet.create({
	// Container
	container: {
		flex: 1,
	},
	
	// Header Section
	header: {
		alignItems: "center",
		marginBottom: 32,
	},
	iconContainer: {
		width: 64,
		height: 64,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
		...squircle(24),
	},
	title: {
		fontSize: 30,
		lineHeight: 36,
		fontWeight: "700",
		letterSpacing: -0.7,
		textAlign: "center",
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		lineHeight: 22,
		textAlign: "center",
	},
	
	// Service Details Card
	serviceDetailsCard: {
		padding: 16,
		marginBottom: 24,
		...squircle(24),
	},
	serviceDetailRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
	},
	serviceDetailRowLast: {
		marginBottom: 0,
	},
	serviceDetailIcon: {
		marginRight: 12,
	},
	serviceDetailText: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: "500",
	},
	
	// Rating Section
	ratingSection: {
		marginBottom: 24,
	},
	ratingPrompt: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: "600",
		textAlign: "center",
		marginBottom: 24,
	},
	starsContainer: {
		flexDirection: "row",
		justifyContent: "center",
		marginBottom: 16,
	},
	starButton: {
		padding: 8,
	},
	ratingText: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: "500",
		textAlign: "center",
	},
	
	// Feedback Section
	feedbackSection: {
		marginBottom: 32,
	},
	feedbackLabel: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: "500",
		marginBottom: 12,
	},
	feedbackInput: {
		padding: 16,
		fontSize: 16,
		lineHeight: 22,
		height: 100,
		textAlignVertical: "top",
		...squircle(22),
	},
	
	// Tip Section
	tipSection: {
		marginBottom: 32,
	},
	tipLabel: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: "500",
		marginBottom: 4,
	},
	tipDescription: {
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 16,
	},
	tipButtonsRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		marginBottom: 16,
		gap: 10,
	},
	tipButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		...squircle(18),
	},
	tipButtonText: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "600",
	},
	tipCustomInput: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		lineHeight: 22,
		marginBottom: 12,
		...squircle(20),
	},
	walletBalance: {
		fontSize: 14,
		lineHeight: 20,
	},
	walletShortWarning: {
		fontSize: 14,
		lineHeight: 20,
		marginTop: 8,
	},
	
	// Actions Section
	actionsContainer: {
		flexDirection: "row",
		gap: 12,
	},
	actionButton: {
		flex: 1,
	},
	actionButtonInner: {
		height: 56,
		alignItems: "center",
		justifyContent: "center",
		...squircle(28),
	},
	actionButtonText: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: "600",
	},
});

// Responsive styles based on viewport metrics
export function getServiceRatingModalResponsiveStyles(viewportMetrics) {
	const iconSize = Math.max(56, Math.round(viewportMetrics.radius.card * 2));
	
	return {
		header: {
			marginBottom: Math.max(24, viewportMetrics.insets.largeGap),
		},
		iconContainer: {
			width: iconSize,
			height: iconSize,
			marginBottom: Math.max(12, viewportMetrics.insets.sectionGap - 4),
			borderRadius: Math.round(iconSize * 0.375),
		},
		title: {
			fontSize: Math.max(24, viewportMetrics.type.title * 1.25),
			lineHeight: Math.max(30, viewportMetrics.type.titleLineHeight + 6),
			marginBottom: Math.max(6, viewportMetrics.insets.sectionGap - 6),
		},
		subtitle: {
			fontSize: Math.max(14, viewportMetrics.type.body),
			lineHeight: Math.max(20, viewportMetrics.type.bodyLineHeight - 2),
		},
		serviceDetailsCard: {
			padding: Math.max(14, viewportMetrics.insets.horizontal - 2),
			marginBottom: Math.max(20, viewportMetrics.insets.largeGap - 4),
			borderRadius: viewportMetrics.radius.card,
		},
		serviceDetailRow: {
			marginBottom: Math.max(10, viewportMetrics.insets.sectionGap - 2),
		},
		serviceDetailText: {
			fontSize: Math.max(15, viewportMetrics.type.body),
			lineHeight: Math.max(21, viewportMetrics.type.bodyLineHeight - 1),
		},
		ratingSection: {
			marginBottom: Math.max(20, viewportMetrics.insets.largeGap - 4),
		},
		ratingPrompt: {
			fontSize: Math.max(17, viewportMetrics.type.title),
			lineHeight: Math.max(23, viewportMetrics.type.titleLineHeight + 1),
			marginBottom: Math.max(20, viewportMetrics.insets.largeGap - 4),
		},
		starsContainer: {
			marginBottom: Math.max(12, viewportMetrics.insets.sectionGap - 4),
		},
		starButton: {
			padding: Math.max(6, viewportMetrics.insets.sectionGap - 6),
		},
		ratingText: {
			fontSize: Math.max(17, viewportMetrics.type.title),
			lineHeight: Math.max(23, viewportMetrics.type.titleLineHeight + 1),
		},
		feedbackSection: {
			marginBottom: Math.max(24, viewportMetrics.insets.largeGap),
		},
		feedbackLabel: {
			fontSize: Math.max(15, viewportMetrics.type.body),
			lineHeight: Math.max(21, viewportMetrics.type.bodyLineHeight - 1),
			marginBottom: Math.max(10, viewportMetrics.insets.sectionGap - 2),
		},
		feedbackInput: {
			padding: Math.max(14, viewportMetrics.insets.horizontal - 2),
			fontSize: Math.max(15, viewportMetrics.type.body),
			lineHeight: Math.max(21, viewportMetrics.type.bodyLineHeight - 1),
			borderRadius: Math.max(20, viewportMetrics.radius.card - 2),
		},
		tipSection: {
			marginBottom: Math.max(24, viewportMetrics.insets.largeGap),
		},
		tipLabel: {
			fontSize: Math.max(15, viewportMetrics.type.body),
			lineHeight: Math.max(21, viewportMetrics.type.bodyLineHeight - 1),
		},
		tipDescription: {
			fontSize: Math.max(13, viewportMetrics.type.caption + 1),
			lineHeight: Math.max(19, viewportMetrics.type.captionLineHeight + 3),
			marginBottom: Math.max(14, viewportMetrics.insets.sectionGap),
		},
		tipButtonsRow: {
			marginBottom: Math.max(14, viewportMetrics.insets.sectionGap),
			gap: Math.max(8, viewportMetrics.insets.sectionGap - 4),
		},
		tipButton: {
			paddingHorizontal: Math.max(14, viewportMetrics.insets.horizontal - 2),
			paddingVertical: Math.max(7, viewportMetrics.insets.sectionGap - 3),
			borderRadius: Math.max(16, viewportMetrics.radius.chip - 2),
		},
		tipButtonText: {
			fontSize: Math.max(13, viewportMetrics.type.caption + 1),
			lineHeight: Math.max(17, viewportMetrics.type.captionLineHeight + 3),
		},
		tipCustomInput: {
			paddingHorizontal: Math.max(14, viewportMetrics.insets.horizontal - 2),
			paddingVertical: Math.max(11, viewportMetrics.insets.sectionGap - 1),
			fontSize: Math.max(15, viewportMetrics.type.body),
			lineHeight: Math.max(21, viewportMetrics.type.bodyLineHeight - 1),
			borderRadius: Math.max(18, viewportMetrics.radius.card - 2),
		},
		walletBalance: {
			fontSize: Math.max(13, viewportMetrics.type.caption + 1),
			lineHeight: Math.max(19, viewportMetrics.type.captionLineHeight + 3),
		},
		walletShortWarning: {
			fontSize: Math.max(13, viewportMetrics.type.caption + 1),
			lineHeight: Math.max(19, viewportMetrics.type.captionLineHeight + 3),
			marginTop: Math.max(6, viewportMetrics.insets.sectionGap - 6),
		},
		actionsContainer: {
			gap: Math.max(10, viewportMetrics.insets.sectionGap - 2),
		},
		actionButtonInner: {
			height: Math.max(52, viewportMetrics.cta.primaryHeight - 4),
			borderRadius: Math.max(26, viewportMetrics.radius.card),
		},
		actionButtonText: {
			fontSize: Math.max(15, viewportMetrics.type.body),
			lineHeight: Math.max(21, viewportMetrics.type.bodyLineHeight - 1),
		},
	};
}
