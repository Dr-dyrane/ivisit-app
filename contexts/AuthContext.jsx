// contexts/AuthContext

/**
 * AuthContext - Global authentication state
 * Uses the database layer for consistent storage access
 */

import { createContext, useState, useEffect, useMemo, useContext } from "react";
import { ActivityIndicator, View } from "react-native";
import { getCurrentUserAPI, logoutAPI } from "../api/auth";
import { database, StorageKeys } from "../database";

// Create AuthContext
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [token, setToken] = useState(null);

	// **1. Fetch and Sync User Data from API/Service**
	const syncUserData = async () => {
		try {
			// Use database layer with proper keys
			const storedToken = await database.read(StorageKeys.AUTH_TOKEN, null);
			if (storedToken) {
				const { data: userData } = await getCurrentUserAPI();

				if (userData) {
					setUser(userData);
					setToken(storedToken);
					// Store current user data for quick access
					await database.write(StorageKeys.CURRENT_USER, userData);
				}
			}
		} catch (error) {
            // Ignore "not logged in" error as it is expected when session expires or token is invalid
            const isNotLoggedIn = error.message && (
                error.message.includes("NOT_LOGGED_IN") || 
                error.code === "NOT_LOGGED_IN"
            );
            
            if (!isNotLoggedIn) {
			    console.error("Error syncing user data from API:", error);
            }
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		syncUserData();
	}, []);

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
			hasPassword: !!user?.password,
		}),
		[user, token]
	);

	// **2. Login function**: Set user and token from API response
	const login = async (userData) => {
		try {
			setUser(userData);
			// Use database layer with proper keys
			await database.write(StorageKeys.CURRENT_USER, userData);

			if (userData.token) {
				setToken(userData.token);
				await database.write(StorageKeys.AUTH_TOKEN, userData.token);
			}

			return true;
		} catch (error) {
			console.error("Error saving user data:", error);
			return false;
		}
	};

	// **3. Logout function**: Clear user data and token
	const logout = async () => {
		try {
			setUser(null);
			setToken(null);
			// Use API logout and database layer
			await logoutAPI();
			await database.delete(StorageKeys.CURRENT_USER);
			return { success: true, message: "Successfully logged out" };
		} catch (error) {
			console.error("Error clearing user data:", error);
			return { success: false, message: "Logout failed" };
		}
	};

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
				emailVerified: authStatus.emailVerified,
				phoneVerified: authStatus.phoneVerified,
				hasPassword: authStatus.hasPassword,
				isAuthenticated: authStatus.isAuthenticated,
				isLoggedIn: authStatus.isLoggedIn,
			},
			login,
			logout,
			syncUserData,
			loading,
		}),
		[authStatus, loading]
	);

	// **4. Show a spinner while loading data**
	if (loading) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<ActivityIndicator size="large" color="#00ff00" />
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
