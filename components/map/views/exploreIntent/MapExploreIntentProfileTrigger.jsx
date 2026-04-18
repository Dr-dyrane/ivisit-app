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
	responsiveMetrics,
}) {
	const { isDarkMode } = useTheme();
	// Theme-based icon color, defined outside JSX per code style rules
	const iconColor = isDarkMode ? "#e5e7eb" : "#334155";
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.avatarPressable,
				{
					width: isCollapsed
						? responsiveMetrics?.topRow?.avatarCollapsedSize || 40
						: responsiveMetrics?.topRow?.avatarSize || 44,
					height: isCollapsed
						? responsiveMetrics?.topRow?.avatarCollapsedSize || 40
						: responsiveMetrics?.topRow?.avatarSize || 44,
				},
				isCollapsed ? styles.avatarPressableCollapsed : null,
				{ transform: [{ scale: pressed ? 0.96 : 1 }] },
			]}
		>
			<View
				style={[
					styles.avatarImageShell,
					{
						width: isCollapsed
							? responsiveMetrics?.topRow?.avatarCollapsedSize || 38
							: responsiveMetrics?.topRow?.avatarSize || 42,
						height: isCollapsed
							? responsiveMetrics?.topRow?.avatarCollapsedSize || 38
							: responsiveMetrics?.topRow?.avatarSize || 42,
						borderRadius: isCollapsed
							? Math.round((responsiveMetrics?.topRow?.avatarCollapsedSize || 38) / 2)
							: Math.round((responsiveMetrics?.topRow?.avatarSize || 42) / 2),
					},
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
							size={
								isCollapsed
									? responsiveMetrics?.topRow?.avatarGlyphCollapsedSize || 38
									: responsiveMetrics?.topRow?.avatarGlyphSize || 42
							}
							color={iconColor}
						/>
					</View>
				)}
			</View>
			{isSignedIn ? (
				<View
					style={[
						styles.avatarDot,
						{
							width: isCollapsed
								? responsiveMetrics?.topRow?.avatarDotCollapsedSize || 10
								: responsiveMetrics?.topRow?.avatarDotSize || 12,
							height: isCollapsed
								? responsiveMetrics?.topRow?.avatarDotCollapsedSize || 10
								: responsiveMetrics?.topRow?.avatarDotSize || 12,
							borderRadius: Math.round(
								(
									isCollapsed
										? responsiveMetrics?.topRow?.avatarDotCollapsedSize || 10
										: responsiveMetrics?.topRow?.avatarDotSize || 12
								) / 2,
							),
						},
						isCollapsed ? styles.avatarDotCollapsed : null,
					]}
				/>
			) : null}
		</Pressable>
	);
}
