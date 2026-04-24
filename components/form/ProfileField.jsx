import { useState } from "react";
import { View, TextInput, Text, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";

// PULLBACK NOTE: ProfileField - Form field with reduced height and improved squircle
// Removed scale animation, increased squircle-ness, reduced input height
// REASON: Match iOS design patterns with no scaling on focus, more roundness

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

	const handleChangeText = (text) => {
		onChange(text);
	};

	const handleFocus = () => {
		setIsFocused(true);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
	};

	const handleBlur = () => {
		setIsFocused(false);
	};

	const colors = {
		bg: isDarkMode ? COLORS.bgDarkAlt : "#F8F9FA", // PULLBACK NOTE: More muted bg for field
		text: isDarkMode ? COLORS.textLight : COLORS.textPrimary,
		label: isDarkMode ? COLORS.textMutedDark : COLORS.textMuted,
		inputBg: isDarkMode ? "#121826" : "#FFFFFF", // PULLBACK NOTE: Input surface different from field
		activeBg: isDarkMode ? `${COLORS.brandPrimary}15` : "#FFFFFF",
	};

	return (
		<View style={{ marginBottom: 8 }}>
			<Pressable
				onPress={() => {}}
				style={({ pressed }) => [
					{
						backgroundColor: isFocused ? colors.activeBg : colors.bg,
						borderRadius: 24, // PULLBACK NOTE: Increased from 20 to 24 for more squircle-ness
						borderWidth: 0,
						padding: 10,
						flexDirection: "row",
						alignItems: "center",
						borderCurve: Platform.OS === "ios" ? "continuous" : undefined,
						shadowColor: isFocused ? COLORS.brandPrimary : "#000",
						shadowOffset: { width: 0, height: isFocused ? 8 : 4 },
						shadowOpacity: isFocused ? 0.15 : 0.02,
						shadowRadius: isFocused ? 12 : 8,
						elevation: isFocused ? 4 : 0,
						transform: [{ scale: pressed ? 0.98 : 1 }],
					}
				]}
			>
				<View
					style={{
						width: 32,
						height: 32,
						borderRadius: 12, // PULLBACK NOTE: Increased from 10 to 12 for more roundness
						borderCurve: Platform.OS === "ios" ? "continuous" : undefined,
						backgroundColor: `${COLORS.brandPrimary}15`,
						justifyContent: "center",
						alignItems: "center",
						marginRight: 8,
					}}
				>
					<Ionicons name={iconName} size={18} color={COLORS.brandPrimary} />
				</View>

				<View style={{ flex: 1 }}>
					<Text
						style={{
							fontSize: 8,
							color: colors.label,
							marginBottom: 2,
							fontWeight: "700", // PULLBACK NOTE: Reduced from 800 for capitalization
							letterSpacing: 0.3, // PULLBACK NOTE: Reduced from 1.5 for capitalization
							textTransform: "capitalize", // PULLBACK NOTE: Changed from uppercase to capitalize
						}}
					>
						{label}
					</Text>
					<View
						style={{
							backgroundColor: colors.inputBg,
							borderRadius: 12, // PULLBACK NOTE: Increased from 10 to 12 for more squircle-ness
							paddingHorizontal: 10,
							paddingVertical: 4, // PULLBACK NOTE: Reduced from 6 to 4 for shorter input
							borderCurve: Platform.OS === "ios" ? "continuous" : undefined,
						}}
					>
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
								fontSize: 14,
								color: colors.text,
								fontWeight: "900",
								letterSpacing: -0.5,
								padding: 0,
								minHeight: 20, // PULLBACK NOTE: Reduced from 24 to 20 for shorter input
							}}
							placeholderTextColor={isDarkMode ? COLORS.textMutedDark : COLORS.textMuted}
							selectionColor={COLORS.brandPrimary}
						/>
					</View>
				</View>
				{rightElement}
			</Pressable>
		</View>
	);
};

export default ProfileField;
