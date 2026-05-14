import React from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { getMapEntrySurfaceColor } from "../../constants/appSurfaces";

export default function WelcomeMapHandoffCover({
	isDarkMode,
	opacity,
	label = "Opening map",
}) {
	return (
		<Animated.View
			pointerEvents="auto"
			style={[
				styles.cover,
				{ backgroundColor: getMapEntrySurfaceColor(isDarkMode) },
				{ opacity },
			]}
		>
			<View
				accessible
				accessibilityRole="progressbar"
				accessibilityLabel={label}
				style={[
					styles.cue,
					{
						backgroundColor: isDarkMode
							? "rgba(8,15,27,0.78)"
							: "rgba(255,255,255,0.86)",
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
				<Text
					style={[
						styles.text,
						{ color: isDarkMode ? "#F8FAFC" : "#111827" },
					]}
				>
					{label}
				</Text>
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	cover: {
		...StyleSheet.absoluteFillObject,
		alignItems: "center",
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
		shadowOpacity: 0.14,
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
	text: {
		fontSize: 14,
		fontWeight: "600",
		letterSpacing: 0,
	},
});
