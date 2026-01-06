"use client";

import { useState, useRef } from "react";
import { View, TextInput, Text, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

const ProfileField = ({
	label,
	value,
	onChange,
	iconName,
	editable = true,
	keyboardType = "default",
}) => {
	const { isDarkMode } = useTheme();
	const [isFocused, setIsFocused] = useState(false);
	const scaleAnim = useRef(new Animated.Value(1)).current;

	const handleFocus = () => {
		setIsFocused(true);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		Animated.spring(scaleAnim, {
			toValue: 1.02,
			friction: 8,
			useNativeDriver: true,
		}).start();
	};

	const handleBlur = () => {
		setIsFocused(false);
		Animated.spring(scaleAnim, {
			toValue: 1,
			friction: 8,
			useNativeDriver: true,
		}).start();
	};

	const colors = {
		bg: isDarkMode ? COLORS.bgDarkAlt : "#F3F4F6",
		text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
		label: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
		border: isFocused ? COLORS.brandPrimary : "transparent",
	};

	return (
		<Animated.View
			style={{
				transform: [{ scale: scaleAnim }],
				marginBottom: 16,
			}}
		>
			<View
				style={{
					backgroundColor: colors.bg,
					borderRadius: 16,
					borderWidth: 2,
					borderColor: colors.border,
					padding: 16,
					flexDirection: "row",
					alignItems: "center",
				}}
			>
				<View
					style={{
						width: 40,
						height: 40,
						borderRadius: 12,
						backgroundColor: `${COLORS.brandPrimary}15`,
						justifyContent: "center",
						alignItems: "center",
						marginRight: 12,
					}}
				>
					<Ionicons name={iconName} size={20} color={COLORS.brandPrimary} />
				</View>

				<View style={{ flex: 1 }}>
					<Text
						style={{
							fontSize: 11,
							color: colors.label,
							marginBottom: 4,
							fontWeight: "600",
						}}
					>
						{label}
					</Text>
					<TextInput
						value={value}
						onChangeText={onChange}
						onFocus={handleFocus}
						onBlur={handleBlur}
						editable={editable}
						keyboardType={keyboardType}
						style={{
							fontSize: 16,
							color: colors.text,
							fontWeight: "600",
							padding: 0,
						}}
						placeholderTextColor={COLORS.textMuted}
						selectionColor={COLORS.brandPrimary}
					/>
				</View>
			</View>
		</Animated.View>
	);
};

export default ProfileField;
