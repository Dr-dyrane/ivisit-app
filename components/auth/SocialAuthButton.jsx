//components/auth/SocialAuthButton.jsx

import { useRef, useState } from "react";
import { Pressable, Animated, Dimensions } from "react-native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { useRegistration } from "../../contexts/RegistrationContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useSocialAuth } from "../../hooks/auth";
import ComingSoonModal from "../ui/ComingSoonModal";

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
	apple: { icon: "logo-apple", name: "Apple Sign In", set: "Ionicons" }, // [SOCIAL-AUTH-UPDATE] Enabled Apple Sign In
	google: { icon: "logo-google", name: "Google Sign In", set: "Ionicons" },
	twitter: { icon: "x-twitter", name: "X Sign In", set: "FontAwesome6" }, // [SOCIAL-AUTH-UPDATE] Added X (Twitter)
};

// Ensure WebBrowser cleanup on iOS
WebBrowser.maybeCompleteAuthSession();

export default function SocialAuthButton({ provider }) {
	const scale = useRef(new Animated.Value(1)).current;
	const { isDarkMode } = useTheme();
	const { showToast } = useToast();
	const { login } = useAuth();
	const { signInWithProvider } = useSocialAuth();
	const [showComingSoon, setShowComingSoon] = useState(false);

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

		// [PRODUCTION-READY] 
		// Apple Login is currently hidden via return null below until Service ID is configured.
		// Once configured, remove the early return in the render method.

		try {
			const { success, error } = await signInWithProvider(provider);
			if (success) {
				showToast("Successfully logged in", "success");
			} else if (error) {
				// Don't show error for user cancellation
				if (!error.includes("cancelled") && !error.includes("dismissed")) {
					showToast(error, "error");
				}
			}
		} catch (error) {
			console.error("Social Auth Error:", error);
			// Handle different types of social auth errors gracefully
			let errorMessage = "Failed to initiate login";

			if (error.message) {
				if (error.message.includes("network") || error.message.includes("connection")) {
					errorMessage = "Network connection error. Please check your internet.";
				} else if (error.message.includes("popup") || error.message.includes("blocked")) {
					errorMessage = "Popup was blocked. Please allow popups for this site.";
				} else if (error.message.includes("cancelled") || error.message.includes("dismissed")) {
					// User cancelled - don't show error
					return;
				} else if (error.message.includes("provider") || error.message.includes("not enabled") || error.message.includes("configuration")) {
					// [SOCIAL-AUTH-UPDATE] Graceful handling for missing Supabase provider config
					errorMessage = `${meta.name} is not available right now. Please try another method.`;
				} else {
					errorMessage = error.message;
				}
			}

			showToast(errorMessage, "error");
		}
	};

	// [SOCIAL-AUTH-UPDATE] Apple Sign In enabled - will show graceful error if Supabase isn't configured

	return (
		<>
			<Pressable onPress={handlePress}>
				<Animated.View
					style={{
						width: width * 0.23,
						height: 64,
						borderRadius: 20,
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: isDarkMode ? "#121826" : "#F3E7E7",
						// borderWidth: 1,
						borderColor: isDarkMode ? "#222" : "#EEE",
						transform: [{ scale }],
					}}
				>
					{meta.set === "FontAwesome6" ? (
						<FontAwesome6
							name={meta.icon}
							size={24}
							color={isDarkMode ? "#FFF" : "#1F2937"}
						/>
					) : (
						<Ionicons
							name={meta.icon}
							size={24}
							color={isDarkMode ? "#FFF" : "#1F2937"}
						/>
					)}
				</Animated.View>
			</Pressable>

			<ComingSoonModal
				visible={showComingSoon}
				onClose={() => setShowComingSoon(false)}
				featureName={meta.name}
			/>
		</>
	);
}
