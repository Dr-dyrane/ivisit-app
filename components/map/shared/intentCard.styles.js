import { StyleSheet } from "react-native";

const squircle = (radius) => ({
	borderRadius: radius,
	borderCurve: "continuous",
});

export default StyleSheet.create({
	pressable: {
		flex: 1,
	},
	pulseStage: {
		position: "relative",
		overflow: "visible",
	},
	cardPressed: {
		opacity: 0.94,
		transform: [{ scale: 0.988 }],
	},
	surface: {
		paddingHorizontal: 16,
		paddingVertical: 15,
		overflow: "hidden",
		...squircle(22),
	},
	surfacePrimaryBias: {
		paddingLeft: 20,
		paddingRight: 11,
	},
	surfaceLeadingBias: {
		paddingLeft: 17,
		paddingRight: 11,
	},
	surfaceTrailingBias: {
		paddingLeft: 14,
		paddingRight: 13,
	},
	surfacePrimary: {
		minHeight: 102,
	},
	surfaceSecondary: {
		minHeight: 86,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	iconWrap: {
		width: 42,
		height: 42,
		alignItems: "center",
		justifyContent: "center",
		overflow: "visible",
		backgroundColor: "rgba(255,255,255,0.14)",
		...squircle(14),
	},
	iconAura: {
		position: "absolute",
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: "rgba(255,255,255,0.22)",
	},
	checkBadge: {
		width: 22,
		height: 22,
		borderRadius: 11,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(255,255,255,0.18)",
	},
	chevronBadge: {
		width: 22,
		height: 22,
		borderRadius: 11,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(255,255,255,0.12)",
	},
	cardLabel: {
		marginTop: 16,
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "700",
		color: "#FFFFFF",
		flexShrink: 1,
	},
	cardSubtext: {
		marginTop: 4,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "400",
		color: "rgba(255,255,255,0.84)",
		flexShrink: 1,
	},
	pulseGlow: {
		position: "absolute",
		width: 324,
		height: 324,
		borderRadius: 162,
		alignSelf: "center",
		top: -148,
		backgroundColor: "rgba(255,255,255,0.28)",
	},
	pulseFloor: {
		position: "absolute",
		left: 28,
		right: 28,
		bottom: -16,
		height: 28,
		borderRadius: 999,
		backgroundColor: "rgba(74, 8, 12, 0.52)",
	},
	pulseSheen: {
		position: "absolute",
		left: -24,
		right: -24,
		top: 0,
		bottom: 0,
		overflow: "hidden",
	},
	pulseSheenBand: {
		position: "absolute",
		top: -32,
		bottom: -32,
		width: 186,
		transform: [{ rotate: "16deg" }],
	},
	pulseSheenBandFill: {
		flex: 1,
	},
});
