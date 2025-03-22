"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as NavigationBar from "expo-navigation-bar";

// Create the theme context
const ThemeContext = createContext();

// Theme modes
export const ThemeMode = {
	LIGHT: "light",
	DARK: "dark",
	SYSTEM: "system",
};

// Theme provider component
export function ThemeProvider({ children }) {
	const deviceTheme = useColorScheme();
	const [themeMode, setThemeMode] = useState(ThemeMode.SYSTEM);
	const [isDarkMode, setIsDarkMode] = useState(deviceTheme === "dark");

	// Load saved theme preference on mount
	useEffect(() => {
		const loadThemePreference = async () => {
			try {
				const savedThemeMode = await AsyncStorage.getItem("themeMode");

				if (savedThemeMode !== null) {
					setThemeMode(savedThemeMode);

					if (savedThemeMode === ThemeMode.SYSTEM) {
						setIsDarkMode(deviceTheme === "dark");
					} else {
						setIsDarkMode(savedThemeMode === ThemeMode.DARK);
					}
				} else {
					// Default to system theme
					setThemeMode(ThemeMode.SYSTEM);
					setIsDarkMode(deviceTheme === "dark");
				}
			} catch (error) {
				console.error("Failed to load theme preference:", error);
			}
		};

		loadThemePreference();
	}, [deviceTheme]);

	// Update theme when device theme changes (if using system theme)
	useEffect(() => {
		if (themeMode === ThemeMode.SYSTEM) {
			setIsDarkMode(deviceTheme === "dark");
		}
	}, [deviceTheme, themeMode]);

	// Save theme preference when it changes
	useEffect(() => {
		AsyncStorage.setItem("themeMode", themeMode).catch((error) => {
			console.error("Failed to save theme preference:", error);
		});
	}, [themeMode]);

	// Update navigation bar on Android only
	useEffect(() => {
		const updateNavigationBar = async () => {
			// Only run on Android platform
			if (Platform.OS === "android") {
				try {
					await NavigationBar.setBackgroundColorAsync(
						isDarkMode ? "#121826" : "white"
					);
					await NavigationBar.setButtonStyleAsync(
						isDarkMode ? "light" : "dark"
					);
				} catch (error) {
					console.error("Failed to update navigation bar:", error);
				}
			}
		};

		updateNavigationBar();
	}, [isDarkMode]);

	// Toggle theme function
	const toggleTheme = () => {
		const newThemeMode = isDarkMode ? ThemeMode.LIGHT : ThemeMode.DARK;
		setThemeMode(newThemeMode);
		setIsDarkMode(!isDarkMode);
	};

	// Set specific theme
	const setTheme = (mode) => {
		setThemeMode(mode);

		if (mode === ThemeMode.SYSTEM) {
			setIsDarkMode(deviceTheme === "dark");
		} else {
			setIsDarkMode(mode === ThemeMode.DARK);
		}
	};

	return (
		<ThemeContext.Provider
			value={{
				isDarkMode,
				themeMode,
				toggleTheme,
				setTheme,
			}}
		>
			{children}
		</ThemeContext.Provider>
	);
}

// Custom hook to use the theme context
export function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
