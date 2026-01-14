import React, { useEffect, useRef } from "react";
import { View, Image, Pressable, StyleSheet, Animated } from "react-native";
import EmergencySearchBar from "../EmergencySearchBar";
import MiniProfileModal from "../MiniProfileModal";
import { COLORS } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";

export default function EmergencySheetTopRow({
	searchValue,
	onSearchChange,
	onSearchFocus,
	onSearchBlur,
	onSearchClear,
	placeholder,
	avatarSource,
	onAvatarPress,
	showProfileModal,
	onCloseProfileModal,
}) {
	const { isDarkMode } = useTheme();
	const fadeAnim = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(fadeAnim, {
					toValue: 0.4,
					duration: 1000,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 1000,
					useNativeDriver: true,
				}),
			])
		).start();
	}, []);

	return (
		<View style={styles.wrapper}>
			<View style={styles.container}>
				{/* Search Bar - Flexed to take remaining space */}
				<EmergencySearchBar
					value={searchValue}
					onChangeText={onSearchChange}
					onFocus={onSearchFocus}
					onBlur={onSearchBlur}
					onClear={onSearchClear}
					placeholder={placeholder}
					// Adjusted bleed to account for the new squircle avatar width
					suggestionsRightBleed={72} 
					style={styles.searchBarOverride}
				/>

				{/* Identity Squircle */}
				<Pressable
					onPress={onAvatarPress}
					style={({ pressed }) => [
						styles.avatarFrame,
						{
							backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
							borderColor: isDarkMode ? COLORS.brandPrimary + "40" : COLORS.brandPrimary + "20",
							transform: [{ scale: pressed ? 0.92 : 1 }],
						},
					]}
				>
					<Image
						source={avatarSource}
						style={styles.avatarImage}
					/>
					
					{/* Premium Active Indicator - Signature Dot */}
					<Animated.View style={[styles.activeDot, { opacity: fadeAnim }]} />
				</Pressable>
			</View>

			<MiniProfileModal visible={showProfileModal} onClose={onCloseProfileModal} />
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		// Takes up more vertical space as requested
		paddingTop: 8,
		paddingBottom: 12,
	},
	container: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 12, // Modern spacing
	},
	searchBarOverride: {
		flex: 1,
		marginBottom: 0, // Remove default margin as wrapper handles it
	},
	avatarFrame: {
		width: 56, // Larger for vertical presence
		height: 56,
		borderRadius: 18, // Nested Squircle look
		borderWidth: 1.0,
		alignItems: "center",
		justifyContent: "center",
		// Soft shadow to lift identity card
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
		position: 'relative',
	},
	avatarImage: {
		width: 46,
		height: 46,
		borderRadius: 14, // Slightly less rounding than frame for "Nested" effect
	},
	activeDot: {
		position: 'absolute',
		bottom: -2,
		right: -2,
		width: 14,
		height: 14,
		borderRadius: 7,
		backgroundColor: '#10B981', // Medical green
		borderWidth: 2.5,
		borderColor: '#FFFFFF', // Creates a "cutout" effect
	}
});