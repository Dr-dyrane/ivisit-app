//app/_layout.js

import React, { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { AuthProvider, useAuth } from "../contexts/AuthContext"; // Ensure both are imported
import * as NavigationBar from "expo-navigation-bar";
import ToastProvider from "../contexts/ToastContext";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
	// Move AuthProvider outside the return statement to ensure useAuth can be used
	useEffect(() => {
		const setNavBar = async () => {
			await NavigationBar.setBackgroundColorAsync("white"); // Set the navigation bar background color to white
			await NavigationBar.setButtonStyleAsync("dark"); // Set button styles to dark
		};

		setNavBar();

		// Cleanup function to reset the styles when unmounted
		return () => {
			NavigationBar.setBackgroundColorAsync("transparent");
			NavigationBar.setButtonStyleAsync("light");
		};
	}, []);

	return (
		<AuthProvider>
			<ToastProvider>
				<StatusBar style="dark" backgroundColor="white" />
				<AuthenticatedStack />
			</ToastProvider>
		</AuthProvider>
	);
}

// Separate the Stack logic into its own component so it can use the Auth context
function AuthenticatedStack() {
	const { user } = useAuth(); // Destructure user from the AuthContext
	const [isAuthenticated, setIsAuthenticated] = useState(user.isAuthenticated); // Initialize local state
	const router = useRouter(); // Get the router instance

	// Use effect to listen for changes in the user object
	useEffect(() => {
		setIsAuthenticated(user.isAuthenticated); // Update local state when user changes

		// Check authentication state and navigate accordingly
		if (user.isAuthenticated) {
			router.replace("(user)"); // Replace current route with the user route
		} else {
			router.replace("(auth)"); // Replace current route with the auth route
		}
	}, [user]); // Dependency array includes user

	return (
		<Stack>
			{/* Define the screen without showing the header */}
			<Stack.Screen
				name={isAuthenticated ? "(user)" : "(auth)"} // Show user for authenticated users, auth for others
				options={{ headerShown: false }} // Hide the header
			/>
		</Stack>
	);
}
