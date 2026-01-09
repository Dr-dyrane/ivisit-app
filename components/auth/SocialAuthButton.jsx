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
import { authService } from "../../services/authService";
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
            setShowComingSoon(true);
            return;
        }

        try {
            const { data } = await authService.signInWithProvider(provider);
            if (data?.url) {
                // Open the auth URL in an in-app browser
                const result = await WebBrowser.openAuthSessionAsync(
                    data.url,
                    "ivisit://auth/callback"
                );
                
                if (result.type === "success" && result.url) {
                    // Handle callback and session exchange
                    const { data: authData } = await authService.handleOAuthCallback(result.url);
                    
                    if (authData?.user) {
                        await login(authData.user);
                        showToast("Successfully logged in", "success");
                    }
                }
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
