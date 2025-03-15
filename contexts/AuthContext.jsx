import React, {
	createContext,
	useState,
	useEffect,
	useMemo,
	useContext,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View } from "react-native";
import { getCurrentUserAPI } from "../api/auth";

// Create AuthContext
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null); // Initialize user state
	const [loading, setLoading] = useState(true); // Loading state
	const [token, setToken] = useState(null); // Initialize token state

	// **1. Fetch and Sync User Data from API**
	const syncUserData = async () => {
		try {
			const storedToken = await AsyncStorage.getItem("token");
			if (storedToken) {
				// Call your API to get the latest user data
				const { data: userData } = await getCurrentUserAPI(storedToken);

				if (userData) {
					setUser(userData);
					setToken(storedToken);
					// Optionally store the updated user data in AsyncStorage
					await AsyncStorage.setItem("user", JSON.stringify(userData));
				}
			}
		} catch (error) {
			console.error("Error syncing user data from API:", error);
		} finally {
			setLoading(false); // Stop loading when done
		}
	};

	// Use effect to sync data when component mounts
	useEffect(() => {
		syncUserData(); // Sync user data on mount
	}, []);

	// Authentication status derived from user state
	const authStatus = useMemo(
		() => ({
			isAuthenticated: !!user && !!token, // `true` if user and token exist
			isLoggedIn: !!user, // Alias for isAuthenticated
			email: user?.email || null, // Return email or null if not logged in
			username: user?.username || null, // Return username or null if not logged in
			fullName: user?.fullName || null,
			imageUri: user?.imageUri || null,
		}),
		[user, token]
	);

	// **2. Login function**: Set user and token from API response
	const login = async (userData) => {
		try {
			setUser(userData);
			await AsyncStorage.setItem("user", JSON.stringify(userData));

			if (userData.token) {
				setToken(userData.token);
				await AsyncStorage.setItem("token", userData.token);
			}

			return true; // Return true when login is successful
		} catch (error) {
			console.error("Error saving user data:", error);
			return false; // Return false in case of any error
		}
	};

	// **3. Logout function**: Clear user data and token
	const logout = async () => {
		try {
			setUser(null);
			setToken(null);
			await AsyncStorage.removeItem("user");
			await AsyncStorage.removeItem("token");
			return { success: true, message: "Successfully logged out" }; // Return success message
		} catch (error) {
			console.error("Error clearing user data:", error);
			return { success: false, message: "Logout failed" }; // Return failure message
		}
	};

	// Memoize the context value to avoid unnecessary re-renders
	const authContextValue = useMemo(
		() => ({
			user: {
				email: authStatus.email,
				username: authStatus.username,
				fullName: authStatus.fullName,
				imageUri: authStatus.imageUri,
				phone: user?.phone || null,
				isAuthenticated: authStatus.isAuthenticated,
				isLoggedIn: authStatus.isLoggedIn,
			},
			login,
			logout,
			syncUserData, // **Expose syncUserData here**
			loading,
		}),
		[authStatus, loading] // Only depend on user, authStatus, and loading
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
