//components/auth/SocialAuthButton.jsx

import { useRef } from "react";
import { Pressable, Animated, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { useRegistration } from "../../contexts/RegistrationContext";
import * as Haptics from "expo-haptics";

/**
 * SocialAuthButton
 *
 * Auth-domain component.
 * Handles:
 * - Provider identity
 * - Haptics
 * - Animation
 * - Registration dispatch
 *
 * No screen knowledge.
 */

const { width } = Dimensions.get("window");

const PROVIDER_META = {
	apple: { icon: "logo-apple" },
	google: { icon: "logo-google" },
	x: { icon: "logo-x" },
};

export default function SocialAuthButton({ provider }) {
	const scale = useRef(new Animated.Value(1)).current;
	const { isDarkMode } = useTheme();
	const { socialSignUp } = useRegistration();

	const meta = PROVIDER_META[provider];

	const handlePress = async () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

		Animated.sequence([
			Animated.timing(scale, {
				toValue: 0.92,
				duration: 100,
				useNativeDriver: true,
			}),
			Animated.timing(scale, {
				toValue: 1,
				duration: 100,
				useNativeDriver: true,
			}),
		]).start();

		const mockProfile = {
			name: `${provider} user`,
			email: `${provider}_${Date.now()}@example.com`,
		};

		try {
			await socialSignUp(provider, mockProfile);
		} catch (err) {
			console.warn("Social auth error:", err);
		}
	};

	return (
		<Pressable onPress={handlePress}>
			<Animated.View
				style={{
					width: width * 0.23,
					height: 64,
					borderRadius: 20,
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: isDarkMode ? "#121826" : "#F3E7E7",
					borderWidth: 1,
					borderColor: isDarkMode ? "#222" : "#EEE",
					transform: [{ scale }],
				}}
			>
				<Ionicons
					name={meta.icon}
					size={24}
					color={isDarkMode ? "#FFF" : "#1F2937"}
				/>
			</Animated.View>
		</Pressable>
	);
}
