import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
	container: {
		marginTop: 8,
	},
	header: {
		paddingHorizontal: 4,
		marginBottom: 16,
	},
	sectionTitle: {
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 1.5,
		textTransform: "uppercase",
	},
	tabScroll: {
		marginBottom: 20,
	},
	tabContainer: {
		paddingHorizontal: 4,
		gap: 10,
	},
	tabButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 18,
		paddingVertical: 10,
		borderRadius: 20,
	},
	tabText: {
		fontWeight: "900",
		fontSize: 13,
		letterSpacing: -0.3,
	},
	horizontalScroll: {
		paddingLeft: 4,
		paddingRight: 20,
		paddingBottom: 8,
		gap: 12,
	},
	horizontalCard: {
		minWidth: 180,
		padding: 16, // Consistent with manifesto
		borderRadius: 24, // Widget / Card-in-Card (24px)
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		position: 'relative',
		// Border-Free Depth: Bioluminescence & Glass
		shadowColor: COLORS.brandPrimary, // Active Glow
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 4,
	},
	iconBox: {
		width: 48, // Widget / Card-in-Card (24px * 2)
		height: 48,
		borderRadius: 14, // Identity / Detail (14px)
		justifyContent: "center",
		alignItems: "center",
		// Frosted Glass effect
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	textStack: {
		flex: 1,
	},
	cardTitle: {
		fontSize: 15,
		fontWeight: "900", // Primary Headline: FontWeight: 900, LetterSpacing: -1.0pt
		letterSpacing: -0.5,
	},
	cardSubtitle: {
		fontSize: 11,
		fontWeight: '600',
		marginTop: 1,
		opacity: 0.7,
	},
	newsCard: {
		width: 280,
		padding: 16,
		borderRadius: 24, // Primary Artifact (36px) - smaller for suggestion cards
		gap: 12,
		position: 'relative',
		// Border-Free Depth: Bioluminescence & Glass
		shadowColor: COLORS.brandPrimary, // Active Glow
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 4,
	},
	newsHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	newsMeta: {
		flex: 1,
	},
	newsSource: {
		color: COLORS.brandPrimary,
		fontWeight: "800",
		fontSize: 11,
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	newsTime: {
		fontSize: 10,
		fontWeight: "600",
		marginTop: 1,
	},
	newsTitleText: {
		fontWeight: "900", // Primary Headline
		fontSize: 15,
		lineHeight: 20,
		letterSpacing: -0.3, // Editorial Weight
	},
	checkmarkWrapper: {
		position: "absolute",
		right: -4,
		bottom: -4,
		width: 32, // Proper badge size
		height: 32,
		borderRadius: 16, // Perfect circle
		alignItems: "center",
		justifyContent: "center",
		// The Signature Interaction: "The Corner Seal"
		shadowColor: COLORS.brandPrimary, // Active Glow
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
	},
});
