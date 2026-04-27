// contexts/AuthContext

/**
 * AuthContext - Global authentication state
 * Uses the database layer for consistent storage access
 */

import { createContext, useState, useEffect, useMemo, useContext, useCallback } from "react";
import { ActivityIndicator, View } from "react-native";
import { authService } from "../services/authService";
import { supabase } from "../services/supabase";
import { database, StorageKeys } from "../database";

// Create AuthContext
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [token, setToken] = useState(null);

	const clearLocalAuthState = useCallback(async () => {
		setUser(null);
		setToken(null);
		await database.delete(StorageKeys.CURRENT_USER);
		await database.delete(StorageKeys.AUTH_TOKEN);
	}, []);

	// **1. Fetch and Sync User Data from API/Service**
	const syncUserData = useCallback(async () => {
		try {
			// Use database layer with proper keys
			const storedToken = await database.read(StorageKeys.AUTH_TOKEN, null);
			if (storedToken) {
				// Seed from cache immediately so auth guard never fires on a stale loading=false state
				const cachedUser = await database.read(StorageKeys.CURRENT_USER, null);
				if (cachedUser) {
					setUser(cachedUser);
					setToken(storedToken);
				}
				const { data: userData } = await authService.getCurrentUser();

				if (userData) {
					// Only update if data actually changed to prevent re-render loops
					setUser(prevUser => {
						if (JSON.stringify(prevUser) === JSON.stringify(userData)) return prevUser;
						return userData;
					});
					setToken(storedToken);
					// Store current user data for quick access
					await database.write(StorageKeys.CURRENT_USER, userData);
				}
			}
		} catch (error) {
			// Ignore expected auth errors that happen during normal session expiry
			const isNotLoggedIn = error.message && (
				error.message.includes("NOT_LOGGED_IN") ||
				error.code === "NOT_LOGGED_IN"
			);
			
			// Handle refresh token errors gracefully - these are expected when session expires
			const isRefreshTokenError = error.message && (
				error.message.includes("Invalid Refresh Token") ||
				error.message.includes("Refresh Token Not Found") ||
				error.message.includes("refresh_token_not_found")
			);

			if (isRefreshTokenError || isNotLoggedIn) {
				// Clean up local state on token expiry
				await clearLocalAuthState();
				return; // Silent handling - no error needed
			}

			console.error("Error syncing user data from API:", error);
		} finally {
			setLoading(false);
		}
	}, [clearLocalAuthState]);

	useEffect(() => {
		syncUserData();
	}, [syncUserData]);

	useEffect(() => {
		const { data: authSubscription } = supabase.auth.onAuthStateChange((event, session) => {
			(async () => {
				try {
					if (event === "SIGNED_OUT" || !session) {
						await clearLocalAuthState();
						setLoading(false);
						return;
					}

					if (event === "TOKEN_REFRESHED" && session?.access_token) {
						setToken(session.access_token);
						await database.write(StorageKeys.AUTH_TOKEN, session.access_token);
						return;
					}

					if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session) {
						await syncUserData();
					}
				} catch (error) {
					console.error("[AuthContext] Auth state listener failed:", error);
				}
			})();
		});

		return () => {
			authSubscription?.subscription?.unsubscribe?.();
		};
	}, [clearLocalAuthState, syncUserData]);

	const authStatus = useMemo(
		() => ({
			isAuthenticated: !!user && !!token,
			isLoggedIn: !!user,
			email: user?.email || null,
			username: user?.username || null,
			fullName: user?.fullName || null,
			imageUri: user?.imageUri || null,
			firstName: user?.firstName || null,
			lastName: user?.lastName || null,
			emailVerified: user?.emailVerified === true,
			phoneVerified: user?.phoneVerified === true,
			hasPassword: user?.hasPassword === true, // FIX: Check the boolean flag, not the password string
			hasInsurance: user?.hasInsurance === true,
		}),
		[user, token]
	);

	// **2. Login function**: Set user and token from API response
	const login = useCallback(async (userData) => {
		try {
			// Set both user and token atomically to prevent auth flash
			// This ensures isAuthenticated is never in a partial state during OAuth
			const tokenToSet = userData.token || null;
			
			setUser(userData);
			setToken(tokenToSet);
			
			// Persist authentication data to secure storage
			await database.write(StorageKeys.CURRENT_USER, userData);

			if (tokenToSet) {
				await database.write(StorageKeys.AUTH_TOKEN, tokenToSet);
			}

			return true;
		} catch (error) {
			console.error("Error saving user data:", error);
			return false;
		}
	}, []);

	// **3. Logout function**: Clear user data and token
	const logout = useCallback(async () => {
		try {
			setUser(null);
			setToken(null);
			// Use API logout and database layer
			await authService.logout();
			await database.delete(StorageKeys.CURRENT_USER);

			// Clear any pending registration data to prevent "Complete profile" toasts for next user
			await authService.clearPendingRegistration();

			return { success: true, message: "Successfully logged out" };
		} catch (error) {
			console.error("Error clearing user data:", error);
			return { success: false, message: "Logout failed" };
		}
	}, []);

	// **4. Delete Account function**
	const deleteAccount = useCallback(async () => {
		try {
			await authService.deleteUser();
			// Perform local cleanup same as logout
			setUser(null);
			setToken(null);
			await database.delete(StorageKeys.CURRENT_USER);
			await authService.clearPendingRegistration();
			return { success: true, message: "Account deleted successfully" };
		} catch (error) {
			console.error("Error deleting account:", error);
			// Even if it fails, we should probably logout locally
			await logout();
			return { success: false, message: "Account deletion failed, logged out locally" };
		}
	}, [logout]);

	const authContextValue = useMemo(
		() => ({
			user: {
				email: authStatus.email,
				username: authStatus.username,
				fullName: authStatus.fullName,
				imageUri: authStatus.imageUri,
				firstName: authStatus.firstName,
				lastName: authStatus.lastName,
				phone: user?.phone || null,
				address: user?.address || null,
				gender: user?.gender || null,
				dateOfBirth: user?.dateOfBirth || null,
				id: user?.id || null,
				createdAt: user?.createdAt || null,
				updatedAt: user?.updatedAt || null,
				emailVerified: authStatus.emailVerified,
				phoneVerified: authStatus.phoneVerified,
				hasPassword: authStatus.hasPassword,
				hasInsurance: authStatus.hasInsurance,
				deferProfileCompletion: user?.deferProfileCompletion === true,
				isAuthenticated: authStatus.isAuthenticated,
				isLoggedIn: authStatus.isLoggedIn,
			},
			login,
			logout,
			deleteAccount,
			syncUserData,
			loading,
		}),
		[authStatus, user, loading]
	);

	// **4. Show a spinner while loading data**
	if (loading) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<ActivityIndicator size="large" color="#86100E" />
			</View>
		);
	}

	// **5. Provide the context to children components**
	return (
		<AuthContext.Provider value={authContextValue}>
			{children}
		</AuthContext.Provider>
	);
};

// **6. Custom hook to access `AuthContext`**
export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
