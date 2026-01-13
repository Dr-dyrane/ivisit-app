import { useState, useRef } from "react";
import { View, TextInput, Text, Animated, Pressable } from "react-native";
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
	secureTextEntry = false,
	placeholder = "",
	rightElement = null,
	...props
}) => {
	const { isDarkMode } = useTheme();
	const [isFocused, setIsFocused] = useState(false);
	const scaleAnim = useRef(new Animated.Value(1)).current;

	const handleChangeText = (text) => {
		console.log('[ProfileField] onChangeText:', { text, label, value });
		onChange(text);
	};

	const handleFocus = () => {
		console.log('[ProfileField] onFocus:', { label, value });
		setIsFocused(true);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		Animated.spring(scaleAnim, {
			toValue: 1.02,
			friction: 8,
			useNativeDriver: true,
		}).start();
	};

	const handleBlur = () => {
		console.log('[ProfileField] onBlur:', { label, value });
		setIsFocused(false);
		Animated.spring(scaleAnim, {
			toValue: 1,
			friction: 8,
			useNativeDriver: true,
		}).start();
	};

	const handlePressIn = () => {
		console.log('[ProfileField] handlePressIn:', { label });
	};

	const handlePressOut = () => {
		console.log('[ProfileField] handlePressOut:', { label });
	};

	const handleContainerPress = () => {
		console.log('[ProfileField] handleContainerPress:', { label, editable });
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
			<Pressable
				onPress={handleContainerPress}
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				style={({ pressed }) => [
					{
						backgroundColor: colors.bg,
						borderRadius: 24,
						borderWidth: isFocused ? 2 : 0,
						borderColor: colors.border,
						padding: 16,
						flexDirection: "row",
						alignItems: "center",
						shadowColor: isFocused ? COLORS.brandPrimary : "transparent",
						shadowOffset: { width: 0, height: 4 },
						shadowOpacity: 0.2,
						shadowRadius: 8,
						transform: [{ scale: pressed ? 0.98 : 1 }],
					}
				]}
			>
				<View
					style={{
						width: 44,
						height: 44,
						borderRadius: 14,
						backgroundColor: `${COLORS.brandPrimary}15`,
						justifyContent: "center",
						alignItems: "center",
						marginRight: 12,
					}}
				>
					<Ionicons name={iconName} size={22} color={COLORS.brandPrimary} />
				</View>

				<View style={{ flex: 1 }}>
					<Text
						style={{
							fontSize: 10,
							color: colors.label,
							marginBottom: 4,
							fontWeight: "800",
							letterSpacing: 1.5,
							textTransform: "uppercase",
						}}
					>
						{label}
					</Text>
					<TextInput
						value={value}
						onChangeText={handleChangeText}
						onFocus={handleFocus}
						onBlur={handleBlur}
						editable={editable}
						keyboardType={keyboardType}
						secureTextEntry={secureTextEntry}
						placeholder={placeholder}
						autoCorrect={false}
						autoCapitalize="none"
						{...props}
						style={{
							fontSize: 16,
							color: colors.text,
							fontWeight: "900",
							letterSpacing: -0.5,
							padding: 0,
						}}
						placeholderTextColor={isDarkMode ? COLORS.textMutedDark : COLORS.textMuted}
						selectionColor={COLORS.brandPrimary}
					/>
				</View>
				{rightElement}
			</Pressable>
		</Animated.View>
	);
};

export default ProfileField;
