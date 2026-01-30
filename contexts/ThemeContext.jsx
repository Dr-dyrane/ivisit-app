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
	
	// Force dark mode on Android
	const isAndroid = Platform.OS === "android";
	const [isDarkMode, setIsDarkMode] = useState(isAndroid ? true : deviceTheme === "dark");

	// Load saved theme preference on mount
	useEffect(() => {
		const loadThemePreference = async () => {
			try {
				const savedThemeMode = await database.read(StorageKeys.THEME, null);

				if (savedThemeMode !== null) {
					setThemeMode(savedThemeMode);

					if (savedThemeMode === ThemeMode.SYSTEM) {
						setIsDarkMode(isAndroid ? true : deviceTheme === "dark");
					} else {
						setIsDarkMode(isAndroid ? true : savedThemeMode === ThemeMode.DARK);
					}
				} else {
					// Default to system theme
					setThemeMode(ThemeMode.SYSTEM);
					setIsDarkMode(isAndroid ? true : deviceTheme === "dark");
				}
			} catch (error) {
				console.error("Failed to load theme preference:", error);
			}
		};

		loadThemePreference();
	}, [deviceTheme]);

	// Update theme when device theme changes (if using system theme)
	useEffect(() => {
		if (themeMode === ThemeMode.SYSTEM && !isAndroid) {
			setIsDarkMode(deviceTheme === "dark");
		}
	}, [deviceTheme, themeMode, isAndroid]);

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

	// Toggle theme function (disabled on Android)
	const toggleTheme = () => {
		if (isAndroid) return; // Disable theme toggle on Android
		
		const newThemeMode = isDarkMode ? ThemeMode.LIGHT : ThemeMode.DARK;
		setThemeMode(newThemeMode);
		setIsDarkMode(!isDarkMode);
	};

	// Set specific theme (restricted on Android)
	const setTheme = (mode) => {
		if (isAndroid) {
			// Force dark mode on Android
			setThemeMode(ThemeMode.DARK);
			setIsDarkMode(true);
			return;
		}
		
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
