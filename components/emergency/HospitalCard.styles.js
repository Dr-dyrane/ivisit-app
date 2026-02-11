import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
	card: {
		borderRadius: 36,
		padding: 16,
		marginBottom: 20,
		minHeight: 200,
		position: "relative",
		shadowOffset: { width: 0, height: 10 },
		shadowRadius: 15,
	},
	imageContainer: {
		width: "100%",
		height: 140,
		borderRadius: 26,
		overflow: "hidden",
		marginBottom: 16,
	},
	image: {
		width: "100%",
		height: "100%",
	},
	priceBadge: {
		position: "absolute",
		top: 12,
		right: 12,
		backgroundColor: COLORS.brandPrimary,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 14,
	},
	priceText: {
		color: "#FFFFFF",
		fontWeight: "900",
		fontSize: 15,
	},
	verifiedBadge: {
		position: "absolute",
		top: 12,
		left: 12,
		backgroundColor: "rgba(16, 185, 129, 0.95)",
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 12,
		gap: 4,
	},
	verifiedText: {
		color: "#FFFFFF",
		fontSize: 10,
		fontWeight: "900",
		letterSpacing: 0.5,
	},
	unverifiedBadge: {
		position: "absolute",
		top: 12,
		left: 12,
		backgroundColor: "rgba(239, 68, 68, 0.95)",
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 12,
		gap: 4,
	},
	unverifiedText: {
		color: "#FFFFFF",
		fontSize: 10,
		fontWeight: "900",
		letterSpacing: 0.5,
	},
	content: {
		paddingHorizontal: 4,
	},
	titleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 4,
	},
	ratingBox: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	name: {
		fontSize: 20,
		fontWeight: "800",
		flex: 1,
		letterSpacing: -0.5,
	},
	ratingText: {
		fontSize: 14,
		fontWeight: "700",
	},
	specialties: {
		fontSize: 13,
		fontWeight: "500",
		marginBottom: 16,
	},
	pillRow: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 4,
	},
	statPill: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 14,
		gap: 6,
	},
	statText: {
		fontSize: 12,
		fontWeight: "700",
	},
	primaryAction: {
		backgroundColor: COLORS.brandPrimary,
		height: 64, // Manifesto: Larger touch target
		borderRadius: 24, // Manifesto: Card-in-Card
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 24,
		flex: 1,
		shadowColor: COLORS.brandPrimary, // Manifesto: Active Glow
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.3,
		shadowRadius: 12,
		elevation: 8,
	},
	actionLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	actionText: {
		color: "#FFFFFF",
		fontSize: 16, // Manifesto: Larger text
		fontWeight: "900", // Manifesto: Action Text
		letterSpacing: 0.5,
	},
	actionRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 16,
		marginTop: 8,
	},
	callButton: {
		width: 64, // Matching height
		height: 64,
		borderRadius: 32, // Circular
		alignItems: "center",
		justifyContent: "center",
		// No border, just background
	},
	primaryActionFull: {
		flex: 1,
	},
	checkmarkWrapper: {
		position: "absolute",
		right: -4,
		bottom: -4,
	},
});
