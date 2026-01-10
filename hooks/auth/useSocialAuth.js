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
					}
				}
			}
			return { success: false, error: "Cancelled or failed" };
		} catch (error) {
			console.error("Social Auth Error:", error);
			return { success: false, error: error.message || "Failed to initiate login" };
		}
	}, [login]);

	return {
		signInWithProvider,
	};
}
