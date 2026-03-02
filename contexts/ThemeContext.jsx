import { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme, Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { database, StorageKeys } from "../database";

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
				const savedThemeMode = await database.read(StorageKeys.THEME, null);

				if (savedThemeMode !== null) {
					setThemeMode(savedThemeMode);
				} else {
					// Default to system theme
					setThemeMode(ThemeMode.SYSTEM);
				}
			} catch (error) {
				console.error("Failed to load theme preference:", error);
			}
		};

		loadThemePreference();
	}, [deviceTheme]);

	// Resolve the active theme from theme mode + device theme.
	useEffect(() => {
		if (themeMode === ThemeMode.SYSTEM) {
			setIsDarkMode(deviceTheme === "dark");
			return;
		}

		setIsDarkMode(themeMode === ThemeMode.DARK);
	}, [deviceTheme, themeMode]);

	// Save theme preference when it changes
	useEffect(() => {
		database.write(StorageKeys.THEME, themeMode).catch((error) => {
			console.error("Failed to save theme preference:", error);
		});
	}, [themeMode]);

	// Update navigation bar on Android only
	useEffect(() => {
		const updateNavigationBar = async () => {
			// Only run on Android platform
			if (Platform.OS === "android") {
				try {
					// await NavigationBar.setBackgroundColorAsync(
					// 	isDarkMode ? "#0B0F1A" : "white"
					// );
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
	};

	// Set specific theme
	const setTheme = (mode) => {
		setThemeMode(mode);
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
