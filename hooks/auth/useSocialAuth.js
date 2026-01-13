import { useCallback, useContext } from "react";
import * as WebBrowser from "expo-web-browser";
import { authService } from "../../services/authService";
import { AuthContext } from "../../contexts/AuthContext";

export function useSocialAuth() {
	const { login } = useContext(AuthContext);

	const signInWithProvider = useCallback(async (provider) => {
		try {
			const { data } = await authService.signInWithProvider(provider);
			if (data?.url) {
				const result = await WebBrowser.openAuthSessionAsync(
					data.url,
					"ivisit://auth/callback" // Deep link scheme
				);

				if (result.type === "success" && result.url) {
					const { data: authData } = await authService.handleOAuthCallback(result.url);

					if (authData?.user) {
						await login(authData.user);
						return { success: true };
					} else {
						return { success: false, error: "Authentication failed" };
					}
				} else if (result.type === "cancel") {
					return { success: false, error: "cancelled" };
				} else if (result.type === "dismiss") {
					return { success: false, error: "dismissed" };
				}
			}
			return { success: false, error: "Cancelled or failed" };
		} catch (error) {
			console.error("Social Auth Error:", error);
			
			// Handle specific OAuth errors
			let errorMessage = "Failed to initiate login";
			
			if (error.message) {
				if (error.message.includes("network") || error.message.includes("connection")) {
					errorMessage = "Network connection error. Please check your internet.";
				} else if (error.message.includes("popup") || error.message.includes("blocked")) {
					errorMessage = "Popup was blocked. Please allow popups for this app.";
				} else if (error.message.includes("cancelled") || error.message.includes("dismissed")) {
					errorMessage = "cancelled";
				} else {
					errorMessage = error.message;
				}
			}
			
			return { success: false, error: errorMessage };
		}
	}, [login]);

	return {
		signInWithProvider,
	};
}
