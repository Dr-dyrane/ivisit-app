import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { getRootSurfaceColor } from "../../constants/appSurfaces";

export default function AuthProgressScreen({
	isDarkMode,
	message = "Signing you in...",
	showMessage = true,
}) {
	return (
		<View style={[styles.screen, { backgroundColor: getRootSurfaceColor(isDarkMode) }]}>
			<View
				accessible
				accessibilityRole="progressbar"
				accessibilityLabel={message}
				style={[
					styles.cue,
					{
						backgroundColor: isDarkMode
							? "rgba(18,24,38,0.86)"
							: "rgba(255,255,255,0.92)",
					},
				]}
			>
				<View
					style={[
						styles.spinnerWrap,
						{
							backgroundColor: isDarkMode
								? "rgba(134,16,14,0.22)"
								: "rgba(134,16,14,0.1)",
						},
					]}
				>
					<ActivityIndicator size="small" color={COLORS.brandPrimary} />
				</View>
				{showMessage ? (
					<Text
						style={[
							styles.message,
							{ color: isDarkMode ? "#F8FAFC" : "#111827" },
						]}
					>
						{message}
					</Text>
				) : null}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		alignItems: "center",
		flex: 1,
		justifyContent: "center",
		paddingHorizontal: 24,
	},
	cue: {
		alignItems: "center",
		borderCurve: "continuous",
		borderRadius: 28,
		flexDirection: "row",
		gap: 10,
		minHeight: 52,
		paddingHorizontal: 16,
		shadowColor: "#0F172A",
		shadowOffset: { width: 0, height: 14 },
		shadowOpacity: 0.12,
		shadowRadius: 24,
	},
	spinnerWrap: {
		alignItems: "center",
		borderCurve: "continuous",
		borderRadius: 16,
		height: 32,
		justifyContent: "center",
		width: 32,
	},
	message: {
		fontSize: 14,
		fontWeight: "600",
		letterSpacing: 0,
	},
});
