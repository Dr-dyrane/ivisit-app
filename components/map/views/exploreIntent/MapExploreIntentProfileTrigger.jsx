import React from "react";
import { Image, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../../contexts/ThemeContext";
import styles from "./mapExploreIntent.styles";

export default function MapExploreIntentProfileTrigger({
	onPress,
	userImageSource,
	isSignedIn,
	isCollapsed = false,
}) {
	const { isDarkMode } = useTheme();
	// Theme-based icon color, defined outside JSX per code style rules
	const iconColor = isDarkMode ? "#e5e7eb" : "#334155";
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.avatarPressable,
				isCollapsed ? styles.avatarPressableCollapsed : null,
				{ transform: [{ scale: pressed ? 0.96 : 1 }] },
			]}
		>
			<View
				style={[
					styles.avatarImageShell,
					isCollapsed ? styles.avatarImageShellCollapsed : null,
					{
						shadowColor: "#000000",
						shadowOpacity: 0.16,
						shadowRadius: 12,
						shadowOffset: { width: 0, height: 6 },
						...Platform.select({
							web: {
								boxShadow: "0px 10px 18px rgba(15,23,42,0.18)",
							},
						}),
					},
				]}
			>
				{isSignedIn ? (
					<Image
						source={userImageSource}
						resizeMode="cover"
						style={[
							styles.avatarImage,
							isCollapsed ? styles.avatarImageCollapsed : null,
						]}
					/>
				) : (
					<View style={[styles.avatarImage, isCollapsed ? styles.avatarImageCollapsed : null, { justifyContent: "center", alignItems: "center", opacity: 0.56 }]}> 
						<Ionicons
							name="person-circle-outline"
							size={isCollapsed ? 38 : 42}
							color={iconColor}
						/>
					</View>
				)}
			</View>
			{isSignedIn ? <View style={[styles.avatarDot, isCollapsed ? styles.avatarDotCollapsed : null]} /> : null}
		</Pressable>
	);
}
