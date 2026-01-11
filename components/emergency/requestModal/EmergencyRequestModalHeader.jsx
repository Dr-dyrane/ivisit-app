import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";

export default function EmergencyRequestModalHeader({ 
	title, 
	subtitle, 
	textColor, 
	subTextColor,
	hospitalAvatar 
}) {
	const { isDarkMode } = useTheme();
	
	return (
		<View style={styles.container}>
			<View style={styles.contentContainer}>
				{hospitalAvatar && (
					<Image 
						source={{ uri: hospitalAvatar }} 
						style={[
							styles.avatar,
							{ 
								backgroundColor: isDarkMode 
									? "rgba(255,255,255,0.05)" 
									: "rgba(0,0,0,0.03)" 
							}
						]}
						resizeMode="cover"
					/>
				)}
				<View style={styles.textContainer}>
					{subtitle && (
						<Text style={[styles.subtitle, { color: subTextColor }]} numberOfLines={1}>
							{subtitle}
						</Text>
					)}
					<Text style={[styles.title, { color: textColor }]}>
						{title}
					</Text>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 24,
		paddingTop: 20,
		paddingBottom: 16,
	},
	contentContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 16,
	},
	avatar: {
		width: 56,
		height: 56,
		borderRadius: 16,
	},
	textContainer: {
		flex: 1,
		justifyContent: "center",
	},
	subtitle: {
		fontSize: 11,
		fontWeight: "900",
		letterSpacing: 1.5,
		textTransform: "uppercase",
		marginBottom: 4,
	},
	title: {
		fontSize: 22,
		fontWeight: "900",
		letterSpacing: -0.5,
		lineHeight: 26,
	},
});

