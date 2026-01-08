import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	interpolate,
	FadeIn,
	FadeOut,
} from "react-native-reanimated";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

// Suggested searches for emergency context
const SUGGESTED_SEARCHES = [
	{ text: "Emergency", icon: "alert-circle" },
	{ text: "ICU", icon: "bed-outline" },
	{ text: "Trauma", icon: "medkit" },
	{ text: "Cardiology", icon: "heart" },
];

/**
 * EmergencySearchBar - Smart context-aware search
 *
 * Features:
 * - Voice/mic button for faster emergency input
 * - Searches hospitals by name, specialty, address
 * - Suggested searches when focused
 * - Expands on focus for better UX
 * - Always visible even when sheet is collapsed
 */
export default function EmergencySearchBar({
	value = "",
	onChangeText,
	onFocus,
	onBlur,
	onClear,
	onVoicePress,
	placeholder = "Search hospitals, specialties...",
	showSuggestions = true,
	style,
}) {
	const { isDarkMode } = useTheme();
	const inputRef = useRef(null);
	const [isFocused, setIsFocused] = useState(false);

	// Animation values
	const focusProgress = useSharedValue(0);

	useEffect(() => {
		focusProgress.value = withSpring(isFocused ? 1 : 0, {
			damping: 20,
			stiffness: 300,
		});
	}, [isFocused]);

	// Solid card colors matching app design system (no borders)
	const backgroundColor = isDarkMode ? "#0B0F1A" : "#F3E7E7";
	const textColor = isDarkMode ? "#FFFFFF" : "#0F172A";
	const placeholderColor = isDarkMode ? "#64748B" : "#94A3B8";
	const iconColor = isFocused ? COLORS.brandPrimary : (isDarkMode ? "#64748B" : "#94A3B8");

	const handleFocus = useCallback(() => {
		setIsFocused(true);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		if (onFocus) onFocus();
	}, [onFocus]);

	const handleBlurEvent = useCallback(() => {
		setIsFocused(false);
		if (onBlur) onBlur();
	}, [onBlur]);

	const handleClear = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		if (onClear) onClear();
		if (onChangeText) onChangeText("");
	}, [onClear, onChangeText]);

	const handleVoice = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		if (onVoicePress) onVoicePress();
	}, [onVoicePress]);

	const handleSuggestionPress = useCallback((suggestion) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		if (onChangeText) onChangeText(suggestion);
		inputRef.current?.blur();
	}, [onChangeText]);

	// Animated container style
	const animatedContainerStyle = useAnimatedStyle(() => {
		return {
			transform: [
				{ scale: interpolate(focusProgress.value, [0, 1], [1, 1.01]) },
			],
		};
	});

	const showSuggestionsDropdown = isFocused && showSuggestions && value.length === 0;

	return (
		<View style={[styles.wrapper, style]}>
			<Animated.View style={[styles.container, animatedContainerStyle]}>
				<View
					style={[
						styles.inputContainer,
						{
							backgroundColor,
							...Platform.select({
								ios: {
									shadowColor: isFocused ? COLORS.brandPrimary : "#000",
									shadowOffset: { width: 0, height: isFocused ? 4 : 2 },
									shadowOpacity: isFocused ? 0.1 : 0.03,
									shadowRadius: isFocused ? 10 : 6,
								},
								android: { elevation: isFocused ? 3 : 1 },
							}),
						},
					]}
				>
					{/* Search Icon */}
					<Ionicons
						name="search"
						size={20}
						color={iconColor}
						style={styles.searchIcon}
					/>

					{/* Text Input */}
					<TextInput
						ref={inputRef}
						style={[styles.input, { color: textColor }]}
						value={value}
						onChangeText={onChangeText}
						placeholder={placeholder}
						placeholderTextColor={placeholderColor}
						onFocus={handleFocus}
						onBlur={handleBlurEvent}
						autoCapitalize="none"
						autoCorrect={false}
						returnKeyType="search"
						selectionColor={COLORS.brandPrimary}
					/>

					{/* Clear Button */}
					{value.length > 0 && (
						<Pressable
							onPress={handleClear}
							style={({ pressed }) => [
								styles.actionButton,
								{ opacity: pressed ? 0.6 : 1 },
							]}
							hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
						>
							<Ionicons name="close-circle" size={18} color={iconColor} />
						</Pressable>
					)}

					{/* Voice/Mic Button */}
					{value.length === 0 && (
						<Pressable
							onPress={handleVoice}
							style={({ pressed }) => [
								styles.actionButton,
								styles.micButton,
								{
									backgroundColor: isDarkMode
										? "rgba(255, 255, 255, 0.05)"
										: "rgba(0, 0, 0, 0.04)",
									opacity: pressed ? 0.7 : 1,
									transform: [{ scale: pressed ? 0.95 : 1 }],
								},
							]}
							hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
						>
							<Ionicons
								name="mic"
								size={18}
								color={COLORS.brandPrimary}
							/>
						</Pressable>
					)}
				</View>
			</Animated.View>

			{/* Suggestions Dropdown */}
			{showSuggestionsDropdown && (
				<Animated.View
					entering={FadeIn.duration(200)}
					exiting={FadeOut.duration(150)}
					style={[
						styles.suggestionsContainer,
						{
							backgroundColor,
							...Platform.select({
								ios: {
									shadowColor: "#000",
									shadowOffset: { width: 0, height: 4 },
									shadowOpacity: 0.08,
									shadowRadius: 12,
								},
								android: { elevation: 4 },
							}),
						},
					]}
				>
					<Text
						style={[
							styles.suggestionsLabel,
							{ color: isDarkMode ? "#64748B" : "#94A3B8" },
						]}
					>
						Suggested
					</Text>
					<View style={styles.suggestionsList}>
						{SUGGESTED_SEARCHES.map((item, index) => (
							<Pressable
								key={index}
								onPress={() => handleSuggestionPress(item.text)}
								style={({ pressed }) => [
									styles.suggestionChip,
									{
										backgroundColor: isDarkMode
											? "rgba(255, 255, 255, 0.06)"
											: "rgba(0, 0, 0, 0.04)",
										opacity: pressed ? 0.7 : 1,
									},
								]}
							>
								<Ionicons
									name={item.icon}
									size={14}
									color={COLORS.brandPrimary}
									style={{ marginRight: 6 }}
								/>
								<Text
									style={[
										styles.suggestionText,
										{ color: textColor },
									]}
								>
									{item.text}
								</Text>
							</Pressable>
						))}
					</View>
				</Animated.View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		marginBottom: 16,
	},
	container: {},
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		height: 52,
		borderRadius: 30, // More rounded, no borders
		paddingHorizontal: 18,
	},
	searchIcon: {
		marginRight: 12,
	},
	input: {
		flex: 1,
		fontSize: 16,
		fontWeight: "500",
	},
	actionButton: {
		marginLeft: 8,
	},
	micButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
	},
	suggestionsContainer: {
		marginTop: 8,
		borderRadius: 20,
		padding: 14,
	},
	suggestionsLabel: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 1,
		marginBottom: 10,
		textTransform: "uppercase",
	},
	suggestionsList: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	suggestionChip: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
	},
	suggestionText: {
		fontSize: 13,
		fontWeight: "600",
	},
});

