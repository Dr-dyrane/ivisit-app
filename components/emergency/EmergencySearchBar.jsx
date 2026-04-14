import React, {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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

const EmergencySearchBar = forwardRef(function EmergencySearchBar({
	value = "",
	onChangeText,
	onFocus,
	onBlur,
	onClear,
	onVoicePress,
	placeholder = "Search hospitals, specialties...",
	showSuggestions = true,
	autoFocus = false,
	compact = false,
	glassSurface = false,
	style,
}, ref) {
	const { isDarkMode } = useTheme();
	const { showToast } = useToast();
	const inputRef = useRef(null);
	const [isFocused, setIsFocused] = useState(false);
	const focusProgress = useSharedValue(0);

	useImperativeHandle(ref, () => ({
		focus: () => inputRef.current?.focus(),
		blur: () => inputRef.current?.blur(),
		clear: () => inputRef.current?.clear(),
	}), []);

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
	const isAndroid = Platform.OS === "android";
	const backgroundColor =
		Platform.OS === "android"
			? (isDarkMode ? COLORS.bgDarkAlt : "#EEF2F7")
			: (isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)");
	const activeBG = isDarkMode ? "#1E293B" : "#FFFFFF";
	const textColor = isDarkMode ? "#FFFFFF" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const inputGlassSurface = isFocused
		? (isAndroid
			? (isDarkMode ? "rgba(30, 41, 59, 0.78)" : "rgba(255, 255, 255, 0.88)")
			: glassSurface
				? (isDarkMode ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.42)")
				: activeBG)
		: (isAndroid
			? (isDarkMode ? "rgba(18, 24, 38, 0.74)" : "rgba(238, 242, 247, 0.80)")
			: glassSurface
				? (isDarkMode ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.28)")
				: backgroundColor);
	const inputShadowLayer = isFocused
		? (isDarkMode ? "rgba(134, 16, 14, 0.16)" : "rgba(134, 16, 14, 0.10)")
		: (isDarkMode ? "rgba(0, 0, 0, 0.24)" : "rgba(15, 23, 42, 0.12)");
	const micGlassSurface = isFocused
		? (isAndroid
			? (isDarkMode ? "rgba(45, 55, 72, 0.72)" : "rgba(241, 245, 249, 0.84)")
			: (isDarkMode ? "#2D3748" : "#F1F5F9"))
		: (isAndroid
			? (isDarkMode ? "rgba(11, 15, 26, 0.70)" : "rgba(226, 232, 240, 0.74)")
			: "rgba(0,0,0,0.05)");
	const micShadowLayer = isDarkMode ? "rgba(0, 0, 0, 0.24)" : "rgba(15, 23, 42, 0.12)";
	const dropdownShadowLayer = isDarkMode ? "rgba(0, 0, 0, 0.24)" : "rgba(15, 23, 42, 0.12)";
	const inputHeight = compact ? 38 : 56;
	const inputRadius = compact ? 18 : 28;
	const inputPaddingX = compact ? 12 : 16;
	const searchIconSize = compact ? 17 : 20;
	const searchIconMarginRight = compact ? 7 : 10;
	const inputFontSize = compact ? 14 : 16;
	const micSize = compact ? 28 : 38;
	const micRadius = compact ? 10 : 12;
	const clearButtonPadding = compact ? 3 : 4;
	const inputGlassColors = isDarkMode
		? ["rgba(255,255,255,0.13)", "rgba(148,163,184,0.065)", "rgba(255,255,255,0.02)"]
		: ["rgba(255,255,255,0.86)", "rgba(255,255,255,0.52)", "rgba(255,255,255,0.22)"];

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
				<View style={[styles.inputShell, { borderRadius: inputRadius }]}>
					{isAndroid && (
						<View
							pointerEvents="none"
							style={[
								styles.inputShadowUnderlay,
								{
									backgroundColor: inputShadowLayer,
									borderRadius: inputRadius,
								},
							]}
						/>
					)}
					<View
						style={[
							styles.inputContainer,
							{
								height: inputHeight,
								borderRadius: inputRadius,
								paddingHorizontal: inputPaddingX,
								backgroundColor: inputGlassSurface,
								// Shadow Glow on Focus
								shadowColor: isFocused ? COLORS.brandPrimary : "#000",
								shadowOpacity: isAndroid ? 0 : (isFocused ? 0.15 : 0.03),
								shadowRadius: isAndroid ? 0 : (isFocused ? 15 : 8),
								elevation: isAndroid ? 0 : (isFocused ? 6 : 2),
							},
						]}
					>
					{glassSurface ? (
						<LinearGradient
							pointerEvents="none"
							colors={inputGlassColors}
							locations={[0, 0.5, 1]}
							start={{ x: 0.5, y: 0 }}
							end={{ x: 0.5, y: 1 }}
							style={styles.inputGlassFill}
						/>
					) : null}
					<Ionicons
						name="search"
						size={searchIconSize}
						color={isFocused ? COLORS.brandPrimary : mutedColor}
						style={[styles.searchIcon, { marginRight: searchIconMarginRight }]}
					/>

					<TextInput
						ref={inputRef}
						style={[styles.input, { color: textColor, fontSize: inputFontSize }]}
						value={value}
						onChangeText={onChangeText}
						placeholder={placeholder}
						placeholderTextColor={mutedColor}
						onFocus={handleFocus}
						onBlur={handleBlurEvent}
						autoCapitalize="none"
						autoFocus={autoFocus}
						returnKeyType="search"
						selectionColor={COLORS.brandPrimary}
					/>

					{/* Action Buttons: Nested Squircle Logic */}
					<View style={styles.rightActions}>
						{value.length > 0 ? (
							<Pressable
								onPress={() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									onChangeText("");
								}}
								style={[styles.clearBtn, { padding: clearButtonPadding }]}
							>
								<Ionicons name="close-circle" size={20} color={mutedColor} />
							</Pressable>
						) : (
							<Pressable
								onPress={handleVoice}
								style={({ pressed }) => [
									styles.micPressable,
									{
										width: micSize,
										height: micSize,
									},
									{
										opacity: pressed ? 0.7 : 1,
										transform: [{ scale: pressed ? 0.96 : 1 }],
									}
								]}
							>
								{isAndroid && (
									<View
										pointerEvents="none"
										style={[
											styles.micShadowUnderlay,
											{
												backgroundColor: micShadowLayer,
												borderRadius: micRadius,
											},
										]}
									/>
								)}
								<View
									style={[
										styles.micSquircle,
										{
											width: micSize,
											height: micSize,
											borderRadius: micRadius,
											backgroundColor: micGlassSurface,
										},
									]}
								>
									<Ionicons name="mic" size={18} color={COLORS.brandPrimary} />
								</View>
							</Pressable>
						)}
					</View>
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
							shadowOpacity: isAndroid ? 0 : (isDarkMode ? 0.3 : 0.08),
							shadowRadius: isAndroid ? 0 : 16,
							elevation: isAndroid ? 0 : 8,
						},
					]}
				>
					{isAndroid && (
						<View
							pointerEvents="none"
							style={[
								styles.dropdownShadowUnderlay,
								{ backgroundColor: dropdownShadowLayer },
							]}
						/>
					)}
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
									{
										backgroundColor:
											Platform.OS === "android"
												? (isDarkMode ? COLORS.bgDark : "#EEF2F7")
												: (isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"),
										opacity: pressed ? 0.7 : 1,
									}
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
});

export default EmergencySearchBar;

const styles = StyleSheet.create({
	wrapper: {
		marginBottom: 16,
		zIndex: 50,
	},
	inputShell: {
		position: "relative",
		borderRadius: 28,
		overflow: "visible",
	},
	inputShadowUnderlay: {
		position: "absolute",
		top: 2,
		left: 0,
		right: 0,
		bottom: -2,
		borderRadius: 28,
	},
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		height: 56, // Thicker for premium feel
		borderRadius: 28, // High rounding
		paddingHorizontal: 16,
		shadowOffset: { width: 0, height: 8 },
		overflow: "hidden",
		position: "relative",
	},
	inputGlassFill: {
		...StyleSheet.absoluteFillObject,
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
	micPressable: {
		width: 38,
		height: 38,
		position: "relative",
		alignItems: "center",
		justifyContent: "center",
	},
	micShadowUnderlay: {
		position: "absolute",
		top: 2,
		left: 0,
		right: 0,
		bottom: -2,
		borderRadius: 12,
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
		position: "relative",
		marginTop: 10,
		borderRadius: 32, // Consistent with cards
		padding: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 12 },
		shadowRadius: 16,
		elevation: 8,
	},
	dropdownShadowUnderlay: {
		position: "absolute",
		top: 2,
		left: 0,
		right: 0,
		bottom: -2,
		borderRadius: 32,
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
