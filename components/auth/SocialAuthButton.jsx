//components/auth/SocialAuthButton.jsx

import { useRef, useState } from "react";
import { Pressable, Animated, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { useRegistration } from "../../contexts/RegistrationContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useSocialAuth } from "../../hooks/auth/useSocialAuth";
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
	apple: { icon: "logo-apple", name: "Apple Sign In" },
	google: { icon: "logo-google", name: "Google Sign In" },
	x: { icon: "logo-x", name: "X (Twitter)" },
};

// Ensure WebBrowser cleanup on iOS
WebBrowser.maybeCompleteAuthSession();

export default function SocialAuthButton({ provider }) {
	const scale = useRef(new Animated.Value(1)).current;
	const { isDarkMode } = useTheme();
	const { showToast } = useToast();
    const { login } = useAuth();
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

        if (provider === "apple") {
            // -----------------------------------------------------------
            // [APPLE LOGIN ACTIVATION]
            // To enable Apple Sign In when you have the Service ID & Secret:
            // 1. Setup Apple Provider in Supabase Dashboard.
            // 2. Remove or comment out the following 2 lines:
            // -----------------------------------------------------------
            setShowComingSoon(true);
            return;
        }

        try {
            const { success, error } = await signInWithProvider(provider);
            if (success) {
                showToast("Successfully logged in", "success");
            } else if (error && error !== "Cancelled or failed") {
                showToast(error, "error");
            }
        } catch (error) {
            console.error("Social Auth Error:", error);
            showToast(error.message || "Failed to initiate login", "error");
        }
	};

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

            <ComingSoonModal 
                visible={showComingSoon} 
                onClose={() => setShowComingSoon(false)}
                featureName={meta.name}
            />
        </>
	);
}
