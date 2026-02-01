import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, ScrollView } from "react-native";
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
import { useToast } from "../../contexts/ToastContext";
import { COLORS } from "../../constants/colors";
import * as Haptics from "expo-haptics";

const SUGGESTED_SEARCHES = [
	{ text: "Emergency", icon: "alert-circle-outline" },
	{ text: "ICU", icon: "bed-outline" },
	{ text: "Trauma", icon: "medkit-outline" },
	{ text: "Cardiology", icon: "heart-outline" },
];

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
	const { showToast } = useToast();
	const inputRef = useRef(null);
	const [isFocused, setIsFocused] = useState(false);
	const focusProgress = useSharedValue(0);

	// 🔴 REVERT POINT: Move shared value updates out of render path
	// PREVIOUS: focusProgress.value updated in useEffect
	// NEW: focusProgress.value updated in event handlers to avoid render-phase race conditions
	// REVERT TO: The useEffect block below
	/*
	useEffect(() => {
		focusProgress.value = withSpring(isFocused ? 1 : 0, { damping: 20, stiffness: 300 });
	}, [isFocused]);
	*/

	// Finalized Premium Colors
	const backgroundColor = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
	const activeBG = isDarkMode ? "#1E293B" : "#FFFFFF";
	const textColor = isDarkMode ? "#FFFFFF" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";

	const handleFocus = useCallback(() => {
		setIsFocused(true);
		focusProgress.value = withSpring(1, { damping: 20, stiffness: 300 });
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onFocus?.();
	}, [onFocus, focusProgress]);

	const handleBlurEvent = useCallback(() => {
		setIsFocused(false);
		focusProgress.value = withSpring(0, { damping: 20, stiffness: 300 });
		onBlur?.();
	}, [onBlur, focusProgress]);

	const handleVoice = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		if (onVoicePress) {
			onVoicePress();
		} else {
			inputRef.current?.focus();
			showToast("Tap the microphone on your keyboard", "info");
		}
	}, [onVoicePress, showToast]);

	const animatedContainerStyle = useAnimatedStyle(() => ({
		transform: [{ scale: interpolate(focusProgress.value, [0, 1], [1, 1.01]) }],
	}));

	const suggestedItems = value.trim()
		? SUGGESTED_SEARCHES.filter(s => s.text.toLowerCase().includes(value.toLowerCase()))
		: SUGGESTED_SEARCHES;

	return (
		<View style={[styles.wrapper, style]}>
			<Animated.View style={[styles.container, animatedContainerStyle]}>
				<View
					style={[
						styles.inputContainer,
						{
							backgroundColor: isFocused ? activeBG : backgroundColor,
							// Shadow Glow on Focus
							shadowColor: isFocused ? COLORS.brandPrimary : "#000",
							shadowOpacity: isFocused ? 0.15 : 0.03,
							shadowRadius: isFocused ? 15 : 8,
							elevation: isFocused ? 6 : 2,
						},
					]}
				>
					<Ionicons
						name="search"
						size={20}
						color={isFocused ? COLORS.brandPrimary : mutedColor}
						style={styles.searchIcon}
					/>

					<TextInput
						ref={inputRef}
						style={[styles.input, { color: textColor }]}
						value={value}
						onChangeText={onChangeText}
						placeholder={placeholder}
						placeholderTextColor={mutedColor}
						onFocus={handleFocus}
						onBlur={handleBlurEvent}
						autoCapitalize="none"
						returnKeyType="search"
						selectionColor={COLORS.brandPrimary}
					/>

					{/* Action Buttons: Nested Squircle Logic */}
					<View style={styles.rightActions}>
						{value.length > 0 ? (
							<Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChangeText(""); }} style={styles.clearBtn}>
								<Ionicons name="close-circle" size={20} color={mutedColor} />
							</Pressable>
						) : (
							<Pressable
								onPress={handleVoice}
								style={({ pressed }) => [
									styles.micSquircle,
									{
										backgroundColor: isFocused ? (isDarkMode ? "#2D3748" : "#F1F5F9") : "rgba(0,0,0,0.05)",
										opacity: pressed ? 0.7 : 1
									}
								]}
							>
								<Ionicons name="mic" size={18} color={COLORS.brandPrimary} />
							</Pressable>
						)}
					</View>
				</View>
			</Animated.View>

			{/* Suggestions Panel: Floating Micro-Cards */}
			{isFocused && showSuggestions && suggestedItems.length > 0 && (
				<Animated.View
					entering={FadeIn.duration(200)}
					exiting={FadeOut.duration(150)}
					style={[
						styles.dropdown,
						{
							backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF",
							shadowOpacity: isDarkMode ? 0.3 : 0.08,
						},
					]}
				>
					<Text style={[styles.label, { color: mutedColor }]}>QUICK SEARCH</Text>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList} keyboardShouldPersistTaps="handled">
						{suggestedItems.map((item, index) => (
							<Pressable
								key={index}
								onPress={() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									onChangeText(item.text);
									inputRef.current?.blur();
								}}
								style={({ pressed }) => [
									styles.chip,
									{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", opacity: pressed ? 0.7 : 1 }
								]}
							>
								<Ionicons name={item.icon} size={14} color={COLORS.brandPrimary} style={{ marginRight: 6 }} />
								<Text style={[styles.chipText, { color: textColor }]}>{item.text}</Text>
							</Pressable>
						))}
					</ScrollView>
				</Animated.View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		marginBottom: 16,
		zIndex: 50,
	},
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		height: 56, // Thicker for premium feel
		borderRadius: 28, // High rounding
		paddingHorizontal: 16,
		shadowOffset: { width: 0, height: 8 },
	},
	searchIcon: {
		marginRight: 10,
	},
	input: {
		flex: 1,
		fontSize: 16,
		fontWeight: "600",
		letterSpacing: -0.4,
	},
	rightActions: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	micSquircle: {
		width: 38,
		height: 38,
		borderRadius: 12, // Nested Squircle
		alignItems: "center",
		justifyContent: "center",
	},
	clearBtn: {
		padding: 4,
	},
	dropdown: {
		marginTop: 10,
		borderRadius: 32, // Consistent with cards
		padding: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 12 },
		shadowRadius: 16,
		elevation: 8,
	},
	label: {
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 1.2,
		marginBottom: 12,
		marginLeft: 4,
	},
	chipList: {
		gap: 8,
		paddingRight: 10,
	},
	chip: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 16,
	},
	chipText: {
		fontSize: 13,
		fontWeight: '700',
	},
});